import { beforeEach, describe, expect, test, vi } from "vitest";
import { browserApi } from "../src/shared/browser-api";

type RuntimeListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | undefined;

describe("browser API adapter", () => {
  let listener: RuntimeListener;

  beforeEach(() => {
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
