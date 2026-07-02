import { beforeEach, describe, expect, test, vi } from "vitest";
import type { WeatherData, WeatherWarning } from "../src/shared/types";

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

  test("full refresh calls all four HKO weather datasets and latest UV CSV", async () => {
    const data = await refreshWeather(DEFAULT_SETTINGS);

    expect(fetchDataTypes()).toEqual(["rhrread", "fnd", "warnsum", "warningInfo"]);
    expect(fetchUrls()).toContain(
      "https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_15min_uvindex_uc.csv"
    );
    expect(data.current.uvIndex).toBe(8.2);
    expect(data.current.uvDesc).toBe("甚高");
  });

  test("full refresh loads active tropical cyclone data best effort", async () => {
    vi.mocked(fetch).mockImplementation(fetchHkoWithTropicalCycloneFixture);

    const data = await refreshWeather(DEFAULT_SETTINGS);

    expect(fetchUrls()).toContain("https://www.weather.gov.hk/wxinfo/currwx/tc_list.xml");
    expect(fetchUrls()).toContain("https://www.weather.gov.hk/wxinfo/currwx/hko_tctrack_2611.xml");
    expect(fetchUrls().some((url) => url.includes("tc_gis"))).toBe(false);
    expect(fetchUrls().some((url) => url.includes("tc_des"))).toBe(false);
    expect(data.tropicalCyclones).toHaveLength(2);
    expect(data.tropicalCyclones[0]).toMatchObject({
      classification: "熱帶風暴",
      description: "米克拉位於香港以東北偏東約 1860 公里。",
      directionFromHongKong: "ENE",
      distanceKm: 1860,
      id: "2611",
      latitude: 29.7,
      longitude: 130.9,
      maxWindKmh: 65,
      name: "米克拉",
      observedAtHkt: "2026062702",
      trackMapUrl: "https://www.hko.gov.hk/wxinfo/currwx/nwp_2611.png",
      trackUrl: "https://www.hko.gov.hk/tc/wxinfo/currwx/tc_pos.htm?tcid=2611"
    });
    expect(data.tropicalCyclones[1]).toMatchObject({
      id: "2612",
      name: "海高斯"
    });
  });

  test("full refresh avoids duplicating unnamed tropical cyclone classifications", async () => {
    vi.mocked(fetch).mockImplementation(fetchHkoWithUnnamedTropicalCycloneFixture);

    const data = await refreshWeather(DEFAULT_SETTINGS);

    expect(data.tropicalCyclones).toHaveLength(1);
    expect(data.tropicalCyclones[0]).toMatchObject({
      classification: "熱帶低氣壓",
      chineseName: "熱帶低氣壓",
      englishName: "Tropical Depression",
      id: "2613",
      name: ""
    });
    expect(data.tropicalCyclones[0]?.description).toMatch(/^熱帶低氣壓位於香港以/);
  });

  test("full refresh keeps weather data when tropical cyclone fetch fails", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);
      if (url.endsWith("/wxinfo/currwx/tc_list.xml")) {
        return Promise.resolve({ ok: false, text: () => Promise.resolve("") } as Response);
      }
      return fetchHkoFixture(input);
    });

    const data = await refreshWeather(DEFAULT_SETTINGS);

    expect(data.current.temperature).toBe(30);
    expect(data.tropicalCyclones).toEqual([]);
  });

  test("current weather refresh only calls current readings and latest UV CSV", async () => {
    mockState.local.weatherCache = cachedWeather();

    const data = await refreshCurrentWeather(DEFAULT_SETTINGS);

    expect(fetchDataTypes()).toEqual(["rhrread"]);
    expect(fetchUrls()).toContain(
      "https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_15min_uvindex_uc.csv"
    );
    expect(data.current.temperature).toBe(30);
    expect(data.current.uvIndex).toBe(8.2);
    expect(data.current.uvDesc).toBe("甚高");
    expect(data.forecast[0]?.date).toBe("20260618");
    expect(data.warnings.map((warning) => warning.code)).toEqual(["WRAINA"]);
  });

  test("current weather refresh keeps rhrread UV when latest UV CSV fails", async () => {
    mockState.local.weatherCache = cachedWeather();
    vi.mocked(fetch).mockImplementation((input) => {
      const url = inputToUrl(input);
      if (url.includes("latest_15min_uvindex")) {
        return Promise.resolve({ ok: false, text: () => Promise.resolve("") } as Response);
      }
      return fetchHkoFixture(input);
    });

    const data = await refreshCurrentWeather(DEFAULT_SETTINGS);

    expect(data.current.uvIndex).toBe(4);
    expect(data.current.uvDesc).toBe("中等");
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

  test("localizes issued and cancelled warning notification titles in traditional Chinese", async () => {
    mockState.local.weatherCache = cachedWeather();

    await refreshWeatherWarnings(DEFAULT_SETTINGS);

    expect(notificationAt(0)).toMatchObject({
      title: "天氣警告發出",
      message: "雷暴警告"
    });
    expect(notificationAt(1)).toMatchObject({
      title: "天氣警告取消",
      message: "暴雨警告信號"
    });
  });

  test("localizes extended warning notification titles in traditional Chinese", async () => {
    mockState.local.weatherCache = {
      ...cachedWeather(),
      warnings: [
        thunderstormWarning({
          expireTime: "2026-06-18T02:30:00+08:00",
          updateTime: "2026-06-18T02:00:00+08:00"
        })
      ]
    };

    await refreshWeatherWarnings({
      ...DEFAULT_SETTINGS,
      notifyCancelled: false,
      notifyIssued: false,
      notifyUpdated: true
    });

    expect(mockState.notifications).toHaveLength(1);
    expect(notificationAt(0)).toMatchObject({
      title: "天氣警告延長",
      message: "雷暴警告"
    });
  });

  test("localizes updated warning notification titles in traditional Chinese", async () => {
    mockState.local.weatherCache = {
      ...cachedWeather(),
      warnings: [
        thunderstormWarning({
          expireTime: "2026-06-18T03:30:00+08:00",
          updateTime: "2026-06-18T01:45:00+08:00"
        })
      ]
    };

    await refreshWeatherWarnings({
      ...DEFAULT_SETTINGS,
      notifyCancelled: false,
      notifyExtended: true,
      notifyIssued: false,
      notifyUpdated: true
    });

    expect(mockState.notifications).toHaveLength(1);
    expect(notificationAt(0)).toMatchObject({
      title: "天氣警告更新",
      message: "雷暴警告"
    });
  });

  test("localizes issued warning notification titles in simplified Chinese", async () => {
    mockState.local.weatherCache = {
      ...cachedWeather(),
      language: "sc",
      warnings: []
    };

    await refreshWeatherWarnings({
      ...DEFAULT_SETTINGS,
      language: "sc",
      notifyCancelled: false
    });

    expect(notificationAt(0)).toMatchObject({
      title: "天气警告发出",
      message: "雷暴警告"
    });
  });

  test("sends warning notifications only for selected categories", async () => {
    mockState.local.weatherCache = {
      ...cachedWeather(),
      warnings: []
    };

    await refreshWeatherWarnings({
      ...DEFAULT_SETTINGS,
      notifyCancelled: false,
      notifyWarningCategories: ["thunderstorm"]
    });

    expect(mockState.notifications).toHaveLength(1);
    expect(notificationAt(0)).toMatchObject({
      title: "天氣警告發出",
      message: "雷暴警告"
    });
  });

  test("suppresses issued warning notifications for unselected categories", async () => {
    mockState.local.weatherCache = {
      ...cachedWeather(),
      warnings: []
    };

    await refreshWeatherWarnings({
      ...DEFAULT_SETTINGS,
      notifyWarningCategories: ["rain-amber"]
    });

    expect(mockState.notifications).toHaveLength(0);
  });

  test("suppresses cancelled extended and updated notifications for unselected categories", async () => {
    mockState.local.weatherCache = {
      ...cachedWeather(),
      warnings: [
        thunderstormWarning({
          expireTime: "2026-06-18T02:30:00+08:00",
          updateTime: "2026-06-18T01:45:00+08:00"
        }),
        {
          ...rainWarning("WRAINR"),
          name: "紅色暴雨警告信號"
        }
      ]
    };

    await refreshWeatherWarnings({
      ...DEFAULT_SETTINGS,
      notifyUpdated: true,
      notifyWarningCategories: ["rain-red"]
    });

    expect(mockState.notifications).toHaveLength(1);
    expect(notificationAt(0)).toMatchObject({
      title: "天氣警告取消",
      message: "紅色暴雨警告信號"
    });
  });

  test("filters amber red and black rainstorm warning notifications independently", async () => {
    const cases = [
      { code: "WRAINA", selected: "rain-amber", blocked: "rain-red" },
      { code: "WRAINR", selected: "rain-red", blocked: "rain-black" },
      { code: "WRAINB", selected: "rain-black", blocked: "rain-amber" }
    ] as const;

    for (const { code, selected, blocked } of cases) {
      mockState.local.weatherCache = {
        ...cachedWeather(),
        warnings: []
      };
      mockState.notifications = [];
      vi.mocked(fetch).mockImplementation((input) => {
        const url = new URL(inputToUrl(input));
        if (url.searchParams.get("dataType") === "warnsum") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                WRAIN: {
                  code,
                  issueTime: "2026-06-18T01:30:00+08:00",
                  name: "暴雨警告信號"
                }
              })
          } as Response);
        }
        return fetchHkoFixture(input);
      });

      await refreshWeatherWarnings({
        ...DEFAULT_SETTINGS,
        notifyWarningCategories: [blocked]
      });

      expect(mockState.notifications).toHaveLength(0);

      mockState.local.weatherCache = {
        ...cachedWeather(),
        warnings: []
      };
      mockState.notifications = [];
      await refreshWeatherWarnings({
        ...DEFAULT_SETTINGS,
        notifyWarningCategories: [selected]
      });

      expect(notificationAt(0)).toMatchObject({
        title: "天氣警告發出",
        message: "暴雨警告信號"
      });
    }
  });

  test("partial refresh falls back to full refresh when there is no cached weather", async () => {
    await refreshWeatherWarnings(DEFAULT_SETTINGS);

    expect(fetchDataTypes()).toEqual(["rhrread", "fnd", "warnsum", "warningInfo"]);
  });
});

function fetchHkoFixture(input: string | URL | Request): Promise<Response> {
  const url = new URL(inputToUrl(input));
  if (url.pathname.endsWith("latest_15min_uvindex_uc.csv")) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve("\uFEFF日期 時間,過去十五分鐘平均紫外線指數 202606201800,8.2")
    } as Response);
  }

  const dataType = url.searchParams.get("dataType");

  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(hkoPayload(dataType))
  } as Response);
}

function fetchDataTypes(): string[] {
  return vi
    .mocked(fetch)
    .mock.calls.map(([input]) => new URL(inputToUrl(input)).searchParams.get("dataType"))
    .filter((dataType): dataType is string => Boolean(dataType));
}

function fetchUrls(): string[] {
  return vi.mocked(fetch).mock.calls.map(([input]) => inputToUrl(input));
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
        expireTime: "2026-06-18T03:30:00+08:00",
        issueTime: "2026-06-18T01:30:00+08:00",
        name: "雷暴警告",
        updateTime: "2026-06-18T02:00:00+08:00"
      }
    };
  }

  if (dataType === "warningInfo") {
    return {
      details: [
        {
          contents: ["雷暴警告現正生效。"],
          expireTime: "2026-06-18T03:30:00+08:00",
          issueTime: "2026-06-18T01:30:00+08:00",
          subtype: "雷暴警告",
          updateTime: "2026-06-18T02:00:00+08:00",
          warningStatementCode: "WTS"
        }
      ]
    };
  }

  throw new Error(`Unexpected dataType: ${dataType}`);
}

function fetchHkoWithTropicalCycloneFixture(input: string | URL | Request): Promise<Response> {
  const url = inputToUrl(input);
  if (url === "https://www.weather.gov.hk/wxinfo/currwx/tc_list.xml") {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
          <TropicalCycloneList>
            <TropicalCyclone>
              <TropicalCycloneID>2611</TropicalCycloneID>
              <TropicalCycloneChineseName>米克拉</TropicalCycloneChineseName>
              <TropicalCycloneEnglishName>MEKKHALA</TropicalCycloneEnglishName>
              <TropicalCycloneURL>http://www.weather.gov.hk/wxinfo/currwx/hko_tctrack_2611.xml</TropicalCycloneURL>
            </TropicalCyclone>
            <TropicalCyclone>
              <TropicalCycloneID>2612</TropicalCycloneID>
              <TropicalCycloneChineseName>海高斯</TropicalCycloneChineseName>
              <TropicalCycloneEnglishName>HIGOS</TropicalCycloneEnglishName>
              <TropicalCycloneURL>https://www.weather.gov.hk/wxinfo/currwx/hko_tctrack_2612.xml</TropicalCycloneURL>
            </TropicalCyclone>
          </TropicalCycloneList>`)
    } as Response);
  }

  if (url === "https://www.weather.gov.hk/wxinfo/currwx/hko_tctrack_2611.xml") {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(
          tropicalCycloneTrackXml("2611", "MEKKHALA", "Tropical Storm", 65, 29.7, 130.9)
        )
    } as Response);
  }

  if (url === "https://www.weather.gov.hk/wxinfo/currwx/hko_tctrack_2612.xml") {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(tropicalCycloneTrackXml("2612", "HIGOS", "Tropical Storm", 75, 17.5, 137.1))
    } as Response);
  }

  return fetchHkoFixture(input);
}

function fetchHkoWithUnnamedTropicalCycloneFixture(input: string | URL | Request): Promise<Response> {
  const url = inputToUrl(input);
  if (url === "https://www.weather.gov.hk/wxinfo/currwx/tc_list.xml") {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
          <TropicalCycloneList>
            <TropicalCyclone>
              <TropicalCycloneID>2613</TropicalCycloneID>
              <TropicalCycloneChineseName>熱帶低氣壓</TropicalCycloneChineseName>
              <TropicalCycloneEnglishName>Tropical Depression</TropicalCycloneEnglishName>
              <TropicalCycloneURL>http://www.weather.gov.hk/wxinfo/currwx/hko_tctrack_2613.xml</TropicalCycloneURL>
            </TropicalCyclone>
          </TropicalCycloneList>`)
    } as Response);
  }

  if (url === "https://www.weather.gov.hk/wxinfo/currwx/hko_tctrack_2613.xml") {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(
          tropicalCycloneTrackXml(
            "2613",
            "Tropical Depression",
            "Tropical Depression",
            45,
            14.9,
            116.9
          )
        )
    } as Response);
  }

  return fetchHkoFixture(input);
}

function tropicalCycloneTrackXml(
  id: string,
  name: string,
  intensity: string,
  windKmh: number,
  latitude: number,
  longitude: number
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <TropicalCycloneTrack tcid="${id}">
      <BulletinHeader>
        <BulletinTime>2026-06-27T04:00:18+08:00</BulletinTime>
      </BulletinHeader>
      <WeatherReport>
        <TropicalCycloneName>${name}</TropicalCycloneName>
        <AnalysisInformation>
          <Intensity>${intensity}</Intensity>
          <MaximumWind>${windKmh}km/h</MaximumWind>
          <Time>2026-06-26T18:00:00+00:00</Time>
          <Latitude>${latitude.toFixed(2)}N</Latitude>
          <Longitude>${longitude.toFixed(2)}E</Longitude>
        </AnalysisInformation>
      </WeatherReport>
    </TropicalCycloneTrack>`;
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
      warningMessages: [],
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
    tropicalCyclones: [],
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

function notificationAt(index: number): { message?: string; title?: string } {
  return mockState.notifications[index] as { message?: string; title?: string };
}

function thunderstormWarning(overrides: Partial<WeatherWarning> = {}): WeatherWarning {
  return {
    badge: "雷",
    code: "WTS",
    contents: "",
    expireTime: "2026-06-18T03:30:00+08:00",
    issueTime: "2026-06-18T01:30:00+08:00",
    name: "雷暴警告",
    priority: 30,
    type: "thunderstorm",
    updateTime: "2026-06-18T02:00:00+08:00",
    ...overrides
  };
}

function rainWarning(code: "WRAINA" | "WRAINR" | "WRAINB"): WeatherWarning {
  const badge = code === "WRAINB" ? "黑" : code === "WRAINR" ? "紅" : "黃";
  return {
    badge,
    code,
    contents: "",
    expireTime: "",
    issueTime: "2026-06-18T01:00:00+08:00",
    name: "暴雨警告信號",
    priority: 20,
    type: code === "WRAINB" ? "rain-black" : code === "WRAINR" ? "rain-red" : "rain-amber",
    updateTime: ""
  };
}
