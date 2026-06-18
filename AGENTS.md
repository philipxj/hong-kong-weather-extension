# AGENTS.md

## Project

This is a browser extension for Hong Kong weather alerts. It currently runs as a Chromium MV3 extension and should remain easy to port to other browsers, especially Edge and Firefox.

The popup UI intentionally follows a compact Hong Kong Observatory-style layout.

Primary files:

- `src/popup/index.html`, `src/popup/main.ts`: popup UI and rendering logic
- `src/shared/ui.css`: shared styles and popup layout
- `src/shared/weather-service.ts`: HKO API fetching, normalization, badge/warning logic
- `src/shared/browser-api.ts`: small compatibility wrapper around extension APIs
- `manifests/chromium.json`: Chromium/Edge MV3 manifest source
- `tests/`: unit and browser layout tests

## Browser Compatibility

- Do not assume this project is Chrome-only.
- Prefer WebExtension-compatible patterns where practical.
- Use `chrome.*` only where the existing MV3 extension needs it.
- If adding browser APIs, keep them isolated behind small helper functions when compatibility may differ.
- Do not introduce Chrome-only behavior unless there is a clear reason.
- Treat Edge support as near-term and Firefox support as future work.
- Safari support is not required unless explicitly requested.

## Engineering Rules

- Use TDD for behavior or UI changes.
- Keep code simple, readable, and narrowly scoped.
- Prefer existing project patterns over new abstractions.
- Do not leave dead DOM, unused render functions, or stale selectors.
- Avoid unrelated refactors unless needed for the task.
- Never hide layout bugs with arbitrary overflow clipping unless the design explicitly requires it.

## UI Rules

- The popup must stay visually solid at `790x438`.
- Forecast row must not overlap:
  - current weather readings
  - warning signal row
  - radar/satellite/lightning panel
  - typhoon path button
- Text must fit inside its container.
- Warning signal icons must remain inside `.warning-signal-row`.
- Radar/satellite/lightning panel must remain above the forecast row.
- When changing popup layout, update or add Playwright layout tests.

## Testing

Run before finishing:

```bash
npm test
```

This runs:

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run test:layout`
- `npm run build`

If dependencies are missing:

```bash
npm install
npx playwright install chromium
npm test
```

## TDD Expectations

For data/logic changes:

- Add or update `tests/*.test.mjs`.

For popup UI/layout changes:

- Add or update `tests/*.spec.mjs`.
- Use browser-level bounding-box assertions for overlap-sensitive UI.
- Cover at least:
  - no active warnings
  - two active warnings
  - four active warnings
  - long warning text

## Clean Code Expectations

- Keep popup rendering focused on the visible UI.
- Remove obsolete selectors and hidden legacy panels when replacing UI.
- Keep HKO data normalization in `src/shared/weather-service.ts`.
- Keep DOM rendering and formatting helpers in `src/popup/main.ts`.
- Keep layout rules in `src/shared/ui.css`.

## Current Test Coverage

The repo already includes:

- warning badge normalization tests
- popup layout overlap regression tests

Do not remove these tests unless replacing them with stronger coverage.
