import { browserApi } from "./shared/browser-api";
import {
  getSettings,
  refreshCurrentWeather,
  refreshForecast,
  refreshWeather,
  refreshWeatherWarnings,
  sendTestNotification,
  updateBadge
} from "./shared/weather-service";
import type { Language, WeatherData } from "./shared/types";

const FORECAST_REFRESH_MINUTES = 120;

browserApi.runtime.onInstalled(async () => {
  await scheduleRefreshes();
  await refreshAndBadge();
});

browserApi.runtime.onStartup(async () => {
  await scheduleRefreshes();
  await refreshAndBadge();
});

browserApi.storage.onChanged(async (changes, areaName) => {
  if (areaName === "sync" && changes.settings) {
    await scheduleRefreshes();
    await updateBadge();
  }
});

browserApi.alarms.onAlarm(async (alarm) => {
  if (alarm.name === "current-weather") {
    await refreshCurrentAndBadge();
  } else if (alarm.name === "weather-forecast") {
    await refreshForecastAndBadge();
  } else if (alarm.name === "weather-warnings") {
    await refreshWarningsAndBadge();
  }
});

interface RefreshWeatherMessage {
  language?: Language;
  type?: string;
}

type RuntimeMessageResponse =
  | { ok: true; data: WeatherData }
  | { ok: true }
  | { ok: false; error: string };

browserApi.runtime.onMessage<RefreshWeatherMessage, RuntimeMessageResponse>(async (message) => {
  if (message?.type === "refreshWeather") {
    try {
      return { ok: true, data: await refreshAndBadge() };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Refresh failed"
      };
    }
  }
  if (message?.type === "testNotification") {
    try {
      const language = isLanguage(message.language)
        ? message.language
        : (await getSettings()).language;
      await sendTestNotification(language);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Notification test failed"
      };
    }
  }
  return undefined;
});

function isLanguage(value: unknown): value is Language {
  return value === "tc" || value === "sc" || value === "en";
}

async function scheduleRefreshes(): Promise<void> {
  const settings = await getSettings();
  await browserApi.alarms.create("current-weather", {
    periodInMinutes: Math.max(10, Number(settings.currentRefreshMinutes) || 15)
  });
  await browserApi.alarms.create("weather-forecast", {
    periodInMinutes: FORECAST_REFRESH_MINUTES
  });
  await browserApi.alarms.create("weather-warnings", {
    periodInMinutes: Math.max(5, Number(settings.warningCheckMinutes) || 5)
  });
}

async function refreshAndBadge(): Promise<WeatherData> {
  const settings = await getSettings();
  const data = await refreshWeather(settings);
  await updateBadge(data, settings);
  return data;
}

async function refreshCurrentAndBadge(): Promise<WeatherData> {
  const settings = await getSettings();
  const data = await refreshCurrentWeather(settings);
  await updateBadge(data, settings);
  return data;
}

async function refreshForecastAndBadge(): Promise<WeatherData> {
  const settings = await getSettings();
  const data = await refreshForecast(settings);
  await updateBadge(data, settings);
  return data;
}

async function refreshWarningsAndBadge(): Promise<WeatherData> {
  const settings = await getSettings();
  const data = await refreshWeatherWarnings(settings);
  await updateBadge(data, settings);
  return data;
}
