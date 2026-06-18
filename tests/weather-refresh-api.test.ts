import { beforeEach, describe, expect, test, vi } from "vitest";
import type { WeatherData } from "../src/shared/types";

const mockState = vi.hoisted<{
  local: Record<string, unknown>;
  notifications: unknown[];
  sync: Record<string, unknown>;
}>(() => ({
  local: {},
  notifications: [],
  sync: {}
}));

vi.mock("../src/shared/browser-api", () => ({
  browserApi: {
    action: {
      setBadgeBackgroundColor: vi.fn(),
      setBadgeText: vi.fn()
    },
    notifications: {
      create: vi.fn((details: unknown) => {
        mockState.notifications.push(details);
        return Promise.resolve();
      })
    },
    runtime: {
      getUrl: (path: string) => path
    },
    storage: {
      local: {
        get: vi.fn((key: string) => Promise.resolve({ [key]: mockState.local[key] })),
        set: vi.fn((items: Record<string, unknown>) => {
          Object.assign(mockState.local, items);
          return Promise.resolve();
        })
      },
      sync: {
        get: vi.fn((key: string) => Promise.resolve({ [key]: mockState.sync[key] })),
        set: vi.fn((items: Record<string, unknown>) => {
          Object.assign(mockState.sync, items);
          return Promise.resolve();
        })
      }
    }
  }
}));

import {
  DEFAULT_SETTINGS,
  refreshCurrentWeather,
  refreshForecast,
  refreshWeather,
  refreshWeatherWarnings
} from "../src/shared/weather-service";

describe("weather refresh API usage", () => {
  beforeEach(() => {
    mockState.local = {};
    mockState.sync = {};
    mockState.notifications = [];
    vi.stubGlobal("fetch", vi.fn(fetchHkoFixture));
  });

  test("full refresh calls all four HKO weather datasets", async () => {
    await refreshWeather(DEFAULT_SETTINGS);

    expect(fetchDataTypes()).toEqual(["rhrread", "fnd", "warnsum", "warningInfo"]);
  });

  test("current weather refresh only calls the current readings dataset", async () => {
    mockState.local.weatherCache = cachedWeather();

    const data = await refreshCurrentWeather(DEFAULT_SETTINGS);

    expect(fetchDataTypes()).toEqual(["rhrread"]);
    expect(data.current.temperature).toBe(30);
    expect(data.forecast[0]?.date).toBe("20260618");
    expect(data.warnings.map((warning) => warning.code)).toEqual(["WRAINA"]);
  });

  test("forecast refresh only calls the forecast dataset", async () => {
    mockState.local.weatherCache = cachedWeather();

    const data = await refreshForecast(DEFAULT_SETTINGS);

    expect(fetchDataTypes()).toEqual(["fnd"]);
    expect(data.current.temperature).toBe(28);
    expect(data.forecast[0]?.date).toBe("20260619");
    expect(data.warnings.map((warning) => warning.code)).toEqual(["WRAINA"]);
  });

  test("warning refresh only calls warning summary and warning detail datasets", async () => {
    mockState.local.weatherCache = cachedWeather();

    const data = await refreshWeatherWarnings(DEFAULT_SETTINGS);

    expect(fetchDataTypes()).toEqual(["warnsum", "warningInfo"]);
    expect(data.current.temperature).toBe(28);
    expect(data.warnings.map((warning) => warning.code)).toEqual(["WTS"]);
    expect(data.current.warningSummary).toBe("雷暴警告");
  });

  test("partial refresh falls back to full refresh when there is no cached weather", async () => {
    await refreshWeatherWarnings(DEFAULT_SETTINGS);

    expect(fetchDataTypes()).toEqual(["rhrread", "fnd", "warnsum", "warningInfo"]);
  });
});

function fetchHkoFixture(input: string | URL | Request): Promise<Response> {
  const url = new URL(inputToUrl(input));
  const dataType = url.searchParams.get("dataType");

  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(hkoPayload(dataType))
  } as Response);
}

function fetchDataTypes(): string[] {
  return vi
    .mocked(fetch)
    .mock.calls.map(([input]) => new URL(inputToUrl(input)).searchParams.get("dataType") ?? "");
}

function inputToUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function hkoPayload(dataType: string | null): unknown {
  if (dataType === "rhrread") {
    return {
      forecastDesc: "短暫時間有陽光",
      humidity: { data: [{ place: "香港天文台", value: 82 }] },
      icon: [52],
      specialWxTips: ["局部地區有大雨"],
      temperature: { data: [{ place: "香港天文台", value: 30 }] },
      uvindex: { data: [{ value: 4, desc: "中等" }] }
    };
  }

  if (dataType === "fnd") {
    return {
      weatherForecast: [
        {
          ForecastIcon: 52,
          forecastDate: "20260619",
          forecastMaxtemp: { value: 32 },
          forecastMintemp: { value: 27 },
          week: "五"
        }
      ]
    };
  }

  if (dataType === "warnsum") {
    return {
      WTS: {
        code: "WTS",
        issueTime: "2026-06-18T01:30:00+08:00",
        name: "雷暴警告"
      }
    };
  }

  if (dataType === "warningInfo") {
    return {
      details: [
        {
          contents: ["雷暴警告現正生效。"],
          issueTime: "2026-06-18T01:30:00+08:00",
          subtype: "雷暴警告",
          warningStatementCode: "WTS"
        }
      ]
    };
  }

  throw new Error(`Unexpected dataType: ${dataType}`);
}

function cachedWeather(): WeatherData {
  return {
    current: {
      forecast: "多雲",
      humidity: 87,
      icon: 64,
      rainfall: null,
      summary: "",
      temperature: 28,
      tips: [],
      uvDesc: "低",
      uvIndex: 0.4,
      warningSummary: "暴雨警告信號"
    },
    error: null,
    fetchedAt: "2026-06-18T04:00:00.000Z",
    forecast: [
      {
        date: "20260618",
        humidity: "70-90%",
        icon: 64,
        maxTemp: 31,
        minTemp: 27,
        text: "多雲",
        weekday: "四",
        wind: "東至東南風"
      }
    ],
    language: "tc",
    stale: false,
    warningInfo: [],
    warnings: [
      {
        badge: "黃",
        code: "WRAINA",
        contents: "",
        expireTime: "",
        issueTime: "2026-06-18T01:00:00+08:00",
        name: "暴雨警告信號",
        priority: 20,
        type: "rain-amber",
        updateTime: ""
      }
    ]
  };
}
