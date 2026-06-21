import { describe, expect, test, vi } from "vitest";

type UploadChromeDraft = (options: {
  zipPath: string;
  env: Record<string, string>;
  fetchImpl: typeof fetch;
  readFileImpl: (path: string) => Promise<BodyInit>;
  submitReview: boolean;
}) => Promise<unknown>;

// @ts-expect-error The release helper is a Node ESM script covered through runtime import.
const helperModule = (await import("../scripts/chrome-web-store-api.mjs")) as {
  uploadChromeDraft: UploadChromeDraft;
};
const uploadChromeDraft = helperModule.uploadChromeDraft;

describe("Chrome Web Store API upload", () => {
  test("submits the uploaded draft for review when requested", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "access-token" }))
      .mockResolvedValueOnce(jsonResponse({ uploadState: "SUCCESS" }))
      .mockResolvedValueOnce(jsonResponse({ item_id: "extension-id", status: ["OK"] }));
    const readFileImpl = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));

    await uploadChromeDraft({
      zipPath: "package.zip",
      env: chromeEnv(),
      fetchImpl,
      readFileImpl,
      submitReview: true
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "https://chromewebstore.googleapis.com/v2/publishers/publisher-id/items/extension-id:publish",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token"
        }
      }
    );
  });
});

function chromeEnv(): Record<string, string> {
  return {
    CHROME_EXTENSION_ID: "extension-id",
    CHROME_PUBLISHER_ID: "publisher-id",
    CHROME_CLIENT_ID: "client-id",
    CHROME_CLIENT_SECRET: "client-secret",
    CHROME_REFRESH_TOKEN: "refresh-token"
  };
}

function jsonResponse(payload: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(payload))
  };
}
