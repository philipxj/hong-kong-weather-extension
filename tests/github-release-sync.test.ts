import { describe, expect, test, vi } from "vitest";

type SyncGitHubRelease = (options: {
  zipPath: string;
  env: Record<string, string>;
  fetchImpl: typeof fetch;
  readFileImpl: (path: string) => Promise<BodyInit | string>;
}) => Promise<{
  assetName: string;
  releaseUrl: string;
  tagName: string;
}>;

// @ts-expect-error The release helper is a Node ESM script covered through runtime import.
const helperModule = (await import("../scripts/github-release-api.mjs")) as {
  syncGitHubRelease: SyncGitHubRelease;
};
const syncGitHubRelease = helperModule.syncGitHubRelease;

describe("GitHub Release sync", () => {
  test("creates the version release and uploads the Chromium package", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, { status: 404 }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            assets: [],
            html_url: "https://github.test/release/v0.1.4",
            id: 123,
            upload_url: "https://uploads.github.test/releases/123/assets{?name,label}"
          },
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(jsonResponse({ state: "uploaded" }, { status: 201 }));
    const readFileImpl = vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(
          path.endsWith("package.json")
            ? JSON.stringify({ version: "0.1.4" })
            : path.endsWith("docs/store-listing.md")
              ? "#### 0.1.4\n\n- Localized notification titles.\n- Added filters.\n\n#### 0.1.2"
              : new Uint8Array([1, 2, 3])
        )
      );

    const result = await syncGitHubRelease({
      zipPath: "release/hong-kong-weather-extension-0.1.4-chromium.zip",
      env: githubEnv(),
      fetchImpl,
      readFileImpl
    });

    expect(result).toEqual({
      assetName: "hong-kong-weather-extension-0.1.4-chromium.zip",
      releaseUrl: "https://github.test/release/v0.1.4",
      tagName: "v0.1.4"
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/philipxj/hong-kong-weather-extension/releases",
      {
        body: JSON.stringify({
          body: `## Changes

- Localized notification titles.
- Added filters.

## Store Submission

- Chrome Web Store: use this package for the matching store submission.
- Microsoft Edge Add-ons: use this package for the matching store submission.

## Validation

- npm test
- npm run package:chromium`,
          make_latest: "true",
          name: "香港天氣警報 v0.1.4",
          tag_name: "v0.1.4",
          target_commitish: "main"
        }),
        headers: githubHeaders(),
        method: "POST"
      }
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "https://uploads.github.test/releases/123/assets?name=hong-kong-weather-extension-0.1.4-chromium.zip",
      {
        body: new Uint8Array([1, 2, 3]),
        headers: {
          ...githubHeaders(),
          "Content-Type": "application/zip"
        },
        method: "POST"
      }
    );
  });

  test("updates an existing release and replaces the matching asset", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          assets: [
            {
              name: "hong-kong-weather-extension-0.1.4-chromium.zip",
              url: "https://api.github.test/assets/1"
            }
          ],
          html_url: "https://github.test/release/v0.1.4",
          id: 123,
          upload_url: "https://uploads.github.test/releases/123/assets{?name,label}"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          assets: [
            {
              name: "hong-kong-weather-extension-0.1.4-chromium.zip",
              url: "https://api.github.test/assets/1"
            }
          ],
          html_url: "https://github.test/release/v0.1.4",
          id: 123,
          upload_url: "https://uploads.github.test/releases/123/assets{?name,label}"
        })
      )
      .mockResolvedValueOnce(jsonResponse({}, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ state: "uploaded" }, { status: 201 }));
    const readFileImpl = vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(path.endsWith("package.json") ? JSON.stringify({ version: "0.1.4" }) : "")
      );

    await syncGitHubRelease({
      zipPath: "release/hong-kong-weather-extension-0.1.4-chromium.zip",
      env: githubEnv(),
      fetchImpl,
      readFileImpl
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(3, "https://api.github.test/assets/1", {
      headers: githubHeaders(),
      method: "DELETE"
    });
  });
});

function githubEnv(): Record<string, string> {
  return {
    GITHUB_REF_NAME: "main",
    GITHUB_REPOSITORY: "philipxj/hong-kong-weather-extension",
    GITHUB_TOKEN: "token"
  };
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer token",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function jsonResponse(payload: unknown, options: { status?: number } = {}) {
  const status = options.status ?? 200;

  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload))
  };
}
