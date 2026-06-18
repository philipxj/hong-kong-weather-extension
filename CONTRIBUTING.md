# Contributing

Thanks for helping improve HK Weather Alerts Extension.

## Development

Install dependencies:

```bash
npm install
```

Run the full project gate before submitting changes:

```bash
npm test
```

This runs type checking, linting, unit tests, popup layout tests, and the production build.

## Browser Compatibility

Keep the extension portable where practical:

- Treat Chromium MV3 as the current target.
- Keep Edge support near-term.
- Avoid Chrome-only behavior unless there is a clear reason.
- Keep browser API differences behind small compatibility helpers.

## UI Changes

The popup must remain visually solid at `790x438`. If you change popup layout, update or add Playwright layout tests that assert overlap-sensitive bounding boxes.

Cover at least:

- no active warnings
- two active warnings
- four active warnings
- long warning text

## Data and Branding

Keep Hong Kong Observatory data normalization in `src/shared/weather-service.ts` and visible DOM rendering in `src/popup/main.ts`.

Do not add the Hong Kong Observatory logo, government logos, DATA.GOV.HK marks, or other protected marks to the repository unless explicit permission has been obtained and documented. Attribute Hong Kong Observatory Open Data and DATA.GOV.HK when adding public-facing source or about text.
