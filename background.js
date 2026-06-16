import { getSettings, refreshWeather, updateBadge } from "./shared/weather-service.js";

chrome.runtime.onInstalled.addListener(async () => {
  await scheduleRefreshes();
  await refreshAndBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await scheduleRefreshes();
  await refreshAndBadge();
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "sync" && changes.settings) {
    await scheduleRefreshes();
    await updateBadge();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "current-weather" || alarm.name === "weather-warnings") {
    await refreshAndBadge();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "refreshWeather") {
    refreshAndBadge()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Refresh failed" }));
    return true;
  }
  return false;
});

async function scheduleRefreshes() {
  const settings = await getSettings();
  await chrome.alarms.create("current-weather", {
    periodInMinutes: Math.max(5, Number(settings.currentRefreshMinutes) || 10)
  });
  await chrome.alarms.create("weather-warnings", {
    periodInMinutes: Math.max(3, Number(settings.warningCheckMinutes) || 5)
  });
}

async function refreshAndBadge() {
  const settings = await getSettings();
  const data = await refreshWeather(settings);
  await updateBadge(data, settings);
  return data;
}
