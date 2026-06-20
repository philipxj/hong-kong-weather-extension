import { beforeEach, describe, expect, test, vi } from "vitest";
import type * as BrowserApiModule from "../src/shared/browser-api";

type RuntimeListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | undefined;

describe("browser API adapter", () => {
  let listener: RuntimeListener;
  let browserApi: typeof BrowserApiModule.browserApi;

  beforeEach(async () => {
    vi.resetModules();
    listener = () => false;
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: vi.fn(() => ({ version: "0.1.1" })),
        onMessage: {
          addListener: vi.fn((callback: RuntimeListener) => {
            listener = callback;
          })
        }
      }
    });
    browserApi = (await import("../src/shared/browser-api")).browserApi;
  });

  test("closes ignored synchronous runtime messages without opening an async channel", () => {
    browserApi.runtime.onMessage(() => undefined);
    const sendResponse = vi.fn();

    const keepChannelOpen = listener({ type: "ignored" }, {}, sendResponse);

    expect(keepChannelOpen).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  test("sends an explicit null response for ignored asynchronous runtime messages", async () => {
    browserApi.runtime.onMessage(() => Promise.resolve(undefined));
    const sendResponse = vi.fn();

    const keepChannelOpen = listener({ type: "ignored" }, {}, sendResponse);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith(null));

    expect(keepChannelOpen).toBe(true);
  });

  test("reads extension metadata through the runtime adapter", () => {
    expect(browserApi.runtime.getManifest().version).toBe("0.1.1");
  });
});

describe("browser API development fallback", () => {
  let browserApi: typeof BrowserApiModule.browserApi;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();
    browserApi = (await import("../src/shared/browser-api")).browserApi;
  });

  test("stores sync and local values without extension APIs", async () => {
    await browserApi.storage.sync.set({ settings: { language: "tc" } });
    await browserApi.storage.local.set({ weatherCache: { current: { icon: 64 } } });

    await expect(browserApi.storage.sync.get("settings")).resolves.toEqual({
      settings: { language: "tc" }
    });
    await expect(browserApi.storage.local.get("weatherCache")).resolves.toEqual({
      weatherCache: { current: { icon: 64 } }
    });
  });

  test("lets popup fall back to direct refresh when runtime messaging is unavailable", async () => {
    await expect(browserApi.runtime.sendMessage({ type: "refreshWeather" })).rejects.toThrow(
      "Extension runtime is unavailable"
    );
  });

  test("keeps badge and notification calls harmless outside extension runtime", async () => {
    await expect(browserApi.action.setBadgeText({ text: "雨" })).resolves.toBeUndefined();
    await expect(browserApi.notifications.getAll()).resolves.toEqual({});
    await expect(browserApi.runtime.openOptionsPage()).resolves.toBeUndefined();
  });
});
