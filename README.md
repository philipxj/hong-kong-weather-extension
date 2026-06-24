# 香港天氣預報 / Hong Kong Weather

[![CI](https://github.com/philipxj/hong-kong-weather-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/philipxj/hong-kong-weather-extension/actions/workflows/ci.yml)

Unofficial browser extension for Hong Kong weather using Hong Kong Observatory Open Data.

Hong Kong Weather keeps current weather, active warning signals, special weather tips, radar imagery, lightning location, and 7-day forecasts close to your browser toolbar. It is not an official Hong Kong Observatory product and is not affiliated with or endorsed by the Hong Kong Observatory.

## Screenshot

![Hong Kong Weather popup screenshot](docs/screenshots/popup-zh-Hant.png)

## Website

- Product page: https://fireshark.tech/apps/hong-kong-weather/
- Privacy policy: https://fireshark.tech/legal/hk-weather-alerts-privacy-policy.html

## Install

- Chrome Web Store: submitted for review: https://chromewebstore.google.com/detail/%E9%A6%99%E6%B8%AF%E5%A4%A9%E6%B0%A3%E8%AD%A6%E5%A0%B1/chmlbbhplbepjboepkcngfnmbellhfge
- Microsoft Edge Add-ons: https://microsoftedge.microsoft.com/addons/detail/%E9%A6%99%E6%B8%AF%E5%A4%A9%E6%B0%A3%E8%AD%A6%E5%A0%B1/koemdfkhpkadjclicmmjoaglaapcdlco
- Firefox Add-ons: https://addons.mozilla.org/zh-TW/firefox/addon/%E9%A6%99%E6%B8%AF%E5%A4%A9%E6%B0%A3%E9%A0%90%E5%A0%B1-hong-kong-weather/

## Privacy

The extension does not collect, sell, share, or transmit personal user data to Fireshark HK or third parties. It stores preferences in browser extension sync storage when available, and stores cached public weather data in browser storage so the popup, badge, and notification features can work.

See the [privacy policy](https://fireshark.tech/legal/hk-weather-alerts-privacy-policy.html) for details.

## Data Source

Weather observations, forecasts, warnings, and related imagery are fetched from:

- Hong Kong Observatory Open Data: https://data.weather.gov.hk/
- Bundled Hong Kong Observatory weather and warning icon materials: `assets/hko/`
- Hong Kong Observatory website radar and lightning imagery: https://www.hko.gov.hk/
- DATA.GOV.HK open data portal terms: https://data.gov.hk/en/terms-and-conditions

Use of the data and bundled HKO materials is subject to the source terms. The extension should always identify the Hong Kong Observatory, the Government of the Hong Kong Special Administrative Region, and DATA.GOV.HK as the relevant data source where attribution is shown.

## Branding

This project uses its own extension icon in `assets/weather-mark.svg` and `assets/generated/`.
Popup weather and warning icons in `assets/hko/` are copied from Hong Kong Observatory website materials for free non-commercial use and are not covered by the repository MIT License.

Do not bundle the Hong Kong Observatory logo, government logos, DATA.GOV.HK marks, or other protected marks in this repository unless you have explicit permission and have documented that permission. Radar and lightning imagery are loaded from the official HKO website at runtime because they are core popup features and are not currently replaced by bundled assets.

## Documentation

- [API and external resources](docs/api.md): HKO Open Data API usage, imagery URLs, related official documentation, and host permissions.
- [AMO source build instructions](docs/amo-source-build.md): Firefox Add-ons reviewer build and source package notes.
- [Release uploads](docs/release-upload.md): packaging and manual Chrome/Edge draft upload workflow.
- [Store listing metadata](docs/store-listing.md): versioned Chrome Web Store copy and release notes.
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

The extension code is MIT licensed. See `LICENSE`. Bundled HKO icon materials in `assets/hko/` are third-party materials subject to HKO/Government terms; see `assets/hko/NOTICE.md`.
