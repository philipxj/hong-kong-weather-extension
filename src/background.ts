import { browserApi } from "./shared/browser-api";
import { getSettings, refreshWeather, updateBadge } from "./shared/weather-service";
import type { WeatherData } from "./shared/types";

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
  if (alarm.name === "current-weather" || alarm.name === "weather-warnings") {
    await refreshAndBadge();
  }
});

interface RefreshWeatherMessage {
  type?: string;
}

type RefreshWeatherResponse = { ok: true; data: WeatherData } | { ok: false; error: string };

browserApi.runtime.onMessage<RefreshWeatherMessage, RefreshWeatherResponse>(async (message) => {
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
  return undefined;
});

async function scheduleRefreshes(): Promise<void> {
  const settings = await getSettings();
  await browserApi.alarms.create("current-weather", {
    periodInMinutes: Math.max(5, Number(settings.currentRefreshMinutes) || 10)
  });
  await browserApi.alarms.create("weather-warnings", {
    periodInMinutes: Math.max(3, Number(settings.warningCheckMinutes) || 5)
  });
}

async function refreshAndBadge(): Promise<WeatherData> {
  const settings = await getSettings();
  const data = await refreshWeather(settings);
  await updateBadge(data, settings);
  return data;
}
