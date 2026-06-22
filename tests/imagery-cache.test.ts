import { describe, expect, test } from "vitest";
import {
  DEFAULT_IMAGERY_CACHE_TTL_MS,
  getFreshCachedImageryUrl,
  getFreshCachedImageryUrls,
  getStoredImageryUrls,
  type ImageryUrlCache
} from "../src/shared/imagery-cache";
import { browserApi } from "../src/shared/browser-api";

describe("imagery cache", () => {
  test("returns a cached URL within the ttl", () => {
    const now = 1_000_000;
    const cache: ImageryUrlCache = {
      radar: {
        fetchedAt: now - DEFAULT_IMAGERY_CACHE_TTL_MS + 1,
        url: "https://example.test/radar.png"
      }
    };

    expect(getFreshCachedImageryUrl(cache, "radar", now)).toBe("https://example.test/radar.png");
  });

  test("ignores a cached URL after the ttl", () => {
    const now = 1_000_000;
    const cache: ImageryUrlCache = {
      lightning: {
        fetchedAt: now - DEFAULT_IMAGERY_CACHE_TTL_MS - 1,
        url: "https://example.test/lightning.png"
      }
    };

    expect(getFreshCachedImageryUrl(cache, "lightning", now)).toBe("");
  });

  test("returns cached snapshot URLs within the ttl", () => {
    const now = 1_000_000;
    const cache: ImageryUrlCache = {
      radar: {
        fetchedAt: now - 1000,
        url: "https://example.test/radar-2.png",
        urls: ["https://example.test/radar-1.png", "https://example.test/radar-2.png"]
      }
    };

    expect(getFreshCachedImageryUrls(cache, "radar", now)).toEqual([
      "https://example.test/radar-1.png",
      "https://example.test/radar-2.png"
    ]);
  });

  test("returns stored snapshot URLs even after the ttl", async () => {
    const now = 1_000_000;
    await browserApi.storage.local.set({
      imageryUrlCache: {
        radar: {
          fetchedAt: now - DEFAULT_IMAGERY_CACHE_TTL_MS - 1,
          url: "range2|rad_064_png/radar-2.jpg",
          urls: ["range2|rad_064_png/radar-1.jpg", "range2|rad_064_png/radar-2.jpg"]
        }
      }
    });

    await expect(getStoredImageryUrls("radar")).resolves.toEqual([
      "range2|rad_064_png/radar-1.jpg",
      "range2|rad_064_png/radar-2.jpg"
    ]);
  });

  test("returns an empty list when no stored snapshot URLs exist", async () => {
    await browserApi.storage.local.set({ imageryUrlCache: {} });

    await expect(getStoredImageryUrls("lightning")).resolves.toEqual([]);
  });
});
