# Radar Playback Slider Design

## Goal

Add a compact, draggable playback timeline to the radar imagery panel introduced by PR #44. The control must make the automatic sequence understandable and directly controllable without increasing the popup card height or affecting lightning and tropical-cyclone behavior.

## Scope

- Add a play/pause button, discrete range slider, and current-frame counter for radar snapshots.
- Keep the existing 800 ms radar autoplay interval and 3-second pause after manual interaction.
- Support the compact and expanded imagery views.
- Preserve the existing radar range selector, timestamp caption, manual preview stepping, keyboard navigation, and image expansion behavior.
- Keep lightning manual-only and do not show the playback controls in the lightning or tropical-cyclone panels.
- Do not change HKO fetching, imagery normalization, snapshot caching, or other popup sections.

## Layout

Use the approved “B” layout: a video-player-style overlay at the bottom of the radar image.

- Place the playback row inside `.imagery-preview`, above the existing timestamp caption and radar range controls.
- Keep the row inset from both image edges and use the existing dark translucent, blurred overlay treatment.
- Put a circular play/pause button on the left, the slider in the flexible middle space, and the current position such as `3 / 5` on the right.
- Keep the slider long enough for reliable pointer input in the 270 px compact card.
- In expanded view, retain the same control order and center or constrain the row so it does not become unnecessarily wide.
- Do not increase the imagery card height or cover the timestamp and range controls.

The playback row is visible only when radar is active and at least two valid snapshots are available. It is hidden while imagery is loading, when the sequence cannot be parsed, and when lightning or a tropical-cyclone panel is selected.

## Playback State and Behavior

The radar autoplay controller owns one playback state and one timer. The play/pause button, slider, existing manual preview interactions, tab changes, range changes, and reduced-motion changes must all update that same controller.

### Automatic playback

- Start from frame 1 when a playable radar sequence first becomes ready.
- Advance one frame every 800 ms.
- After the final frame, return directly to frame 1 and continue.
- Keep the image, timestamp, selected snapshot index, slider value, and textual position synchronized on every step.

### Slider interaction

- Use a semantic `input type="range"` with `min="1"`, `max` equal to the current snapshot count, and `step="1"`.
- Pointer dragging and clicking snap to valid integer frames only.
- While the user is manipulating the slider, stop the autoplay timer.
- Display the selected frame immediately as the slider value changes.
- After pointer or keyboard slider interaction finishes, keep the chosen frame visible for 3 seconds and then resume from that frame when playback was not explicitly paused.
- Repeated manual interactions replace the pending 3-second resume timer rather than stacking timers.

### Explicit play and pause

- Pressing pause stops playback indefinitely.
- Slider movement while explicitly paused changes the selected frame but does not schedule automatic resume.
- Pressing play resumes from the current selected frame and schedules the next step after the normal 800 ms interval.
- The button icon, accessible name, pressed state, and visible playback state always agree.

### Existing manual controls

- Left/right preview clicks and arrow-key stepping continue to work.
- These interactions pause automatic playback for 3 seconds, matching slider interaction, unless playback is explicitly paused.
- Synthetic autoplay steps must not trigger the manual-pause path or visual step-feedback pulse.

### Context changes

- Changing radar range rebuilds the sequence, selects frame 1, synchronizes the slider, and starts playback unless explicitly paused or reduced motion prevents automatic start.
- Returning to radar from another tab selects frame 1 and starts playback under the same conditions.
- Switching away from radar cancels all playback and delayed-resume timers and hides the controls.
- If the snapshot count or selected index becomes invalid, stop the timer, hide or disable the controls while state is rebuilt, and never expose an out-of-range slider value.

## Reduced Motion

When `prefers-reduced-motion: reduce` matches:

- Do not autoplay when radar loads, the range changes, or the user returns to the radar tab.
- Show the controls in a paused state when a playable sequence exists.
- Permit playback only after the user explicitly presses play.
- Manual slider and frame navigation remain available.

This preserves the preference while allowing an intentional opt-in to motion.

## Accessibility

- Give the play/pause control localized accessible names for its next action: “播放雷達動畫” and “暫停雷達動畫”, with equivalent English labels.
- Expose the slider with a localized label and value text that includes the current frame and total, for example “雷達圖片 3，共 5 張”.
- Preserve keyboard support: Space/Enter activates play/pause; Arrow keys, Home, and End operate the native range input.
- Keep focus indicators visible against the radar image.
- Make the play/pause hit target at least 28 px and the slider row tall enough for reliable pointer use in the compact popup.
- Do not rely on color alone to communicate playing versus paused state.

## Implementation Boundaries

- Extend `src/popup/radar-autoplay.ts` so it remains the single owner of radar playback timers and interaction state.
- Add or extend pure helpers in `src/popup/imagery-autoplay.ts` for state calculations that can be tested without the DOM.
- Add the semantic playback controls to `src/popup/index.html`.
- Keep all layout and appearance rules in `src/shared/ui.css`.
- Reuse the existing snapshot-selection path in `src/popup/main.ts`; do not introduce a second independent image-selection state.
- Avoid new browser-extension APIs and retain Chromium, Edge, and future Firefox portability.

## Error Handling

- If a frame cannot be selected or the position counter is unavailable, cancel the active timer and retry only through the existing readiness path.
- Do not leave a play icon indicating active playback when no timer can run.
- Do not schedule duplicate autoplay or delayed-resume timers.
- Image load failures continue to use the existing imagery fallback; playback controls remain hidden until the sequence is usable.

## Testing

Follow TDD for the behavior and layout change.

### Unit tests

- Discrete slider values select the matching snapshot.
- Autoplay advances one frame and wraps from the final frame to frame 1.
- Manual slider, preview, and keyboard interaction schedule one 3-second resume.
- Explicit pause prevents delayed automatic resume.
- Explicit play resumes from the selected frame.
- Tab and range changes cancel stale timers and reset to frame 1.
- Reduced motion starts paused but permits explicit playback.
- Invalid or single-frame sequences do not expose playable controls.

### Playwright tests

- Slider clicking, dragging, and keyboard input update the image, timestamp, position text, and slider value together.
- Play/pause state and the 3-second manual-interaction delay behave as specified.
- The playback row remains within `.imagery-preview` and does not overlap the timestamp, radar ranges, expand button, tabs, or snapshot position in compact and expanded views.
- Cover no warnings, two warnings, four warnings, long warning text, English tab labels, and tropical-cyclone-tab presence at 790 x 438.
- Lightning and tropical-cyclone panels do not show or run the radar playback controls.

## Completion Criteria

- The approved bottom-overlay layout matches the existing compact HKO-style UI.
- Every playback input uses one synchronized state and timer owner.
- All new unit and browser tests pass.
- The full `npm test` command passes under a supported Node version with the matching Playwright Chromium installed.
- A local Chromium build is loaded for visual verification before the PR is updated.
