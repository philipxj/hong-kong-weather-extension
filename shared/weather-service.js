export const DEFAULT_SETTINGS = {
  language: "tc",
  notifyIssued: true,
  notifyCancelled: true,
  notifyExtended: true,
  notifyUpdated: false,
  badgeMode: "auto",
  compactMode: true,
  currentRefreshMinutes: 10,
  warningCheckMinutes: 5
};

export const WARNING_PRIORITY = [
  "WFIREB", "WFIRER", "WTCSGNL", "WTCSGNL1", "WTCSGNL3", "WTCSGNL8", "WTCSGNL9", "WTCSGNL10",
  "WRAINB", "WRAINR", "WRAIN", "WTS", "WHOT", "WCOLD", "WFROST", "WL", "WMSGNL", "TC"
];

const API_ROOT = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php";
const STORAGE_KEYS = {
  settings: "settings",
  cache: "weatherCache"
};

export async function getSettings() {
  const stored = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] || {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, ...settings }
  });
}

export async function getCachedWeather() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.cache);
  return stored[STORAGE_KEYS.cache] || null;
}

export async function refreshWeather(settings = null) {
  const activeSettings = settings || await getSettings();
  const lang = toHkoLang(activeSettings.language);
  const previous = await getCachedWeather();

  try {
    const [current, forecast, warnsum, warningInfo] = await Promise.all([
      fetchJson(`${API_ROOT}?dataType=rhrread&lang=${lang}`),
      fetchJson(`${API_ROOT}?dataType=fnd&lang=${lang}`),
      fetchJson(`${API_ROOT}?dataType=warnsum&lang=${lang}`),
      fetchJson(`${API_ROOT}?dataType=warningInfo&lang=${lang}`)
    ]);

    const data = normalizeWeather({
      current,
      forecast,
      warnsum,
      warningInfo,
      settings: activeSettings,
      fetchedAt: new Date().toISOString(),
      stale: false,
      error: null
    });

    await chrome.storage.local.set({ [STORAGE_KEYS.cache]: data });
    await reconcileWarningNotifications(previous, data, activeSettings);
    return data;
  } catch (error) {
    const cached = previous ? {
      ...previous,
      stale: true,
      error: {
        message: error?.message || "Unable to update weather data.",
        at: new Date().toISOString()
      }
    } : null;

    if (cached) {
      await chrome.storage.local.set({ [STORAGE_KEYS.cache]: cached });
      return cached;
    }

    throw error;
  }
}

export async function updateBadge(data = null, settings = null) {
  const activeSettings = settings || await getSettings();
  const weather = data || await getCachedWeather();

  if (!weather || activeSettings.badgeMode === "off") {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  const warningBadge = getHighestPriorityWarning(weather.warnings)?.badge || "";
  const temperatureBadge = weather.current.temperature != null
    ? `${Math.round(weather.current.temperature)}°`
    : "";

  const text = activeSettings.badgeMode === "warning"
    ? warningBadge
    : activeSettings.badgeMode === "temperature"
      ? temperatureBadge
      : warningBadge || temperatureBadge;

  await chrome.action.setBadgeText({ text: text.slice(0, 4) });
  await chrome.action.setBadgeBackgroundColor({
    color: warningBadge ? "#b42318" : "#2f5f98"
  });
}

export function getHighestPriorityWarning(warnings = []) {
  if (!warnings.length) return null;
  return [...warnings].sort((a, b) => b.priority - a.priority)[0];
}

export function normalizeWeather({ current, forecast, warnsum, warningInfo, settings, fetchedAt, stale, error }) {
  const warnings = normalizeWarnings(warnsum, warningInfo);
  return {
    language: settings.language,
    fetchedAt,
    stale,
    error,
    current: {
      temperature: firstNumber(current?.temperature?.data, "value"),
      humidity: firstNumber(current?.humidity?.data, "value"),
      uvIndex: current?.uvindex?.data?.[0]?.value ?? null,
      uvDesc: current?.uvindex?.data?.[0]?.desc ?? "",
      rainfall: firstNumber(current?.rainfall?.data, "max"),
      icon: current?.icon?.[0] ?? null,
      summary: current?.iconUpdateTime ? text("Weather data updated", "天氣資料已更新", settings.language) : "",
      tips: asArray(current?.specialWxTips),
      forecast: current?.forecastDesc || current?.generalSituation || "",
      warningSummary: warnings.map((warning) => warning.name).join(", ")
    },
    forecast: asArray(forecast?.weatherForecast).slice(0, 9).map((item) => ({
      date: item.forecastDate || "",
      weekday: item.week || "",
      icon: item.ForecastIcon || null,
      minTemp: item.forecastMintemp?.value ?? null,
      maxTemp: item.forecastMaxtemp?.value ?? null,
      humidity: formatHumidityRange(item),
      text: item.forecastWeather || "",
      wind: item.forecastWind || ""
    })),
    warnings,
    warningInfo: asArray(warningInfo?.details).map((item) => ({
      code: item.warningStatementCode || "",
      name: item.subtype || item.warningStatementCode || "",
      contents: asArray(item.contents).join("\n"),
      issueTime: item.issueTime || "",
      updateTime: item.updateTime || "",
      expireTime: item.expireTime || ""
    }))
  };
}

function normalizeWarnings(warnsum = {}, warningInfo = {}) {
  const infoByCode = new Map(asArray(warningInfo.details).map((item) => [
    item.warningStatementCode,
    item
  ]));

  return Object.entries(warnsum || {}).map(([code, item]) => {
    const info = infoByCode.get(code) || {};
    const type = warningType(code, item.name || info.subtype || "");
    return {
      code,
      type,
      name: item.name || info.subtype || code,
      badge: warningBadge(code, item.name || ""),
      priority: warningPriority(code),
      issueTime: item.issueTime || info.issueTime || "",
      updateTime: item.updateTime || info.updateTime || "",
      expireTime: item.expireTime || info.expireTime || "",
      contents: asArray(info.contents).join("\n")
    };
  }).sort((a, b) => b.priority - a.priority);
}

async function reconcileWarningNotifications(previous, next, settings) {
  const previousCodes = new Set(previous?.warnings?.map((item) => item.code) || []);
  const nextCodes = new Set(next?.warnings?.map((item) => item.code) || []);

  if (settings.notifyIssued) {
    for (const warning of next.warnings) {
      if (!previousCodes.has(warning.code)) {
        await notify(`Weather warning issued`, warning.name);
      }
    }
  }

  if (settings.notifyCancelled && previous?.warnings?.length) {
    for (const warning of previous.warnings) {
      if (!nextCodes.has(warning.code)) {
        await notify(`Weather warning cancelled`, warning.name);
      }
    }
  }

  const previousByCode = new Map(previous?.warnings?.map((item) => [item.code, item]) || []);
  for (const warning of next.warnings) {
    const old = previousByCode.get(warning.code);
    if (!old) continue;

    if (settings.notifyExtended && warning.expireTime && old.expireTime && warning.expireTime !== old.expireTime) {
      await notify(`Weather warning extended`, warning.name);
    } else if (settings.notifyUpdated && warning.updateTime && old.updateTime && warning.updateTime !== old.updateTime) {
      await notify(`Weather warning updated`, warning.name);
    }
  }
}

async function notify(title, message) {
  try {
    await chrome.notifications.create({
      type: "basic",
      title,
      message,
      iconUrl: chrome.runtime.getURL("assets/weather-mark.svg")
    });
  } catch {
    // Notifications may be unavailable in some extension contexts.
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HKO request failed: ${response.status}`);
  }
  return response.json();
}

function toHkoLang(language) {
  if (language === "en") return "en";
  if (language === "sc") return "sc";
  return "tc";
}

function warningPriority(code) {
  const normalized = code.toUpperCase();
  if (normalized.includes("10")) return 100;
  if (normalized.includes("9")) return 95;
  if (normalized.includes("8")) return 90;
  if (normalized.includes("RAIN") && normalized.includes("B")) return 86;
  if (normalized.includes("RAIN") && normalized.includes("R")) return 82;
  if (normalized.includes("TC")) return 70;
  if (normalized.includes("TS")) return 60;
  if (normalized.includes("HOT")) return 50;
  if (normalized.includes("COLD")) return 45;
  return 20;
}

function warningBadge(code, name) {
  const value = `${code} ${name}`.toUpperCase();
  if (value.includes("WRAINB")) return "黑";
  if (value.includes("WRAINR")) return "紅";
  if (value.includes("WRAINA")) return "黃";
  if (value.includes("10")) return "T10";
  if (value.includes("9")) return "T9";
  if (value.includes("8")) return "T8";
  if (value.includes("3")) return "T3";
  if (value.includes("1")) return "T1";
  if (value.includes("BLACK") || value.includes("黑")) return "黑";
  if (value.includes("RED") || value.includes("紅")) return "紅";
  if (value.includes("AMBER") || value.includes("黃")) return "黃";
  if (value.includes("TS") || value.includes("雷")) return "雷";
  if (value.includes("HOT") || value.includes("熱")) return "熱";
  if (value.includes("COLD") || value.includes("冷")) return "冷";
  return code.replace(/^W/, "").slice(0, 3);
}

function warningType(code, name) {
  const value = `${code} ${name}`.toUpperCase();
  if (value.includes("WRAINB")) return "rain-black";
  if (value.includes("WRAINR")) return "rain-red";
  if (value.includes("WRAINA")) return "rain-amber";
  if (value.includes("TC") || value.includes("TROPICAL") || value.includes("颱") || value.includes("風")) return "typhoon";
  if (value.includes("BLACK") || value.includes("黑")) return "rain-black";
  if (value.includes("RED") || value.includes("紅")) return "rain-red";
  if (value.includes("AMBER") || value.includes("黃")) return "rain-amber";
  if (value.includes("TS") || value.includes("THUNDER") || value.includes("雷")) return "thunderstorm";
  if (value.includes("HOT") || value.includes("熱")) return "heat";
  if (value.includes("COLD") || value.includes("冷")) return "cold";
  return "other";
}

function formatHumidityRange(item) {
  const min = item.forecastMinrh?.value;
  const max = item.forecastMaxrh?.value;
  if (min == null && max == null) return "";
  if (min == null) return `${max}%`;
  if (max == null) return `${min}%`;
  return `${min}-${max}%`;
}

function firstNumber(items, key) {
  const match = asArray(items).find((item) => typeof item?.[key] === "number");
  return match?.[key] ?? null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function text(en, tc, language) {
  return language === "en" ? en : tc;
}
