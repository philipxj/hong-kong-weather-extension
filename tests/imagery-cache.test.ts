import { describe, expect, test } from "vitest";
import {
  DEFAULT_IMAGERY_CACHE_TTL_MS,
  getFreshCachedImageryUrl,
  getFreshCachedImageryUrls,
  type ImageryUrlCache
} from "../src/shared/imagery-cache";

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
});
