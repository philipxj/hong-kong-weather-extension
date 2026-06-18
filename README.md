# HK Weather Alerts Extension

Browser extension for compact Hong Kong weather alerts.

## Documentation

- [API and external resources](docs/api.md): HKO Open Data API usage, imagery URLs, related official documentation, and host permissions.
- DATA.GOV.HK weather dataset search: https://data.gov.hk/tc-datasets/search/%E5%A4%A9%E6%B0%A3

## Development

Install dependencies:

```bash
npm install
```

Build the unpacked extension:

```bash
npm run build
```

Load this folder in Chrome or Edge:

```text
dist/chromium
```

Do not load the repository root. The root folder contains TypeScript source files and does not contain the runtime `manifest.json`.

## Testing

Run the full gate:

```bash
npm test
```

This runs TypeScript checking, linting, unit tests, popup layout tests, and a production build.
