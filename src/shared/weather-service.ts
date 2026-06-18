import { browserApi } from "./browser-api";
import {
  hkoCurrentSchema,
  hkoForecastSchema,
  hkoWarnsumSchema,
  hkoWarningInfoSchema,
  type HkoCurrent,
  type HkoForecast,
  type HkoWarnsum,
  type HkoWarningInfo
} from "./hko-schemas";
import type {
  ForecastDay,
  Language,
  Settings,
  WarningInfo,
  WarningType,
  WeatherData,
  WeatherError,
  WeatherWarning
} from "./types";

export const DEFAULT_SETTINGS: Settings = {
  language: "tc",
  notifyIssued: true,
  notifyCancelled: true,
  notifyExtended: true,
  notifyUpdated: false,
  badgeMode: "auto",
  currentRefreshMinutes: 10,
  warningCheckMinutes: 5
};

export const WARNING_PRIORITY = [
  "WFIREB",
  "WFIRER",
  "WTCSGNL",
  "WTCSGNL1",
  "WTCSGNL3",
  "WTCSGNL8",
  "WTCSGNL9",
  "WTCSGNL10",
  "WRAINB",
  "WRAINR",
  "WRAIN",
  "WTS",
  "WHOT",
  "WCOLD",
  "WFROST",
  "WL",
  "WMSGNL",
  "TC"
] as const;

const API_ROOT = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php";
const STORAGE_KEYS = {
  settings: "settings",
  cache: "weatherCache"
} as const;

export async function getSettings(): Promise<Settings> {
  const stored = await browserApi.storage.sync.get<Partial<Settings>>(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] ?? {}) };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  await browserApi.storage.sync.set({
    [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, ...settings }
  });
}

export async function getCachedWeather(): Promise<WeatherData | null> {
  const stored = await browserApi.storage.local.get<WeatherData>(STORAGE_KEYS.cache);
  return stored[STORAGE_KEYS.cache] ?? null;
}

export async function refreshWeather(settings: Settings | null = null): Promise<WeatherData> {
  const activeSettings = settings ?? (await getSettings());
  const lang = toHkoLang(activeSettings.language);
  const previous = await getCachedWeather();

  try {
    const [current, forecast, warnsum, warningInfo] = await Promise.all([
      fetchHkoJson(`${API_ROOT}?dataType=rhrread&lang=${lang}`, hkoCurrentSchema),
      fetchHkoJson(`${API_ROOT}?dataType=fnd&lang=${lang}`, hkoForecastSchema),
      fetchHkoJson(`${API_ROOT}?dataType=warnsum&lang=${lang}`, hkoWarnsumSchema),
      fetchHkoJson(`${API_ROOT}?dataType=warningInfo&lang=${lang}`, hkoWarningInfoSchema)
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

    await browserApi.storage.local.set({ [STORAGE_KEYS.cache]: data });
    await reconcileWarningNotifications(previous, data, activeSettings);
    return data;
  } catch (error) {
    const cached = previous
      ? {
          ...previous,
          stale: true,
          error: {
            message: errorMessage(error, "Unable to update weather data."),
            at: new Date().toISOString()
          }
        }
      : null;

    if (cached) {
      await browserApi.storage.local.set({ [STORAGE_KEYS.cache]: cached });
      return cached;
    }

    throw error;
  }
}

export async function updateBadge(
  data: WeatherData | null = null,
  settings: Settings | null = null
): Promise<void> {
  const activeSettings = settings ?? (await getSettings());
  const weather = data ?? (await getCachedWeather());

  if (!weather || activeSettings.badgeMode === "off") {
    await browserApi.action.setBadgeText({ text: "" });
    return;
  }

  const warningBadge = getHighestPriorityWarning(weather.warnings)?.badge ?? "";
  const temperatureBadge =
    weather.current.temperature != null ? `${Math.round(weather.current.temperature)}°` : "";

  const text =
    activeSettings.badgeMode === "warning"
      ? warningBadge
      : activeSettings.badgeMode === "temperature"
        ? temperatureBadge
        : warningBadge || temperatureBadge;

  await browserApi.action.setBadgeText({ text: text.slice(0, 4) });
  await browserApi.action.setBadgeBackgroundColor({
    color: warningBadge ? "#b42318" : "#2f5f98"
  });
}

export function getHighestPriorityWarning(warnings: WeatherWarning[] = []): WeatherWarning | null {
  if (!warnings.length) return null;
  return [...warnings].sort((a, b) => b.priority - a.priority)[0] ?? null;
}

interface NormalizeWeatherInput {
  current: HkoCurrent;
  forecast: HkoForecast;
  warnsum: HkoWarnsum;
  warningInfo: HkoWarningInfo;
  settings: Pick<Settings, "language">;
  fetchedAt: string;
  stale: boolean;
  error: WeatherError | null;
}

export function normalizeWeather({
  current,
  forecast,
  warnsum,
  warningInfo,
  settings,
  fetchedAt,
  stale,
  error
}: NormalizeWeatherInput): WeatherData {
  const warnings = normalizeWarnings(warnsum, warningInfo);
  return {
    language: settings.language,
    fetchedAt,
    stale,
    error,
    current: {
      temperature: firstNumber(current.temperature?.data, "value"),
      humidity: firstNumber(current.humidity?.data, "value"),
      uvIndex: current.uvindex?.data?.[0]?.value ?? null,
      uvDesc: current.uvindex?.data?.[0]?.desc ?? "",
      rainfall: firstNumber(current.rainfall?.data, "max"),
      icon: current.icon?.[0] ?? null,
      summary: current.iconUpdateTime
        ? text("Weather data updated", "天氣資料已更新", settings.language)
        : "",
      tips: asStringArray(current.specialWxTips),
      forecast: current.forecastDesc || current.generalSituation || "",
      warningSummary: warnings.map((warning) => warning.name).join(", ")
    },
    forecast: asArray(forecast.weatherForecast)
      .slice(0, 9)
      .map<ForecastDay>((item) => ({
        date: item.forecastDate || "",
        weekday: item.week || "",
        icon: item.ForecastIcon ?? null,
        minTemp: item.forecastMintemp?.value ?? null,
        maxTemp: item.forecastMaxtemp?.value ?? null,
        humidity: formatHumidityRange(item),
        text: item.forecastWeather || "",
        wind: item.forecastWind || ""
      })),
    warnings,
    warningInfo: asArray(warningInfo.details).map<WarningInfo>((item) => ({
      code: item.warningStatementCode || "",
      name: item.subtype || item.warningStatementCode || "",
      contents: asStringArray(item.contents).join("\n"),
      issueTime: item.issueTime || "",
      updateTime: item.updateTime || "",
      expireTime: item.expireTime || ""
    }))
  };
}

function normalizeWarnings(
  warnsum: HkoWarnsum = {},
  warningInfo: HkoWarningInfo = {}
): WeatherWarning[] {
  const infoByCode = new Map(
    asArray(warningInfo.details).map((item) => [item.warningStatementCode, item])
  );

  return Object.entries(warnsum)
    .map<WeatherWarning>(([code, item]) => {
      const warningCode = item.code || code;
      const info = infoByCode.get(code);
      const warningName = [item.type, item.name || info?.subtype || ""].filter(Boolean).join("");
      const type = warningType(warningCode, warningName);
      return {
        code: warningCode,
        type,
        name: item.name || info?.subtype || code,
        badge: warningBadge(warningCode, warningName),
        priority: warningPriority(warningCode),
        issueTime: item.issueTime || info?.issueTime || "",
        updateTime: item.updateTime || info?.updateTime || "",
        expireTime: item.expireTime || info?.expireTime || "",
        contents: asStringArray(info?.contents).join("\n")
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

async function reconcileWarningNotifications(
  previous: WeatherData | null,
  next: WeatherData,
  settings: Settings
): Promise<void> {
  const previousCodes = new Set(previous?.warnings.map((item) => item.code) ?? []);
  const nextCodes = new Set(next.warnings.map((item) => item.code));

  if (settings.notifyIssued) {
    for (const warning of next.warnings) {
      if (!previousCodes.has(warning.code)) {
        await notify("Weather warning issued", warning.name);
      }
    }
  }

  if (settings.notifyCancelled && previous?.warnings.length) {
    for (const warning of previous.warnings) {
      if (!nextCodes.has(warning.code)) {
        await notify("Weather warning cancelled", warning.name);
      }
    }
  }

  const previousByCode = new Map(previous?.warnings.map((item) => [item.code, item]) ?? []);
  for (const warning of next.warnings) {
    const old = previousByCode.get(warning.code);
    if (!old) continue;

    if (
      settings.notifyExtended &&
      warning.expireTime &&
      old.expireTime &&
      warning.expireTime !== old.expireTime
    ) {
      await notify("Weather warning extended", warning.name);
    } else if (
      settings.notifyUpdated &&
      warning.updateTime &&
      old.updateTime &&
      warning.updateTime !== old.updateTime
    ) {
      await notify("Weather warning updated", warning.name);
    }
  }
}

async function notify(title: string, message: string): Promise<void> {
  try {
    await browserApi.notifications.create({
      type: "basic",
      title,
      message,
      iconUrl: browserApi.runtime.getUrl("assets/generated/weather-mark-128.png")
    });
  } catch {
    // Notifications may be unavailable in some extension contexts.
  }
}

async function fetchHkoJson<T>(url: string, schema: { parse: (value: unknown) => T }): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HKO request failed: ${response.status}`);
  }
  return schema.parse(await response.json());
}

function toHkoLang(language: Language): Language {
  if (language === "en") return "en";
  if (language === "sc") return "sc";
  return "tc";
}

function warningPriority(code: string): number {
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

function warningBadge(code: string, name: string): string {
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

function warningType(code: string, name: string): WarningType {
  const value = `${code} ${name}`.toUpperCase();
  if (value.includes("WRAINB")) return "rain-black";
  if (value.includes("WRAINR")) return "rain-red";
  if (value.includes("WRAINA")) return "rain-amber";
  if (
    value.includes("TC") ||
    value.includes("TROPICAL") ||
    value.includes("颱") ||
    value.includes("風")
  ) {
    return "typhoon";
  }
  if (value.includes("BLACK") || value.includes("黑")) return "rain-black";
  if (value.includes("RED") || value.includes("紅")) return "rain-red";
  if (value.includes("AMBER") || value.includes("黃")) return "rain-amber";
  if (value.includes("TS") || value.includes("THUNDER") || value.includes("雷")) {
    return "thunderstorm";
  }
  if (value.includes("HOT") || value.includes("熱")) return "heat";
  if (value.includes("COLD") || value.includes("冷")) return "cold";
  return "other";
}

function formatHumidityRange(item: NonNullable<HkoForecast["weatherForecast"]>[number]): string {
  const min = item.forecastMinrh?.value;
  const max = item.forecastMaxrh?.value;
  if (min == null && max == null) return "";
  if (min == null) return `${max}%`;
  if (max == null) return `${min}%`;
  return `${min}-${max}%`;
}

function firstNumber<T extends string>(
  items: Array<Partial<Record<T, number>>> | undefined,
  key: T
): number | null {
  const match = asArray(items).find((item) => typeof item[key] === "number");
  return match?.[key] ?? null;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

function asStringArray(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function text(en: string, tc: string, language: Language): string {
  return language === "en" ? en : tc;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
