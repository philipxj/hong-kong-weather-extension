# Release Uploads

The manual `Release Upload` GitHub Actions workflow builds, tests, packages, and
optionally syncs the matching GitHub Release, and optionally uploads a draft
package to Chrome Web Store, Microsoft Edge Add-ons, and Mozilla Add-ons. It can
also submit uploaded Chrome drafts for review when explicitly requested. Edge
and Firefox uploads are submitted for review automatically; Edge publishes after
certification passes, while AMO review status remains visible in the AMO
developer dashboard.

This repository is safe to publish publicly. By default, the workflow only
creates a downloadable package artifact. Store uploads happen only when the
person running the workflow explicitly enables the Chrome or Edge upload input
or Firefox upload input and that repository has its own matching credentials
configured.

## Package

Build and create a Chromium MV3 zip locally:

```bash
npm run package:chromium
```

Build and create a Firefox MV3 zip locally:

```bash
npm run package:firefox
```

Build the matching source zip for AMO review:

```bash
npm run package:source
```

The browser packages are written to
`release/hong-kong-weather-extension-{version}-{target}.zip`. The source archive
is written to `release/hong-kong-weather-extension-{version}-source.zip`. The
extension package script validates that `manifest.json` is at the zip root, as
required by the browser stores.

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
5. Leave `upload_chrome`, `upload_edge`, and `upload_firefox` unchecked for
   artifact-only builds.
6. Download the `chromium-extension-package` artifact from the completed run.

The downloaded artifact contains the store-ready Chromium MV3 zip. It can be
uploaded manually to Chrome Web Store or Microsoft Edge Add-ons.

## GitHub Configuration

Each maintainer or fork owner must create their own first Chrome, Edge, and AMO
listings manually, then add their own repository variables or secrets:

| Name                       | Store  | Type                         |
| -------------------------- | ------ | ---------------------------- |
| `CHROME_EXTENSION_ID`      | Chrome | variable or secret           |
| `CHROME_PUBLISHER_ID`      | Chrome | variable or secret           |
| `CHROME_CLIENT_ID`         | Chrome | variable or secret           |
| `CHROME_CLIENT_SECRET`     | Chrome | secret                       |
| `CHROME_REFRESH_TOKEN`     | Chrome | secret                       |
| `EDGE_PRODUCT_ID`          | Edge   | variable or secret           |
| `EDGE_CLIENT_ID`           | Edge   | variable or secret           |
| `EDGE_API_KEY`             | Edge   | secret, expires periodically |
| `FIREFOX_ADDON_ID`         | AMO    | variable or secret           |
| `FIREFOX_JWT_ISSUER`       | AMO    | variable or secret           |
| `FIREFOX_JWT_SECRET`       | AMO    | secret                       |
| `FIREFOX_LICENSE`          | AMO    | variable, defaults to `MIT`  |
| `FIREFOX_SUBMISSION_NOTES` | AMO    | variable, optional           |

Create the AMO JWT issuer and secret in AMO Developer Hub under API
Credentials. `FIREFOX_ADDON_ID` should match the AMO add-on id, slug, or GUID
for the existing listing, such as `hk-weather-alerts@fireshark.tech` unless AMO
uses a different slug for the listing.

If a store's credentials are incomplete, the workflow skips that upload and
still keeps the generated zip as a GitHub Actions artifact.

When any store upload input is enabled, the workflow also creates or updates the
GitHub Release for the package version, marks it as latest, and replaces the
Chromium zip asset for that version.

Do not commit store IDs, OAuth tokens, API keys, or generated upload packages.
`release/` is ignored so local packages are not accidentally published with the
source repository.

## Running the Workflow

- Leave both upload inputs disabled to build and download the package artifact
  only. This is the default and is safe for forks.
- Enable `upload_chrome` only in a repository configured with that maintainer's
  own Chrome Web Store credentials. The run uploads a new draft package.
- Enable `submit_chrome` only when `upload_chrome` is also enabled and you want
  the uploaded Chrome draft submitted for review through the Chrome Web Store
  publish endpoint.
- Enable `upload_edge` only in a repository configured with that maintainer's
  own Microsoft Edge Add-ons credentials. The run uploads a new draft package,
  submits it for review through the Microsoft Edge Add-ons publish submission
  endpoint, and checks that the submission operation was accepted. Microsoft
  Edge Add-ons publishes the update automatically after certification passes.
- Enable `upload_firefox` only in a repository configured with that maintainer's
  own AMO credentials. The run builds the Firefox package, builds the matching
  source zip, uploads the package to AMO as a listed add-on upload, waits for AMO
  validation, then creates the new listed version with source, license, release
  notes, and reviewer notes.
- Forks can use the same workflow with their own store listings and credentials;
  they do not inherit upstream repository secrets.

Run a Firefox submission from the command line with:

```bash
gh workflow run "Release Upload" --ref main -f upload_firefox=true
```

For store upload runs:

1. Create or update the first store listing manually in the relevant dashboard.
2. Increase the extension version in the manifest before uploading a new store
   package.
3. Add release notes for that version to `docs/store-listing.md`.
4. Configure that repository's own variables and secrets.
5. Run Release Upload with the matching upload input enabled.
6. Confirm the `Sync GitHub Release` step created or updated `v{version}` and
   uploaded `hong-kong-weather-extension-{version}-chromium.zip`.
7. Enable `submit_chrome` in the same run when the uploaded Chrome draft should
   be submitted for review immediately. Edge drafts are submitted for review
   automatically when `upload_edge` is enabled. Firefox listed versions are
   submitted for AMO review automatically when `upload_firefox` is enabled.
8. Review store dashboard status after the workflow finishes. The workflow does
   not wait for Edge certification or AMO review. Partner Center and AMO
   dashboard status remain the source of truth after submission.

## Store Behavior

- Chrome uses the Chrome Web Store API upload endpoint for an existing item.
  When `submit_chrome` is enabled, it also calls the publish endpoint, which
  submits the item for review.
- GitHub Releases are synced before store upload steps when `upload_chrome` or
  `upload_edge` or `upload_firefox` is enabled. Artifact-only runs do not create
  releases.
- Edge uses the Microsoft Edge Add-ons v1.1 API key flow to upload the package
  to the product's draft submission, then polls the package upload operation.
  When `upload_edge` is enabled, it also calls the publish submission endpoint
  and polls the publish operation. After certification passes, Microsoft Edge
  Add-ons publishes the submitted update automatically.
- Firefox uses AMO JWT API credentials, uploads the Firefox zip through
  `/api/v5/addons/upload/` with the listed channel, polls upload validation, then
  creates a new listed version through
  `/api/v5/addons/addon/{id|guid|slug}/versions/`. The workflow always submits
  a source zip with Firefox because the project builds/transpiles source before
  packaging.

Store dashboard descriptions and release notes should be recorded in
`docs/store-listing.md` before or alongside submitting a new public version.
