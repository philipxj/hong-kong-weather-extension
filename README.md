# 香港天氣預報 / Hong Kong Weather

Unofficial browser extension for compact Hong Kong weather.

The extension uses Hong Kong Observatory Open Data and keeps a compact popup layout inspired by public weather-warning dashboards. It is not an official Hong Kong Observatory product and is not affiliated with or endorsed by the Hong Kong Observatory.

## Screenshot

![Hong Kong Weather popup screenshot](docs/screenshots/popup-zh-Hant.png)

## Website

- Product page: https://fireshark.tech/apps/hong-kong-weather/
- Privacy policy: https://fireshark.tech/legal/hk-weather-alerts-privacy-policy.html

## Install

- Microsoft Edge Add-ons: https://microsoftedge.microsoft.com/addons/detail/%E9%A6%99%E6%B8%AF%E5%A4%A9%E6%B0%A3%E8%AD%A6%E5%A0%B1/koemdfkhpkadjclicmmjoaglaapcdlco
- Chrome Web Store: https://chromewebstore.google.com/detail/%E9%A6%99%E6%B8%AF%E5%A4%A9%E6%B0%A3%E8%AD%A6%E5%A0%B1/chmlbbhplbepjboepkcngfnmbellhfge
- Firefox Add-ons: Coming soon

## Data Source

Weather observations, forecasts, warnings, and related imagery are fetched from:

- Hong Kong Observatory Open Data: https://data.weather.gov.hk/
- Hong Kong Observatory website assets and links: https://www.hko.gov.hk/
- DATA.GOV.HK open data portal terms: https://data.gov.hk/en/terms-and-conditions

Use of the data is subject to the source terms. The extension should always identify the Hong Kong Observatory, the Government of the Hong Kong Special Administrative Region, and DATA.GOV.HK as the relevant data source where attribution is shown.

## Branding

This project uses its own extension icon in `assets/weather-mark.png` and `assets/generated/`.

Do not bundle the Hong Kong Observatory logo, government logos, or other protected marks in this repository unless you have explicit permission and have documented that permission. HKO warning, weather, radar, satellite, and lightning images are loaded from the official source URLs at runtime where needed.

## Documentation

- [API and external resources](docs/api.md): HKO Open Data API usage, imagery URLs, related official documentation, and host permissions.
- [AMO source build instructions](docs/amo-source-build.md): Firefox Add-ons reviewer build and source package notes.
- [Release uploads](docs/release-upload.md): packaging and manual Chrome/Edge draft upload workflow.
- DATA.GOV.HK weather dataset search: https://data.gov.hk/tc-datasets/search/%E5%A4%A9%E6%B0%A3

## Development

Use Node.js 20.19.0 or newer. The current Vite and Vitest toolchain requires Node 20+.

Install dependencies:

```bash
npm install
```

Build the unpacked extension:

```bash
npm run build
```

Build the store upload package:

```bash
npm run package:chromium
```

Load this folder in Chrome or Edge:

```text
dist/chromium
```

Build the Firefox package source:

```bash
npm run build:firefox
```

Use `dist/firefox` when creating the Firefox/AMO zip. Do not upload the Chromium zip to AMO because Firefox needs its own Gecko manifest metadata.

Do not load the repository root. The root folder contains TypeScript source files and does not contain the runtime `manifest.json`.

## Testing

Run the full gate:

```bash
npm test
```

This runs TypeScript checking, linting, unit tests, popup layout tests, and a production build.

## Contributing

See `CONTRIBUTING.md` for development, testing, browser compatibility, and attribution expectations.

## License

MIT. See `LICENSE`.
