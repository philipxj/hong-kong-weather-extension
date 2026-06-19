# AMO Source Build Instructions

These instructions are for Mozilla Add-ons reviewers to reproduce the submitted Firefox extension package.

## Build Environment

- Operating system used for the submitted package: macOS 15
- Node.js required by the project: 20.19.0 or newer
- Node.js version used for the submitted package: 24.10.0
- npm version used for the submitted package: 11.6.1

The required Node.js version is also declared in:

- `.nvmrc`
- `package.json` `engines.node`

## Third-Party Tools

All build tools are open-source npm packages installed from `package-lock.json`.

Important build tools:

- TypeScript
- Vite
- ESLint
- Prettier
- Vitest
- Playwright

No generated, transpiled, concatenated, or minified application source is included as source. The submitted extension package is generated from the TypeScript, HTML, CSS, and asset files in this repository.

## Install Dependencies

From the repository root:

```bash
npm ci
```

## Reproduce The Firefox Extension

From the repository root:

```bash
npm run build:firefox
```

This creates the Firefox extension files in:

```text
dist/firefox
```

To reproduce the submitted package, zip the contents of `dist/firefox`, not the `dist/firefox` folder itself:

```bash
cd dist/firefox
zip -r ../../hk-weather-alerts-firefox.zip .
```

## Validation

The full project check is:

```bash
npm test
```

This runs:

- TypeScript type checking
- ESLint
- Vitest unit tests
- Playwright popup layout tests
- Chromium production build

For Firefox package generation specifically, the required command is:

```bash
npm run build:firefox
```

## Expected Output

The generated Firefox manifest is written to:

```text
dist/firefox/manifest.json
```

It uses the source manifest:

```text
manifests/firefox.json
```
