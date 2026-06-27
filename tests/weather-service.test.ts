import { describe, expect, test, vi } from "vitest";
import { hkoCurrentSchema } from "../src/shared/hko-schemas";
import {
  ALL_NOTIFICATION_WARNING_CATEGORIES,
  badgeBackgroundColor,
  badgeTextColor,
  DEFAULT_SETTINGS,
  formatActionBadgeText,
  formatWarningBadgeForLanguage,
  getSettings,
  getActionBadgeWarnings,
  getSignalWarnings,
  normalizeWeather,
  parseLatestUvCsv,
  refreshWeather,
  sendTestNotification,
  updateBadge
} from "../src/shared/weather-service";
import type {
  CurrentWeather,
  Settings,
  WeatherData,
  WeatherWarning,
  WarningType
} from "../src/shared/types";

describe("weather service normalization", () => {
  test("enables every warning notification category by default", () => {
    expect(DEFAULT_SETTINGS.notifyWarningCategories).toEqual(ALL_NOTIFICATION_WARNING_CATEGORIES);
  });

  test("shows the current toolbar badge warning categories by default", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      badgeWarningCategories: [
        "rain-amber",
        "rain-red",
        "rain-black",
        "typhoon",
        "thunderstorm"
      ]
    });
  });

  test("fills all warning notification categories for older stored settings", async () => {
    vi.stubGlobal("chrome", {
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({
            settings: {
              language: "tc",
              notifyIssued: true,
              notifyCancelled: true,
              notifyExtended: true,
              notifyUpdated: false,
              badgeMode: "auto",
              currentRefreshMinutes: 15,
              warningCheckMinutes: 5
            }
          }),
          set: vi.fn()
        }
      }
    });

    try {
      await expect(getSettings()).resolves.toMatchObject({
        notifyWarningCategories: ALL_NOTIFICATION_WARNING_CATEGORIES
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("fills default toolbar badge warning categories for older stored settings", async () => {
    vi.stubGlobal("chrome", {
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({
            settings: {
              language: "tc",
              notifyIssued: true,
              notifyCancelled: true,
              notifyExtended: true,
              notifyUpdated: false,
              notifyWarningCategories: ALL_NOTIFICATION_WARNING_CATEGORIES,
              badgeMode: "auto",
              currentRefreshMinutes: 15,
              warningCheckMinutes: 5
            }
          }),
          set: vi.fn()
        }
      }
    });

    try {
      await expect(getSettings()).resolves.toMatchObject({
        badgeWarningCategories: [
          "rain-amber",
          "rain-red",
          "rain-black",
          "typhoon",
          "thunderstorm"
        ]
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("migrates the old rain notification category to amber red and black rainstorms", async () => {
    vi.stubGlobal("chrome", {
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({
            settings: {
              ...DEFAULT_SETTINGS,
              notifyWarningCategories: ["rain"]
            }
          }),
          set: vi.fn()
        }
      }
    });

    try {
      await expect(getSettings()).resolves.toMatchObject({
        notifyWarningCategories: ["rain-amber", "rain-red", "rain-black"]
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("accepts missing overnight UV index from HKO current data", () => {
    const current = hkoCurrentSchema.parse({
      icon: [64],
      uvindex: "",
      temperature: { data: [{ value: 26 }] },
      humidity: { data: [{ value: 96 }] }
    });
    const weather = normalizeWeather({
      settings: { language: "tc" },
      fetchedAt: "2026-06-18T21:06:00.000Z",
      stale: false,
      error: null,
      current,
      forecast: { weatherForecast: [] },
      warnsum: {},
      warningInfo: { details: [] }
    });

    expect(weather.current.uvIndex).toBeNull();
    expect(weather.current.uvDesc).toBe("");
  });

  test("parses latest 15-minute UV CSV in supported languages", () => {
    expect(parseLatestUvCsv("\uFEFF日期 時間,過去十五分鐘平均紫外線指數 202606201800,0.2")).toEqual(
      {
        updatedAt: "202606201800",
        value: 0.2
      }
    );
    expect(parseLatestUvCsv("Date time,past 15-minute mean UV Index 202606170745,8.2")).toEqual({
      updatedAt: "202606170745",
      value: 8.2
    });
    expect(parseLatestUvCsv("\uFEFF日期 时间,过去十五分钟平均紫外线指数 202605261800,11")).toEqual({
      updatedAt: "202605261800",
      value: 11
    });
  });

  test("ignores malformed latest UV CSV", () => {
    expect(parseLatestUvCsv("")).toBeNull();
    expect(parseLatestUvCsv("Date time,past 15-minute mean UV Index")).toBeNull();
    expect(parseLatestUvCsv("Date time,past 15-minute mean UV Index 202606170745,N/A")).toBeNull();
  });

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

  test("does not treat cancelled warnsum entries as active warnings", () => {
    const weather = normalizeWeather({
      settings: { language: "tc" },
      fetchedAt: "2026-06-26T06:30:00.000Z",
      stale: false,
      error: null,
      current: {
        icon: [62],
        temperature: { data: [{ place: "香港天文台", value: 27 }] },
        humidity: { data: [{ place: "香港天文台", value: 87 }] }
      },
      forecast: { weatherForecast: [] },
      warnsum: {
        WRAIN: {
          name: "暴雨警告信號",
          code: "WRAINA",
          type: "黃色",
          actionCode: "CANCEL",
          issueTime: "2026-06-26T13:20:00+08:00",
          updateTime: "2026-06-26T14:00:00+08:00"
        }
      },
      warningInfo: {
        details: [
          {
            contents: ["天文台在下午2時正取消黃色暴雨警告信號。"],
            subtype: "WRAINA",
            warningStatementCode: "WRAIN",
            updateTime: "2026-06-26T14:00:00+08:00"
          }
        ]
      }
    });

    expect(weather.warnings).toEqual([]);
    expect(weather.current.warningSummary).toBe("");
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

  test("keeps noisy signal types out of the toolbar badge", () => {
    const warnings = [
      warning("landslip", "山", 78),
      warning("flooding", "水", 58),
      warning("monsoon", "季", 74),
      warning("rain-amber", "黃", 40),
      warning("thunderstorm", "雷", 60),
      warning("typhoon", "T3", 70)
    ];

    expect(getSignalWarnings(warnings).map((item) => item.badge)).toEqual([
      "山",
      "水",
      "季",
      "黃",
      "雷",
      "T3"
    ]);
    expect(getActionBadgeWarnings(warnings).map((item) => item.badge)).toEqual(["黃", "雷", "T3"]);
  });

  test("filters toolbar badge warnings by selected categories", () => {
    const warnings = [
      warning("rain-red", "紅", 82),
      warning("typhoon", "T3", 70),
      warning("thunderstorm", "雷", 60),
      warning("heat", "熱", 50),
      warning("fire-red", "火", 53),
      warning("other", "OTH", 20)
    ];
    expect(
      getActionBadgeWarnings(warnings, ["thunderstorm", "heat", "fire"]).map((item) => item.badge)
    ).toEqual(["雷", "熱", "火"]);
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

  test("uses white badge backgrounds for active weather warnings", () => {
    expect(badgeBackgroundColor("黑")).toBe("#ffffff");
    expect(badgeBackgroundColor("紅")).toBe("#ffffff");
    expect(badgeBackgroundColor("黃")).toBe("#ffffff");
    expect(badgeBackgroundColor("雷")).toBe("#ffffff");
    expect(badgeBackgroundColor("")).toBe("#2f5f98");
  });

  test("uses warning-specific toolbar badge text colors on white backgrounds", () => {
    expect(badgeTextColor("紅")).toBe("#df1d1d");
    expect(badgeTextColor("黃")).toBe("#a66300");
    expect(badgeTextColor("黑")).toBe("#111111");
    expect(badgeTextColor("雷")).toBe("#b42318");
    expect(badgeTextColor("")).toBe("#ffffff");
  });

  test("updates toolbar badge without fetching remote weather icons", async () => {
    const fetchMock = vi.fn();
    const setIcon = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("chrome", {
      action: {
        setBadgeBackgroundColor: vi.fn(),
        setBadgeText: vi.fn(),
        setBadgeTextColor: vi.fn(),
        setIcon,
        setTitle: vi.fn()
      },
      runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) },
      storage: {
        local: { get: vi.fn(), set: vi.fn() },
        sync: { get: vi.fn(), set: vi.fn() }
      }
    });

    try {
      await updateBadge(cachedWeatherForBadge({ icon: 51 }), DEFAULT_SETTINGS);
      expect(setIcon).toHaveBeenCalledWith({ path: "assets/hko/weather-icons/pic51.png" });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("keeps toolbar icon synced when badge text is disabled", async () => {
    const setBadgeText = vi.fn();
    const setIcon = vi.fn();
    vi.stubGlobal("chrome", {
      action: {
        setBadgeBackgroundColor: vi.fn(),
        setBadgeText,
        setBadgeTextColor: vi.fn(),
        setIcon,
        setTitle: vi.fn()
      },
      runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) },
      storage: {
        local: { get: vi.fn(), set: vi.fn() },
        sync: { get: vi.fn(), set: vi.fn() }
      }
    });

    try {
      await updateBadge(cachedWeatherForBadge({ icon: 51 }), {
        ...DEFAULT_SETTINGS,
        badgeMode: "off"
      });
      expect(setIcon).toHaveBeenCalledWith({ path: "assets/hko/weather-icons/pic51.png" });
      expect(setBadgeText).toHaveBeenCalledWith({ text: "" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("uses selected toolbar warning categories when updating the badge", async () => {
    const setBadgeText = vi.fn();
    const setTitle = vi.fn();
    vi.stubGlobal("chrome", {
      action: {
        setBadgeBackgroundColor: vi.fn(),
        setBadgeText,
        setBadgeTextColor: vi.fn(),
        setIcon: vi.fn(),
        setTitle
      },
      runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) },
      storage: {
        local: { get: vi.fn(), set: vi.fn() },
        sync: { get: vi.fn(), set: vi.fn() }
      }
    });

    try {
      const data = {
        ...cachedWeatherForBadge({ icon: 51 }),
        warnings: [
          { ...warning("typhoon", "T3", 70), name: "強風信號" },
          { ...warning("thunderstorm", "雷", 60), name: "雷暴警告" }
        ]
      };
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        badgeWarningCategories: ["thunderstorm"]
      };

      await updateBadge(data, settings);

      expect(setBadgeText).toHaveBeenCalledWith({ text: "雷" });
      const titleDetails = setTitle.mock.calls[0]?.[0] as { title?: string } | undefined;
      expect(titleDetails?.title).toContain("警告 雷暴警告");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("sends a test notification through the browser adapter", async () => {
    const create = vi.fn().mockResolvedValue("hk-weather-alerts-test");
    vi.stubGlobal("chrome", {
      notifications: {
        create,
        getAll: vi.fn().mockResolvedValue({ "hk-weather-alerts-test": true })
      },
      runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) }
    });

    try {
      const result = await sendTestNotification("tc");
      expect(create).toHaveBeenCalledOnce();
      expect(result).toEqual({
        id: "hk-weather-alerts-test",
        permission: "unknown",
        visibleInChrome: true
      });
      expect(create.mock.calls[0]?.[0]).toBe("hk-weather-alerts-test");
      const details = create.mock.calls[0]?.[1] as
        | {
            iconUrl?: string;
            message?: string;
            priority?: number;
            requireInteraction?: boolean;
            title?: string;
            type?: string;
          }
        | undefined;
      expect(details?.type).toBe("basic");
      expect(details?.title).toBe("天氣通知測試");
      expect(details?.message).toContain("通知功能正常");
      expect(details?.iconUrl).toBe(
        "chrome-extension://test/assets/generated/weather-mark-128.png"
      );
      expect(details?.priority).toBe(2);
      expect(details?.requireInteraction).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("localizes test notifications for simplified Chinese", async () => {
    const create = vi.fn().mockResolvedValue("hk-weather-alerts-test");
    vi.stubGlobal("chrome", {
      notifications: {
        create,
        getAll: vi.fn().mockResolvedValue({ "hk-weather-alerts-test": true })
      },
      runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) }
    });

    try {
      const result = await sendTestNotification("sc");
      expect(result.visibleInChrome).toBe(true);
      const details = create.mock.calls[0]?.[1] as { message?: string; title?: string } | undefined;
      expect(details?.title).toBe("天气通知测试");
      expect(details?.message).toContain("天气警告状态");
      expect(details?.message).not.toContain("天氣警告狀態");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("reports browser notification creation failures", async () => {
    const create = vi.fn().mockRejectedValue(new Error("Notifications are denied."));
    vi.stubGlobal("chrome", {
      notifications: {
        create,
        getAll: vi.fn()
      },
      runtime: { getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) }
    });

    try {
      await expect(sendTestNotification("en")).rejects.toThrow("Notifications are denied.");
      expect(create).toHaveBeenCalledOnce();
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

function warning(type: WarningType, badge: string, priority: number): WeatherWarning {
  return {
    type,
    badge,
    priority,
    code: type,
    name: type,
    issueTime: "",
    updateTime: "",
    expireTime: "",
    contents: ""
  };
}

function cachedWeatherForBadge(currentOverrides: Partial<CurrentWeather> = {}): WeatherData {
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
      warningMessages: [],
      warningSummary: "",
      ...currentOverrides
    },
    error: null,
    fetchedAt: "2026-06-18T04:00:00.000Z",
    forecast: [],
    language: "tc" as const,
    stale: false,
    warningInfo: [],
    warnings: []
  };
}
