import { describe, expect, test, vi } from "vitest";
import {
  badgeBackgroundColor,
  DEFAULT_SETTINGS,
  formatActionBadgeText,
  getSignalWarnings,
  normalizeWeather,
  refreshWeather
} from "../src/shared/weather-service";

describe("weather service normalization", () => {
  test("normalizes active warning badges from warnsum codes", () => {
    const weather = normalizeWeather({
      settings: { language: "tc" },
      fetchedAt: "2026-06-18T04:00:00.000Z",
      stale: false,
      error: null,
      current: {
        icon: [64],
        uvindex: { data: [{ value: 0.4, desc: "低" }] },
        temperature: { data: [{ place: "香港天文台", value: 28 }] },
        humidity: { data: [{ place: "香港天文台", value: 87 }] }
      },
      forecast: { weatherForecast: [] },
      warnsum: {
        WRAIN: {
          name: "暴雨警告信號",
          code: "WRAINA",
          type: "黃色",
          issueTime: "2026-06-18T11:15:00+08:00"
        },
        WTS: {
          name: "雷暴警告",
          code: "WTS",
          issueTime: "2026-06-18T01:30:00+08:00"
        }
      },
      warningInfo: { details: [] }
    });

    const badges = new Map(weather.warnings.map((warning) => [warning.code, warning.badge]));
    expect(badges.get("WRAINA")).toBe("黃");
    expect(badges.get("WTS")).toBe("雷");
    expect(weather.current.uvIndex).toBe(0.4);
    expect(weather.current.uvDesc).toBe("低");
  });

  test("shows northern New Territories flooding report without classifying it as thunderstorm", () => {
    const weather = normalizeWeather({
      settings: { language: "tc" },
      fetchedAt: "2026-06-18T04:55:00.000Z",
      stale: false,
      error: null,
      current: {
        icon: [64],
        temperature: { data: [{ value: 28 }] },
        humidity: { data: [{ value: 87 }] }
      },
      forecast: { weatherForecast: [] },
      warnsum: {
        WFNTSA: {
          name: "新界北部水浸特別報告",
          code: "WFNTSA",
          issueTime: "2026-06-18T12:40:00+08:00"
        },
        WTS: {
          name: "雷暴警告",
          code: "WTS",
          issueTime: "2026-06-18T01:30:00+08:00"
        }
      },
      warningInfo: { details: [] }
    });

    const warningsByCode = new Map(weather.warnings.map((warning) => [warning.code, warning]));

    expect(warningsByCode.get("WFNTSA")?.type).toBe("flooding");
    expect(warningsByCode.get("WFNTSA")?.badge).toBe("水");
    expect(warningsByCode.get("WTS")?.type).toBe("thunderstorm");
    expect(warningsByCode.get("WTS")?.badge).toBe("雷");
    expect(getSignalWarnings(weather.warnings).map((warning) => warning.code)).toEqual([
      "WTS",
      "WFNTSA"
    ]);
  });

  test("keeps all active HKO warning signal types visible", () => {
    const weather = normalizeWeather({
      settings: { language: "tc" },
      fetchedAt: "2026-06-18T05:50:00.000Z",
      stale: false,
      error: null,
      current: {
        icon: [64],
        temperature: { data: [{ value: 28 }] },
        humidity: { data: [{ value: 89 }] }
      },
      forecast: { weatherForecast: [] },
      warnsum: {
        WFNTSA: {
          name: "新界北部水浸特別報告",
          code: "WFNTSA",
          issueTime: "2026-06-18T12:40:00+08:00"
        },
        WL: {
          name: "山泥傾瀉警告",
          code: "WL",
          issueTime: "2026-06-18T13:30:00+08:00"
        },
        WRAIN: {
          name: "暴雨警告信號",
          code: "WRAINB",
          type: "黑色",
          issueTime: "2026-06-18T12:55:00+08:00"
        },
        WTS: {
          name: "雷暴警告",
          code: "WTS",
          issueTime: "2026-06-18T01:30:00+08:00"
        }
      },
      warningInfo: { details: [] }
    });

    expect(getSignalWarnings(weather.warnings).map((warning) => warning.code)).toEqual([
      "WRAINB",
      "WL",
      "WTS",
      "WFNTSA"
    ]);
    expect(weather.warnings.map((warning) => warning.type)).toEqual([
      "rain-black",
      "landslip",
      "thunderstorm",
      "flooding"
    ]);
  });

  test("keeps auto badge readable by prioritizing warning over temperature", () => {
    expect(formatActionBadgeText("auto", "黑", "28°")).toBe("黑");
    expect(formatActionBadgeText("auto", "雷", "27°")).toBe("雷");
    expect(formatActionBadgeText("auto", "T3", "28°")).toBe("T3");
    expect(formatActionBadgeText("auto", "", "28°")).toBe("28°");
  });

  test("keeps explicit badge modes focused", () => {
    expect(formatActionBadgeText("warning", "黑", "28°")).toBe("黑");
    expect(formatActionBadgeText("temperature", "黑", "28°")).toBe("28°");
  });

  test("uses rainstorm-specific badge background colors", () => {
    expect(badgeBackgroundColor("黑")).toBe("#111111");
    expect(badgeBackgroundColor("紅")).toBe("#df1d1d");
    expect(badgeBackgroundColor("黃")).toBe("#ffd200");
    expect(badgeBackgroundColor("")).toBe("#2f5f98");
  });

  test("does not reuse cached weather from a different language after refresh failure", async () => {
    const localSet = vi.fn();
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            weatherCache: {
              language: "tc",
              fetchedAt: "2026-06-18T04:00:00.000Z",
              stale: false,
              error: null,
              current: {
                temperature: 28,
                humidity: 87,
                uvIndex: 0.4,
                uvDesc: "低",
                rainfall: null,
                icon: 64,
                summary: "",
                tips: [],
                warningMessages: [],
                forecast: "",
                warningSummary: ""
              },
              forecast: [],
              warnings: [],
              warningInfo: []
            }
          }),
          set: localSet
        },
        sync: {
          get: vi.fn(),
          set: vi.fn()
        }
      }
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    try {
      await expect(refreshWeather({ ...DEFAULT_SETTINGS, language: "en" })).rejects.toThrow(
        "offline"
      );
      expect(localSet).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
