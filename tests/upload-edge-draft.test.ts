import { describe, expect, test, vi } from "vitest";

type UploadEdgeDraft = (options: {
  zipPath: string;
  env: Record<string, string>;
  fetchImpl: typeof fetch;
  readFileImpl: (path: string) => Promise<BodyInit>;
  setTimeoutImpl: (delay: number) => Promise<void>;
  submitReview: boolean;
}) => Promise<unknown>;

// @ts-expect-error The release helper is a Node ESM script covered through runtime import.
const helperModule = (await import("../scripts/edge-addons-api.mjs")) as {
  uploadEdgeDraft: UploadEdgeDraft;
};
const uploadEdgeDraft = helperModule.uploadEdgeDraft;

describe("Microsoft Edge Add-ons API upload", () => {
  test("submits the uploaded draft for review when requested", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 202, location: "upload-operation" }))
      .mockResolvedValueOnce(jsonResponse({ status: "Succeeded" }))
      .mockResolvedValueOnce(jsonResponse({}, { status: 202, location: "publish-operation" }))
      .mockResolvedValueOnce(jsonResponse({ status: "Succeeded" }));
    const readFileImpl = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    const setTimeoutImpl = vi.fn().mockResolvedValue(undefined);

    await uploadEdgeDraft({
      zipPath: "package.zip",
      env: edgeEnv(),
      fetchImpl,
      readFileImpl,
      setTimeoutImpl,
      submitReview: true
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.addons.microsoftedge.microsoft.com/v1/products/product-id/submissions/draft/package",
      {
        method: "POST",
        headers: {
          Authorization: "ApiKey api-key",
          "Content-Type": "application/zip",
          "X-ClientID": "client-id"
        },
        body: new Uint8Array([1, 2, 3])
      }
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "https://api.addons.microsoftedge.microsoft.com/v1/products/product-id/submissions",
      {
        method: "POST",
        headers: {
          Authorization: "ApiKey api-key",
          "Content-Type": "application/json",
          "X-ClientID": "client-id"
        },
        body: JSON.stringify({ notes: "Submitted by release workflow." })
      }
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      "https://api.addons.microsoftedge.microsoft.com/v1/products/product-id/submissions/operations/publish-operation",
      {
        headers: {
          Authorization: "ApiKey api-key",
          "X-ClientID": "client-id"
        }
      }
    );
  });

  test("retries Edge review submission when another submission is still in progress", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 202, location: "upload-operation" }))
      .mockResolvedValueOnce(jsonResponse({ status: "Succeeded" }))
      .mockResolvedValueOnce(jsonResponse({}, { status: 202, location: "publish-operation-1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          errorCode: "InProgressSubmission",
          message: "Can't publish extension as your extension submission is in progress.",
          status: "Failed"
        })
      )
      .mockResolvedValueOnce(jsonResponse({}, { status: 202, location: "publish-operation-2" }))
      .mockResolvedValueOnce(jsonResponse({ status: "Succeeded" }));
    const readFileImpl = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    const setTimeoutImpl = vi.fn().mockResolvedValue(undefined);

    await uploadEdgeDraft({
      zipPath: "package.zip",
      env: {
        ...edgeEnv(),
        EDGE_PUBLISH_RETRY_ATTEMPTS: "2",
        EDGE_PUBLISH_RETRY_DELAY_MS: "123"
      },
      fetchImpl,
      readFileImpl,
      setTimeoutImpl,
      submitReview: true
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      5,
      "https://api.addons.microsoftedge.microsoft.com/v1/products/product-id/submissions",
      {
        method: "POST",
        headers: {
          Authorization: "ApiKey api-key",
          "Content-Type": "application/json",
          "X-ClientID": "client-id"
        },
        body: JSON.stringify({ notes: "Submitted by release workflow." })
      }
    );
    expect(setTimeoutImpl).toHaveBeenCalledWith(123);
  });
});

function edgeEnv(): Record<string, string> {
  return {
    EDGE_API_KEY: "api-key",
    EDGE_CLIENT_ID: "client-id",
    EDGE_PRODUCT_ID: "product-id"
  };
}

function jsonResponse(payload: unknown, options: { location?: string; status?: number } = {}) {
  const status = options.status ?? 200;
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === "location" ? options.location : null)
    },
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload))
  };
}
