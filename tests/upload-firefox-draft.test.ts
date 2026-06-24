import { describe, expect, test, vi } from "vitest";

type UploadFirefoxDraft = (options: {
  zipPath: string;
  sourceZipPath: string;
  env: Record<string, string>;
  fetchImpl: typeof fetch;
  readFileImpl: (path: string) => Promise<BodyInit>;
  setTimeoutImpl: (delay: number) => Promise<void>;
  nowImpl: () => number;
  nonceImpl: () => string;
}) => Promise<unknown>;

// @ts-expect-error The release helper is a Node ESM script covered through runtime import.
const helperModule = (await import("../scripts/firefox-addons-api.mjs")) as {
  uploadFirefoxDraft: UploadFirefoxDraft;
};
const uploadFirefoxDraft = helperModule.uploadFirefoxDraft;

describe("Firefox Add-ons API upload", () => {
  test("uploads a listed Firefox package, submits source, and patches review metadata", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ processed: false, uuid: "upload-uuid" }))
      .mockResolvedValueOnce(
        jsonResponse({ processed: true, uuid: "upload-uuid", valid: true, version: "0.1.5" })
      )
      .mockResolvedValueOnce(jsonResponse({ id: 123, version: "0.1.5" }))
      .mockResolvedValueOnce(jsonResponse({ id: 123, version: "0.1.5" }));
    const readFileImpl = vi
      .fn<(path: string) => Promise<BodyInit>>()
      .mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
      .mockResolvedValueOnce(new Uint8Array([4, 5, 6]));
    const setTimeoutImpl = vi.fn<(delay: number) => Promise<void>>().mockResolvedValue(undefined);

    await uploadFirefoxDraft({
      zipPath: "firefox.zip",
      sourceZipPath: "source.zip",
      env: firefoxEnv(),
      fetchImpl,
      readFileImpl,
      setTimeoutImpl,
      nowImpl: () => 1_700_000_000_000,
      nonceImpl: () => "nonce"
    });

    const [uploadUrl, uploadInit] = getFetchCall(fetchImpl, 1);
    expect(uploadUrl).toBe("https://addons.mozilla.org/api/v5/addons/upload/");
    expect(uploadInit.method).toBe("POST");
    expect(getHeader(uploadInit, "Authorization")).toMatch(
      /^JWT [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
    );
    const uploadBody = getFormBody(fetchImpl, 1);
    expect(uploadBody.get("channel")).toBe("listed");
    expect(uploadBody.get("upload")).toBeInstanceOf(Blob);

    const [pollUrl, pollInit] = getFetchCall(fetchImpl, 2);
    expect(pollUrl).toBe("https://addons.mozilla.org/api/v5/addons/upload/upload-uuid/");
    expect(getHeader(pollInit, "Authorization")).toMatch(/^JWT /);

    const [versionUrl, versionInit] = getFetchCall(fetchImpl, 3);
    expect(versionUrl).toBe(
      "https://addons.mozilla.org/api/v5/addons/addon/hk-weather-alerts@fireshark.tech/versions/"
    );
    expect(versionInit.method).toBe("POST");
    expect(getHeader(versionInit, "Authorization")).toMatch(/^JWT /);
    const versionBody = getFormBody(fetchImpl, 3);
    expect(versionBody.get("upload")).toBe("upload-uuid");
    expect(versionBody.get("license")).toBe("MIT");
    expect(versionBody.get("source")).toBeInstanceOf(Blob);

    const [metadataUrl, metadataInit] = getFetchCall(fetchImpl, 4);
    expect(metadataUrl).toBe(
      "https://addons.mozilla.org/api/v5/addons/addon/hk-weather-alerts@fireshark.tech/versions/v0.1.5/"
    );
    expect(metadataInit.method).toBe("PATCH");
    expect(getHeader(metadataInit, "Authorization")).toMatch(/^JWT /);
    expect(getHeader(metadataInit, "Content-Type")).toBe("application/json");
    expect(metadataInit.body).toBe(
      JSON.stringify({
        approval_notes: "Reviewer notes",
        release_notes: {
          "en-US": "Release notes"
        }
      })
    );
  });

  test("rejects Firefox packages that fail AMO validation", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ processed: false, uuid: "upload-uuid" }))
      .mockResolvedValueOnce(
        jsonResponse({
          processed: true,
          uuid: "upload-uuid",
          valid: false,
          validation: { errors: 1 }
        })
      );

    await expect(
      uploadFirefoxDraft({
        zipPath: "firefox.zip",
        sourceZipPath: "source.zip",
        env: firefoxEnv(),
        fetchImpl,
        readFileImpl: vi
          .fn<(path: string) => Promise<BodyInit>>()
          .mockResolvedValue(new Uint8Array([1, 2, 3])),
        setTimeoutImpl: vi.fn<(delay: number) => Promise<void>>().mockResolvedValue(undefined),
        nowImpl: () => 1_700_000_000_000,
        nonceImpl: () => "nonce"
      })
    ).rejects.toThrow("Firefox package validation failed");
  });
});

function firefoxEnv(): Record<string, string> {
  return {
    FIREFOX_ADDON_ID: "hk-weather-alerts@fireshark.tech",
    FIREFOX_JWT_ISSUER: "issuer",
    FIREFOX_JWT_SECRET: "secret",
    FIREFOX_RELEASE_NOTES: "Release notes",
    FIREFOX_SUBMISSION_NOTES: "Reviewer notes"
  };
}

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

function getFetchCall(fetchImpl: FetchMock, callNumber: number): [RequestInfo | URL, RequestInit] {
  const call = fetchImpl.mock.calls[callNumber - 1];
  const input = call?.[0];
  const init = call?.[1];

  if (!input || !init) {
    throw new Error(`Expected fetch call ${callNumber}`);
  }

  return [input, init];
}

function getFormBody(fetchImpl: FetchMock, callNumber: number) {
  const [, init] = getFetchCall(fetchImpl, callNumber);
  const body = init.body;

  if (!(body instanceof FormData)) {
    throw new Error(`Expected call ${callNumber} body to be FormData`);
  }

  return body;
}

function getHeader(init: RequestInit, name: string) {
  const headers = init.headers;

  if (!isRecord(headers)) {
    throw new Error(`Expected ${name} header`);
  }

  const value = headers[name];

  if (typeof value !== "string") {
    throw new Error(`Expected ${name} header`);
  }

  return value;
}

function jsonResponse(payload: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(payload))
  } as Response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
