# Store Listing Metadata

Keep public store listing text in git when it affects how users discover,
understand, or verify the extension. Browser store dashboards are still the
place where listings are submitted, but this file records the intended copy so
future releases can review changes in pull requests.

## Chrome Web Store

- Store: Chrome Web Store
- Version recorded: `0.1.1`
- Extension ID: `chmlbbhplbepjboepkcngfnmbellhfge`
- Listing URL:
  https://chromewebstore.google.com/detail/%E9%A6%99%E6%B8%AF%E5%A4%A9%E6%B0%A3%E8%AD%A6%E5%A0%B1/chmlbbhplbepjboepkcngfnmbellhfge

### Short Description

快速查看香港現時天氣、天氣警告、雷達圖、閃電位置及 7 天天氣預報。

### Release Notes

#### 0.1.1

- Open-source launch metadata cleanup.
- Package version synced with the extension manifest version.
- Public contribution metadata and issue templates added.
- Firefox add-on ID remains stable for future Firefox/AMO updates.

## Maintenance Notes

- Keep manifest descriptions in `manifests/chromium.json` and
  `manifests/firefox.json` aligned unless a browser-specific reason is
  documented.
- Record store dashboard text here before or alongside submitting a new store
  version.
- Do not commit store credentials, dashboard-only secrets, or generated upload
  packages.
