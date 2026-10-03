# Radar Playback Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved bottom-overlay, draggable radar playback slider to PR #44 and update the PR after complete local verification.

**Architecture:** Keep `radar-autoplay.ts` as the sole timer and playback-state owner. Add small pure state/slider helpers to `imagery-autoplay.ts`, semantic controls to the popup markup, localized accessible state in the autoplay controller, and layout rules in `ui.css`; reuse the existing arrow-key snapshot-selection path so the image, time, internal index, and counters cannot diverge.

**Tech Stack:** TypeScript, Chromium MV3, native range input, Vitest, Playwright, Vite.

## Global Constraints

- Keep the radar interval at 800 ms and manual-interaction delay at 3 seconds.
- Explicit pause persists until the user presses play.
- `prefers-reduced-motion` starts paused but permits explicit playback.
- Show controls only for radar sequences with at least two frames.
- Keep lightning manual-only and leave tropical-cyclone behavior unchanged.
- Preserve the compact popup at 790 x 438 and do not add card height.
- Use WebExtension-compatible DOM behavior; add no new extension API.

---

### Task 1: Pure playback and slider state

**Files:**
- Modify: `src/popup/imagery-autoplay.ts`
- Modify: `tests/popup-imagery-autoplay.test.ts`

**Interfaces:**
- Produces: `imagerySliderStep(current: ImageryPosition, targetIndex: number): ImageryAutoplayStep | null`
- Produces: `ImageryPlaybackState`, `initialImageryPlaybackState(reducedMotion: boolean)`, `reduceImageryPlaybackState(state, action)`, and `canRunImageryPlayback(state)`.

- [ ] **Step 1: Write failing tests for slider deltas and playback intent**

```ts
expect(imagerySliderStep({ index: 2, count: 5 }, 5)).toEqual({ direction: 1, steps: 3 });
expect(imagerySliderStep({ index: 4, count: 5 }, 1)).toEqual({ direction: -1, steps: 3 });
expect(imagerySliderStep({ index: 2, count: 5 }, 6)).toBeNull();

const reduced = initialImageryPlaybackState(true);
expect(canRunImageryPlayback(reduced)).toBe(false);
const optedIn = reduceImageryPlaybackState(reduced, { type: "play" });
expect(canRunImageryPlayback(optedIn)).toBe(true);
expect(canRunImageryPlayback(reduceImageryPlaybackState(optedIn, { type: "pause" }))).toBe(false);
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/popup-imagery-autoplay.test.ts`
Expected: FAIL because the new exports do not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

```ts
export type ImageryPlaybackAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "motion-change"; reducedMotion: boolean };

export interface ImageryPlaybackState {
  explicitlyPaused: boolean;
  reducedMotion: boolean;
  reducedMotionOverride: boolean;
}
```

`imagerySliderStep` must reject non-integer/out-of-range targets and return `null` for the current frame. The reducer must clear the reduced-motion override on pause or preference changes and set it only after explicit play while reduced motion is active.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:unit -- tests/popup-imagery-autoplay.test.ts`
Expected: all popup imagery autoplay tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/popup/imagery-autoplay.ts tests/popup-imagery-autoplay.test.ts
git commit -m "test: define radar playback slider state"
```

### Task 2: Semantic controls and synchronized controller

**Files:**
- Modify: `src/popup/index.html`
- Modify: `src/popup/radar-autoplay.ts`
- Modify: `tests/popup-imagery-autoplay.test.ts`

**Interfaces:**
- Consumes: Task 1 playback reducer and slider-step helper.
- Produces DOM IDs: `radar-playback`, `radar-play-toggle`, `radar-playback-slider`, `radar-playback-position`.

- [ ] **Step 1: Add a failing markup contract test**

Read `src/popup/index.html` in the unit test and assert that it contains a `button` toggle, `input type="range" min="1" step="1"`, output counter, and hidden playback container.

- [ ] **Step 2: Verify RED**

Run: `npm run test:unit -- tests/popup-imagery-autoplay.test.ts`
Expected: FAIL because the controls are absent.

- [ ] **Step 3: Add the semantic markup inside `.imagery-preview`**

```html
<div id="radar-playback" class="radar-playback" hidden>
  <button id="radar-play-toggle" class="radar-play-toggle" type="button" aria-pressed="false">
    <span class="radar-play-icon" aria-hidden="true"></span>
  </button>
  <input id="radar-playback-slider" class="radar-playback-slider" type="range" min="1" max="1" step="1" value="1" />
  <output id="radar-playback-position" class="radar-playback-position">-- / --</output>
</div>
```

- [ ] **Step 4: Extend the controller with one state and timer path**

Select the four controls, maintain `playbackState`, and centralize these operations:

```ts
const syncControls = (): ImageryPosition | null => {
  const position = currentPosition();
  const playable = Boolean(position && isRadarActive());
  radarPlayback.hidden = !playable;
  if (!position) return null;
  radarPlaybackSlider.max = String(position.count);
  radarPlaybackSlider.value = String(position.index);
  radarPlaybackPosition.value = `${position.index} / ${position.count}`;
  return position;
};

const selectSliderFrame = (targetIndex: number): boolean => {
  const position = currentPosition();
  if (!position) return false;
  const step = imagerySliderStep(position, targetIndex);
  if (!step) return targetIndex === position.index;
  dispatchStep(step.direction, step.steps);
  return true;
};

const scheduleManualResume = (): void => {
  stopAutoplay();
  clearManualResume();
  if (!canRunImageryPlayback(playbackState)) return;
  manualResumeTimer = window.setTimeout(startAutoplay, MANUAL_INTERACTION_PAUSE_MS);
};

const resetRadarSequence = (): void => {
  stopAutoplay();
  clearManualResume();
  rewindToFirstFrameAndPreload();
  syncControls();
  if (canRunImageryPlayback(playbackState)) scheduleAutoplay();
};
```

Stop propagation from the playback row so slider/button input never triggers preview click, double-click, or arrow navigation. Use a mutation observer on the existing position text and preview state so autoplay, main rendering, slider, and output remain synchronized. The play button changes the reducer state; range clicks and radar-tab returns reset to frame 1; leaving radar cancels both timers.

- [ ] **Step 5: Localize accessible labels inside the controller**

Map `zh-Hant`, `zh-Hans`, and `en` to play, pause, and slider value text. Update button `aria-label`, `aria-pressed`, slider `aria-label`, and `aria-valuetext` whenever state or language changes.

- [ ] **Step 6: Verify unit, type, and lint checks**

Run: `npm run test:unit -- tests/popup-imagery-autoplay.test.ts && npm run typecheck && npm run lint`
Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/popup/index.html src/popup/radar-autoplay.ts tests/popup-imagery-autoplay.test.ts
git commit -m "feat: add draggable radar playback controls"
```

### Task 3: Bottom-overlay layout and browser regressions

**Files:**
- Modify: `src/shared/ui.css`
- Modify: `tests/popup-layout.spec.ts`

**Interfaces:**
- Consumes: Task 2 playback DOM classes.
- Produces: approved “B” bottom overlay in compact and expanded radar previews.

- [ ] **Step 1: Add the playback markup to the layout fixture and write failing bounds assertions**

Assert that the visible row is contained by `.imagery-preview`, sits above `.imagery-caption` and `.radar-ranges`, does not overlap `.imagery-expand`, and that the slider has at least 120 px width in compact mode. Assert the row is hidden on lightning and typhoon panels.

- [ ] **Step 2: Verify RED**

Run: `npm run test:layout -- --grep "radar playback"`
Expected: FAIL because no playback layout styles exist.

- [ ] **Step 3: Implement the approved CSS**

Add a dark translucent pill positioned above the bottom metadata controls, a minimum 28 px circular toggle, a flexible native range input with visible focus, compact numeric output, play/pause icon states, and expanded-mode width constraints. Hide the old top-right radar stepper while retaining it for lightning.

- [ ] **Step 4: Verify targeted layout behavior**

Run: `npm run test:layout -- --grep "radar playback"`
Expected: new compact, expanded, English, warning-count, lightning, and typhoon cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui.css tests/popup-layout.spec.ts
git commit -m "style: place radar timeline above imagery metadata"
```

### Task 4: Full verification, visual check, and PR update

**Files:**
- Verify all modified files and generated Chromium output.

- [ ] **Step 1: Run the complete gate under supported Node**

Run: `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test`
Expected: typecheck, lint, all unit tests, all layout tests, and Chromium production build pass.

- [ ] **Step 2: Load `dist/chromium` in an isolated visible Chromium profile**

Verify autoplay, dragging, 3-second resume, persistent explicit pause, range reset, tab reset, expanded mode, and reduced-motion opt-in against the actual extension popup.

- [ ] **Step 3: Confirm repository scope**

Run: `git status --short`, `git diff origin/main...HEAD --stat`, and `git log --oneline origin/feat/radar-autoplay-loop..HEAD`.
Expected: only approved design/plan and radar playback implementation changes are present; `.superpowers/` remains untracked and excluded.

- [ ] **Step 4: Push the verified branch to PR #44 without rewriting history**

Run: `git push origin HEAD:feat/radar-autoplay-loop`
Expected: remote PR head advances by fast-forward.

- [ ] **Step 5: Read back PR metadata and checks**

Confirm PR #44 remains open, the head SHA matches the pushed commit, mergeability is recalculated, and report any absent CI separately from local `npm test` evidence.
