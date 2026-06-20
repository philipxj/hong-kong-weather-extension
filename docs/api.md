# API and External Resources

This extension uses Hong Kong Observatory (HKO) data and imagery resources.
Keep this file updated when adding, removing, or changing external HKO requests.

## Official Documentation

- DATA.GOV.HK weather dataset search:
  https://data.gov.hk/tc-datasets/search/%E5%A4%A9%E6%B0%A3
- HKO Open Data introduction:
  https://www.hko.gov.hk/en/abouthko/opendata_intro.htm
- HKO Open Data API documentation (English):
  https://www.hko.gov.hk/en/weatherAPI/doc/files/HKO_Open_Data_API_Documentation.pdf
- HKO Open Data API documentation (Traditional Chinese):
  https://www.hko.gov.hk/tc/weatherAPI/doc/files/HKO_Open_Data_API_Documentation_tc.pdf
- HKO latest 15-minute UV index data dictionary:
  https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/HKO_open_data_15min_uvindex_Documentation.pdf
- HKO website intellectual property notice:
  https://www.hko.gov.hk/en/readme/readme.htm
- HKO non-commercial use conditions:
  https://www.hko.gov.hk/en/appweb/applink.htm

## Weather Information API

Base URL:

```text
https://data.weather.gov.hk/weatherAPI/opendata/weather.php
```

Method: `GET`

Return type: `JSON`

Shared query parameters:

| Parameter  | Values           | Notes                                                        |
| ---------- | ---------------- | ------------------------------------------------------------ |
| `dataType` | See table below  | Selects the weather dataset.                                 |
| `lang`     | `en`, `tc`, `sc` | Defaults to `en` if omitted. The extension defaults to `tc`. |

Current extension usage:

| `dataType`    | Purpose in this extension                                                                                    | Normalized in                   |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `rhrread`     | Current weather readings, HKO weather icon code, fallback UV index, rainfall, tips, and local forecast text. | `src/shared/weather-service.ts` |
| `fnd`         | 9-day weather forecast row.                                                                                  | `src/shared/weather-service.ts` |
| `warnsum`     | Active warning summary, badge text, warning priority, and notification diffing.                              | `src/shared/weather-service.ts` |
| `warningInfo` | Detailed warning content, issue/update/expire times, and subtype fallback.                                   | `src/shared/weather-service.ts` |

Example requests:

```text
https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc
https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc
https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc
https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang=tc
```

## Latest 15-minute UV Index CSV

The popup shows UV index in the current weather readings. The extension first
tries the dedicated latest 15-minute UV Open Data CSV and falls back to
`rhrread.uvindex` when the CSV is unavailable or malformed.

| Language | URL                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------- |
| `tc`     | `https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_15min_uvindex_uc.csv` |
| `sc`     | `https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_15min_uvindex_sc.csv` |
| `en`     | `https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_15min_uvindex.csv`    |

DATA.GOV.HK dataset:
https://data.gov.hk/tc-data/dataset/hk-hko-rss-latest-fifteen-minute-mean-uv-index

Refresh paths:

| Trigger                                                           | API datasets called                                       | Count |
| ----------------------------------------------------------------- | --------------------------------------------------------- | ----- |
| Popup/manual refresh, install, startup, or missing cache fallback | `rhrread`, latest UV CSV, `fnd`, `warnsum`, `warningInfo` | 5     |
| Current weather alarm, default every 15 minutes                   | `rhrread`, latest UV CSV                                  | 2     |
| Forecast alarm, fixed every 120 minutes                           | `fnd`                                                     | 1     |
| Warning check alarm                                               | `warnsum`, `warningInfo`                                  | 2     |

Implementation notes:

- Fetching is centralized in `src/shared/weather-service.ts`.
- Response validation is kept in `src/shared/hko-schemas.ts`.
- Normalized extension-facing types are kept in `src/shared/types.ts`.
- HKO may omit fields when values are null or unavailable, so schemas should remain tolerant of missing optional fields.

## HKO Imagery and Pages

These resources are used by the popup imagery panel and external-link buttons.
They are not part of the Weather Information API above, but radar and lightning
imagery are core extension features and remain covered by the current
`https://www.hko.gov.hk/*` host permission.

| Resource               | URL                                                              | Purpose                                         |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| Radar image list       | `https://www.hko.gov.hk/wxinfo/radars/temp_json/nradar_img.json` | Finds the latest radar image path.              |
| Radar page             | `https://www.hko.gov.hk/tc/wxinfo/radars/radar_range1.htm`       | Opens the official radar page.                  |
| Lightning image script | `https://www.hko.gov.hk/wxinfo/llis/llisradar/radar-image.js`    | Finds the latest lightning image filename.      |
| Lightning image root   | `https://www.hko.gov.hk/wxinfo/llis/llisradar/images`            | Builds the latest lightning image URL.          |
| Lightning page         | `https://www.hko.gov.hk/tc/wxinfo/llis/llisradar.shtml`          | Opens the official lightning page.              |
| Typhoon track page     | `https://www.hko.gov.hk/tc/wxinfo/currwx/tc_pos.htm`             | Opens the official tropical cyclone track page. |

## Bundled HKO Icon Materials

Weather icons and warning signal icons are bundled in `assets/hko/` so the
popup can render official HKO icons without runtime-loading HKO icon URLs.

| Resource             | Source URL pattern                                   | Bundled path pattern                     |
| -------------------- | ---------------------------------------------------- | ---------------------------------------- |
| Weather icons        | `https://www.hko.gov.hk/images/wxicon/pic{code}.png` | `assets/hko/weather-icons/pic{code}.png` |
| Warning signal icons | `https://www.hko.gov.hk/images_e/{prefix}.gif`       | `assets/hko/warning-icons/{prefix}.gif`  |

The bundled HKO icon files are third-party HKO/Government materials. They are
not covered by the repository MIT License; see `assets/hko/NOTICE.md`.

## Extension Permissions

Current Chromium MV3 host permissions are declared in `manifests/chromium.json`:

```json
["https://data.weather.gov.hk/*", "https://www.hko.gov.hk/*"]
```

When porting to another browser, keep API access behind `src/shared/browser-api.ts`
where browser extension APIs differ, and keep HKO fetch URL changes reflected in
this file.
