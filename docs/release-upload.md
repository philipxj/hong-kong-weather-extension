# Release Uploads

The manual `Release Upload` GitHub Actions workflow builds, tests, packages, and
optionally uploads a draft package to Chrome Web Store and Microsoft Edge
Add-ons. It does not submit either store listing for review.

This repository is safe to publish publicly. By default, the workflow only
creates a downloadable package artifact. Store uploads happen only when the
person running the workflow explicitly enables the Chrome or Edge upload input
and that repository has its own matching credentials configured.

## Package

Build and create a Chromium MV3 zip locally:

```bash
npm run package:chromium
```

The package is written to `release/hong-kong-weather-extension-{version}-chromium.zip`.
The script validates that `manifest.json` is at the zip root, as required by the
browser stores.

## Quick Start

Use the local package when you only need a zip to upload manually:

```bash
npm install
npm run package:chromium
```

Use GitHub Actions when you want a reproducible package from a clean CI runner:

1. Open the repository on GitHub.
2. Go to Actions.
3. Select Release Upload.
4. Click Run workflow.
5. Leave `upload_chrome` and `upload_edge` unchecked for artifact-only builds.
6. Download the `chromium-extension-package` artifact from the completed run.

The downloaded artifact contains the store-ready Chromium MV3 zip. It can be
uploaded manually to Chrome Web Store or Microsoft Edge Add-ons.

## GitHub Configuration

Each maintainer or fork owner must create their own first Chrome and Edge
listings manually, then add their own repository variables or secrets:

| Name                   | Store  | Type                         |
| ---------------------- | ------ | ---------------------------- |
| `CHROME_EXTENSION_ID`  | Chrome | variable or secret           |
| `CHROME_PUBLISHER_ID`  | Chrome | variable or secret           |
| `CHROME_CLIENT_ID`     | Chrome | variable or secret           |
| `CHROME_CLIENT_SECRET` | Chrome | secret                       |
| `CHROME_REFRESH_TOKEN` | Chrome | secret                       |
| `EDGE_PRODUCT_ID`      | Edge   | variable or secret           |
| `EDGE_CLIENT_ID`       | Edge   | variable or secret           |
| `EDGE_API_KEY`         | Edge   | secret, expires periodically |

If a store's credentials are incomplete, the workflow skips that upload and
still keeps the generated zip as a GitHub Actions artifact.

Do not commit store IDs, OAuth tokens, API keys, or generated upload packages.
`release/` is ignored so local packages are not accidentally published with the
source repository.

## Running the Workflow

- Leave both upload inputs disabled to build and download the package artifact
  only. This is the default and is safe for forks.
- Enable `upload_chrome` only in a repository configured with that maintainer's
  own Chrome Web Store credentials. The run uploads a new draft package, then
  stops before review submission.
- Enable `upload_edge` only in a repository configured with that maintainer's
  own Microsoft Edge Add-ons credentials. The run uploads a new draft package,
  checks the package upload status, then stops before review submission.
- Forks can use the same workflow with their own store listings and credentials;
  they do not inherit upstream repository secrets.

For store upload runs:

1. Create or update the first store listing manually in the relevant dashboard.
2. Increase the extension version in the manifest before uploading a new store
   package.
3. Configure that repository's own variables and secrets.
4. Run Release Upload with the matching upload input enabled.
5. Review the draft in the store dashboard.
6. Submit the draft for review manually when ready.

## Store Behavior

- Chrome uses the Chrome Web Store API upload endpoint for an existing item.
  The publish endpoint is not called.
- Edge uses the Microsoft Edge Add-ons v1.1 API key flow to upload the package
  to the product's draft submission, then polls the package upload operation.
  The publish submission endpoint is not called.

After upload, submit the draft for review manually in the Chrome Developer
Dashboard or Microsoft Partner Center.
