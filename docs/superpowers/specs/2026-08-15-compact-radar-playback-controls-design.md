# Compact Radar Playback Controls Design

## Context

PR #44 adds an always-visible draggable radar playback control. The interaction works, but the current 208-by-30-pixel translucent capsule covers too much of the compact radar image. This change reduces visual obstruction without changing playback behavior.

## Approved Direction

Use a short, always-visible translucent control bar inside the bottom portion of the radar preview.

- Width: 162 pixels in both compact and expanded layouts.
- Height: 20 pixels in both layouts.
- Play/pause button: 18-by-18 pixels.
- Slider track: 3 pixels high.
- Slider thumb: 11 pixels across and remains easy to drag with a pointer.
- Counter format: compact `3/5`, without spaces, in a narrow fixed-width area.
- Reduce horizontal padding, gaps, background opacity, border weight, and shadow strength.
- Keep sufficient contrast over colourful radar imagery with a restrained translucent background.
- Keep the control above the timestamp and range controls, inside the radar preview bounds.
- Do not enlarge the control when the radar preview is expanded.

## Behaviour

All existing PR #44 behaviour remains unchanged:

- The range input supports dragging, clicking, and keyboard control.
- Manual frame selection pauses autoplay and resumes after three seconds.
- Explicit pause remains paused until the user presses play.
- Reduced-motion preference starts paused but permits an explicit play override.
- The control is shown only for playable radar sequences and remains hidden for lightning and tropical cyclone panels.
- Autoplay advances every 800 milliseconds and wraps from the last frame to the first.

## Accessibility

- Preserve the native range input and its localized accessible label.
- Preserve visible focus outlines for the play/pause button and slider.
- Preserve localized play and pause labels.
- Do not rely on colour alone to distinguish play and pause states.

## Validation

- Update Playwright bounding-box assertions for the new 162-pixel width and 20-pixel height.
- Assert the compact control does not overlap the timestamp or radar range controls at 790 by 438.
- Assert the expanded control keeps the same compact dimensions and remains inside the preview.
- Retain unit tests for slider stepping, explicit pause, reduced motion, and the three-second resume delay.
- Run the full `npm test` suite before pushing the PR update.
