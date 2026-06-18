import { describe, expect, test, vi } from "vitest";
import {
  badgeBackgroundColor,
  badgeTextColor,
  DEFAULT_SETTINGS,
  formatActionBadgeText,
  formatWarningBadgeForLanguage,
  getSignalWarnings,
  normalizeWeather,
  refreshWeather,
  sendTestNotification
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
        specialWxTips: ["局部地區有大雨"],
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
    expect(weather.current.tips).toEqual(["局部地區有大雨"]);
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

  test("normalizes less common official HKO warning signal types", () => {
    const weather = normalizeWeather({
      settings: { language: "en" },
      fetchedAt: "2026-06-18T06:10:00.000Z",
      stale: false,
      error: null,
      current: {
        icon: [64],
        temperature: { data: [{ value: 28 }] },
        humidity: { data: [{ value: 89 }] }
      },
      forecast: { weatherForecast: [] },
      warnsum: {
        WFROST: {
          name: "Frost Warning",
          code: "WFROST",
          issueTime: "2026-06-18T06:00:00+08:00"
        },
        WFIRE: {
          name: "Fire Danger Warning",
          code: "WFIREY",
          type: "Yellow",
          issueTime: "2026-06-18T06:00:00+08:00"
        },
        WFIRER: {
          name: "Red Fire Danger Warning",
          code: "WFIRER",
          issueTime: "2026-06-18T06:00:00+08:00"
        },
        WTMW: {
          name: "Tsunami Warning",
          code: "WTMW",
          issueTime: "2026-06-18T06:00:00+08:00"
        }
      },
      warningInfo: { details: [] }
    });

    const warningsByCode = new Map(weather.warnings.map((warning) => [warning.code, warning]));

    expect(warningsByCode.get("WFROST")?.type).toBe("frost");
    expect(warningsByCode.get("WFROST")?.badge).toBe("霜");
    expect(warningsByCode.get("WFIREY")?.type).toBe("fire-yellow");
    expect(warningsByCode.get("WFIREY")?.badge).toBe("火");
    expect(warningsByCode.get("WFIRER")?.type).toBe("fire-red");
    expect(warningsByCode.get("WFIRER")?.badge).toBe("火");
    expect(warningsByCode.get("WTMW")?.type).toBe("tsunami");
    expect(warningsByCode.get("WTMW")?.badge).toBe("海嘯");
    expect(getSignalWarnings(weather.warnings)).toHaveLength(4);
  });

  test("keeps auto badge readable by prioritizing warning over temperature", () => {
    expect(formatActionBadgeText("auto", "黑", "28°")).toBe("黑");
    expect(formatActionBadgeText("auto", "雷", "27°")).toBe("雷");
    expect(formatActionBadgeText("auto", "T3", "28°")).toBe("T3");
    expect(formatActionBadgeText("auto", "", "28°")).toBe("28°");
  });

  test("localizes toolbar warning badges for the active language", () => {
    expect(
      formatWarningBadgeForLanguage({ badge: "黑", code: "WRAINB", type: "rain-black" }, "tc")
    ).toBe("黑");
    expect(
      formatWarningBadgeForLanguage({ badge: "黑", code: "WRAINB", type: "rain-black" }, "en")
    ).toBe("Blk");
    expect(
      formatWarningBadgeForLanguage({ badge: "雷", code: "WTS", type: "thunderstorm" }, "en")
    ).toBe("TS");
    expect(formatWarningBadgeForLanguage({ badge: "熱", code: "WHOT", type: "heat" }, "sc")).toBe(
      "热"
    );
    expect(
      formatWarningBadgeForLanguage({ badge: "海嘯", code: "WTMW", type: "tsunami" }, "sc")
    ).toBe("海啸");
    expect(
      formatWarningBadgeForLanguage({ badge: "霜", code: "WFROST", type: "frost" }, "en")
    ).toBe("Frst");
    expect(
      formatWarningBadgeForLanguage({ badge: "火", code: "WFIREY", type: "fire-yellow" }, "en")
    ).toBe("Fire");
    expect(
      formatWarningBadgeForLanguage({ badge: "海嘯", code: "WTMW", type: "tsunami" }, "en")
    ).toBe("Tsu");
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

  test("uses readable toolbar badge text colors", () => {
    expect(badgeTextColor("黃")).toBe("#111111");
    expect(badgeTextColor("紅")).toBe("#ffffff");
    expect(badgeTextColor("黑")).toBe("#ffffff");
  });

  test("sends a test notification through the browser adapter", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      notifications: { create },
      runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) }
    });

    try {
      await sendTestNotification("tc");
      expect(create).toHaveBeenCalledOnce();
      const details = create.mock.calls[0]?.[0] as
        | { iconUrl?: string; message?: string; title?: string; type?: string }
        | undefined;
      expect(details?.type).toBe("basic");
      expect(details?.title).toBe("天氣通知測試");
      expect(details?.message).toContain("通知功能正常");
      expect(details?.iconUrl).toBe(
        "chrome-extension://test/assets/generated/weather-mark-128.png"
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("localizes test notifications for simplified Chinese", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      notifications: { create },
      runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) }
    });

    try {
      await sendTestNotification("sc");
      const details = create.mock.calls[0]?.[0] as { message?: string; title?: string } | undefined;
      expect(details?.title).toBe("天气通知测试");
      expect(details?.message).toContain("天气警告状态");
      expect(details?.message).not.toContain("天氣警告狀態");
    } finally {
      vi.unstubAllGlobals();
    }
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
