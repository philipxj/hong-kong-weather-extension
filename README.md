# HK Weather Alerts Extension

Browser extension for compact Hong Kong weather alerts.

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
