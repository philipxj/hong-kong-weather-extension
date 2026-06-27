import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Settings, WeatherData } from "../src/shared/types";

type MessageHandler = (message: { type?: string }) => unknown;

const mockBrowserApi = vi.hoisted(() => ({
  messageHandler: null as MessageHandler | null
}));

const mockWeatherService = vi.hoisted(() => ({
  getSettings: vi.fn(),
  refreshCurrentWeather: vi.fn(),
  refreshForecast: vi.fn(),
  refreshWeather: vi.fn(),
  refreshWeatherWarnings: vi.fn(),
  updateBadge: vi.fn()
}));

vi.mock("../src/shared/browser-api", () => ({
  browserApi: {
    alarms: {
      create: vi.fn(),
      onAlarm: vi.fn()
    },
    runtime: {
      onInstalled: vi.fn(),
      onMessage: vi.fn((handler: MessageHandler) => {
        mockBrowserApi.messageHandler = handler;
      }),
      onStartup: vi.fn()
    },
    storage: {
      onChanged: vi.fn()
    }
  }
}));

vi.mock("../src/shared/weather-service", () => mockWeatherService);

describe("background refresh coalescing", () => {
  beforeEach(() => {
    vi.resetModules();
    mockBrowserApi.messageHandler = null;
    mockWeatherService.getSettings.mockResolvedValue(settings());
    mockWeatherService.refreshCurrentWeather.mockReset();
    mockWeatherService.refreshForecast.mockReset();
    mockWeatherService.refreshWeather.mockReset();
    mockWeatherService.refreshWeatherWarnings.mockReset();
    mockWeatherService.updateBadge.mockResolvedValue(undefined);
  });

  test("shares simultaneous full refresh messages", async () => {
    const data = weatherData();
    let finishRefresh!: (data: WeatherData) => void;
    mockWeatherService.refreshWeather.mockReturnValue(
      new Promise<WeatherData>((resolve) => {
        finishRefresh = resolve;
      })
    );

    await import("../src/background");
    const handler = mockBrowserApi.messageHandler;
    if (!handler) throw new Error("Missing runtime message handler");

    const first = Promise.resolve(handler({ type: "refreshWeather" }));
    const second = Promise.resolve(handler({ type: "refreshWeather" }));

    await vi.waitFor(() => expect(mockWeatherService.refreshWeather).toHaveBeenCalledOnce());
    finishRefresh(data);

    await expect(first).resolves.toEqual({ ok: true, data });
    await expect(second).resolves.toEqual({ ok: true, data });
    expect(mockWeatherService.updateBadge).toHaveBeenCalledOnce();
  });
});

function settings(): Settings {
  return {
    badgeMode: "auto",
    currentRefreshMinutes: 15,
    language: "tc",
    notifyCancelled: true,
    notifyExtended: true,
    notifyIssued: true,
    notifyUpdated: false,
    notifyWarningCategories: [
      "rain-amber",
      "rain-red",
      "rain-black",
      "typhoon",
      "thunderstorm",
      "heat",
      "cold",
      "landslip",
      "flooding",
      "monsoon",
      "frost",
      "fire",
      "tsunami",
      "other"
    ],
    warningCheckMinutes: 5
  };
}

function weatherData(): WeatherData {
  return {
    current: {
      forecast: "",
      humidity: 87,
      icon: 64,
      rainfall: null,
      summary: "",
      temperature: 28,
      tips: [],
      uvDesc: "低",
      uvIndex: 0.4,
      warningMessages: [],
      warningSummary: ""
    },
    error: null,
    fetchedAt: "2026-06-18T04:00:00.000Z",
    forecast: [],
    language: "tc",
    stale: false,
    tropicalCyclones: [],
    warningInfo: [],
    warnings: []
  };
}
