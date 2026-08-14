import { beforeEach, describe, expect, test, vi } from "vitest";
import type { WeatherData } from "../src/shared/types";

const storage = vi.hoisted(() => ({ cache: null as WeatherData | null }));

vi.mock("../src/shared/browser-api", () => ({
  browserApi: {
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({ weatherCache: storage.cache })),
        set: vi.fn((items: { weatherCache: WeatherData }) => {
          storage.cache = items.weatherCache;
          return Promise.resolve();
        })
      }
    }
  }
}));

import {
  cacheSliceIsFresh,
  createEmptyWeatherData,
  updateWeatherCache,
  withWeatherSliceState
} from "../src/shared/weather-cache";

describe("weather cache slices", () => {
  beforeEach(() => {
    storage.cache = null;
  });

  test("treats old caches without slice metadata as expired", () => {
    const cache = createEmptyWeatherData("tc");
    delete cache.sliceStates;

    expect(cacheSliceIsFresh(cache, "current", 15 * 60_000, Date.now())).toBe(false);
  });

  test("accepts successful slice timestamps only within the ttl", () => {
    const now = Date.parse("2026-08-14T06:00:00.000Z");
    const cache = withWeatherSliceState(createEmptyWeatherData("tc"), "current", {
      error: null,
      fetchedAt: "2026-08-14T05:50:00.000Z",
      stale: false
    });

    expect(cacheSliceIsFresh(cache, "current", 15 * 60_000, now)).toBe(true);
    expect(cacheSliceIsFresh(cache, "current", 5 * 60_000, now)).toBe(false);
  });

  test("rejects invalid and future successful timestamps", () => {
    const now = Date.parse("2026-08-14T06:00:00.000Z");
    const cache = withWeatherSliceState(createEmptyWeatherData("tc"), "forecast", {
      error: null,
      fetchedAt: "2026-08-14T06:01:00.000Z",
      stale: false
    });

    expect(cacheSliceIsFresh(cache, "forecast", 120 * 60_000, now)).toBe(false);
  });

  test("serializes cache read merge write updates", async () => {
    storage.cache = createEmptyWeatherData("tc");
    let releaseFirst!: () => void;
    const firstMayFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = updateWeatherCache(async (cache) => {
      await firstMayFinish;
      return {
        ...(cache ?? createEmptyWeatherData("tc")),
        current: {
          ...(cache ?? createEmptyWeatherData("tc")).current,
          temperature: 31
        }
      };
    });
    const second = updateWeatherCache((cache) => ({
      ...(cache ?? createEmptyWeatherData("tc")),
      forecast: [forecastDay("20260815")]
    }));

    releaseFirst();
    await Promise.all([first, second]);

    expect(storage.cache?.current.temperature).toBe(31);
    expect(storage.cache?.forecast[0]?.date).toBe("20260815");
  });

  test("summarizes top-level compatibility state from slice states", () => {
    const cache = withWeatherSliceState(createEmptyWeatherData("en"), "warnings", {
      error: { at: "2026-08-14T05:59:00.000Z", message: "warning failure" },
      fetchedAt: "2026-08-14T05:00:00.000Z",
      stale: true
    });

    expect(cache).toMatchObject({
      error: { message: "warning failure" },
      fetchedAt: "2026-08-14T05:00:00.000Z",
      language: "en",
      stale: true
    });
  });
});

function forecastDay(date: string): WeatherData["forecast"][number] {
  return {
    date,
    humidity: "",
    icon: null,
    maxTemp: null,
    minTemp: null,
    text: "",
    weekday: "",
    wind: ""
  };
}
