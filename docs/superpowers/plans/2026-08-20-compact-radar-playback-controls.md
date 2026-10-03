# Compact Radar Playback Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the always-visible radar playback control to the approved 162-by-20-pixel A1 design without changing playback behaviour.

**Architecture:** Keep the existing HTML and TypeScript controller unchanged. Tighten only the radar playback CSS, and strengthen the existing Playwright bounding-box test so compact and expanded layouts enforce the same dimensions and remain clear of the timestamp and range controls.

**Tech Stack:** TypeScript, CSS, Playwright, Vitest, Vite, Node.js 22.

## Global Constraints

- The control is exactly 162 pixels wide and 20 pixels high in compact and expanded layouts.
- The play/pause button is 18 by 18 pixels.
- The range track is 3 pixels high and the range thumb is 11 pixels across.
- The counter uses compact `3/5` formatting.
- Dragging, keyboard control, three-second resume, explicit pause, reduced motion, radar-only visibility, 800-millisecond stepping, and wrap behaviour remain unchanged.
- The control stays inside the radar preview and does not overlap the timestamp or radar range controls at 790 by 438.
- Use Node.js 22 from `/opt/homebrew/opt/node@22/bin`.

---

### Task 1: Enforce the compact A1 radar control

**Files:**
- Modify: `tests/popup-layout.spec.ts:952`
- Modify: `src/shared/ui.css:1058`

**Interfaces:**
- Consumes: existing `.radar-playback`, `.radar-play-toggle`, `.radar-playback-slider`, `.radar-playback-position`, and `.imagery-card.is-expanded` selectors.
- Produces: the same DOM/controller interface with CSS-only compact dimensions.

- [ ] **Step 1: Write the failing layout assertions**

In the existing `keeps draggable radar playback controls inside compact and expanded previews` test, add exact compact geometry checks and replace the expanded-width growth assertion:

```ts
expect(Math.round(compact.playback.width)).toBe(162);
expect(Math.round(compact.playback.height)).toBe(20);
expect(Math.round(compact.playToggle.width)).toBe(18);
expect(Math.round(compact.playToggle.height)).toBe(18);
expect(compact.slider.width).toBeGreaterThanOrEqual(90);

expect(Math.round(expanded.playback.width)).toBe(162);
expect(Math.round(expanded.playback.height)).toBe(20);
expect(Math.round(expanded.playToggle.width)).toBe(18);
expect(Math.round(expanded.playToggle.height)).toBe(18);
expect(Math.round(expanded.slider.width)).toBe(Math.round(compact.slider.width));
await expect(page.locator(".radar-playback-position")).toHaveText("5/5");
```

Add `playToggle: rect(".radar-play-toggle")` to the test's measurement result.

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npx playwright test tests/popup-layout.spec.ts --grep "draggable radar playback"
```

Expected: FAIL because the current control measures about 208 by 30 pixels and grows in expanded mode.

- [ ] **Step 3: Implement the compact CSS**

Update the playback styles to the approved fixed geometry:

```css
.radar-playback {
  right: 23px;
  bottom: 43px;
  left: auto;
  width: 162px;
  height: 20px;
  grid-template-columns: 18px minmax(0, 1fr) 24px;
  gap: 4px;
  padding: 0 5px 0 1px;
  background: rgba(9, 23, 37, 0.46);
  border-color: rgba(255, 255, 255, 0.34);
  box-shadow: 0 2px 7px rgba(12, 25, 40, 0.16);
}

.radar-play-toggle {
  width: 18px;
  height: 18px;
}

.radar-playback-slider {
  height: 14px;
  appearance: none;
  background: transparent;
}

.radar-playback-slider::-webkit-slider-runnable-track {
  height: 3px;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 999px;
}

.radar-playback-slider::-webkit-slider-thumb {
  appearance: none;
  width: 11px;
  height: 11px;
  margin-top: -4px;
  background: var(--accent);
  border: 1px solid #fff;
  border-radius: 50%;
}

.radar-playback-slider::-moz-range-track {
  height: 3px;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 999px;
}

.radar-playback-slider::-moz-range-thumb {
  width: 11px;
  height: 11px;
  background: var(--accent);
  border: 1px solid #fff;
  border-radius: 50%;
}

.radar-playback-position {
  min-width: 24px;
  font-size: 9px;
}

.imagery-card.is-expanded .radar-playback {
  right: 25px;
  bottom: 45px;
  left: auto;
  width: 162px;
  height: 20px;
  grid-template-columns: 18px minmax(0, 1fr) 24px;
  gap: 4px;
  padding-right: 5px;
}

.imagery-card.is-expanded .radar-play-toggle {
  width: 18px;
  height: 18px;
}

.imagery-card.is-expanded .radar-playback-position {
  font-size: 9px;
}
```

Define both WebKit and Mozilla range pseudo-elements so Chromium/Edge and future Firefox builds keep the same compact geometry.

- [ ] **Step 4: Make the rendered counter compact**

In `src/popup/radar-autoplay.ts`, render the visible output without spaces while keeping `aria-valuetext` readable:

```ts
playbackPosition.textContent = `${position.index}/${position.count}`;
```

Update the layout fixture output from `5 / 5` to `5/5`. Do not change the hidden canonical `#imagery-position` parser format.

- [ ] **Step 5: Run the targeted tests and verify GREEN**

Run:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npx playwright test tests/popup-layout.spec.ts --grep "draggable radar playback|expands radar widget"
npx vitest run tests/popup-imagery-autoplay.test.ts
```

Expected: the two layout tests and eight imagery autoplay unit tests pass.

- [ ] **Step 6: Run full verification**

Run:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm test
git diff --check
```

Expected: typecheck, lint, 146 unit tests, 28 layout tests, and Chromium build pass; `git diff --check` prints nothing.

- [ ] **Step 7: Commit the implementation**

```bash
git add src/shared/ui.css src/popup/radar-autoplay.ts tests/popup-layout.spec.ts
git commit -m "fix: compact radar playback controls"
```

- [ ] **Step 8: Build and visually smoke-test the real extension**

Launch the built `dist/chromium` extension in an isolated Chromium profile, capture a 790-by-438 popup screenshot, and verify the visible control is 162 by 20 pixels, remains draggable, pauses explicitly, and resumes three seconds after manual movement.

- [ ] **Step 9: Push and read back PR #44**

Re-fetch `feat/radar-autoplay-loop`, verify its head is still an ancestor of the local branch, push `HEAD:feat/radar-autoplay-loop`, then read PR #44 through the GitHub API and confirm its head SHA equals the new commit.
