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
  CurrentWeather,
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
  currentRefreshMinutes: 15,
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
const HKO_ICON_BASE = "https://www.hko.gov.hk/images/wxicon";
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
    return cacheRefreshError(previous, error, activeSettings.language);
  }
}

export async function refreshCurrentWeather(
  settings: Settings | null = null
): Promise<WeatherData> {
  const activeSettings = settings ?? (await getSettings());
  const lang = toHkoLang(activeSettings.language);
  const previous = await getCachedWeather();

  if (!previous || previous.language !== activeSettings.language) {
    return refreshWeather(activeSettings);
  }

  try {
    const current = await fetchHkoJson(
      `${API_ROOT}?dataType=rhrread&lang=${lang}`,
      hkoCurrentSchema
    );

    const data: WeatherData = {
      ...previous,
      language: activeSettings.language,
      fetchedAt: new Date().toISOString(),
      stale: false,
      error: null,
      current: normalizeCurrentWeather(current, previous.warnings, activeSettings)
    };

    await browserApi.storage.local.set({ [STORAGE_KEYS.cache]: data });
    return data;
  } catch (error) {
    return cacheRefreshError(previous, error, activeSettings.language);
  }
}

export async function refreshForecast(settings: Settings | null = null): Promise<WeatherData> {
  const activeSettings = settings ?? (await getSettings());
  const lang = toHkoLang(activeSettings.language);
  const previous = await getCachedWeather();

  if (!previous || previous.language !== activeSettings.language) {
    return refreshWeather(activeSettings);
  }

  try {
    const forecast = await fetchHkoJson(`${API_ROOT}?dataType=fnd&lang=${lang}`, hkoForecastSchema);

    const data: WeatherData = {
      ...previous,
      language: activeSettings.language,
      fetchedAt: new Date().toISOString(),
      stale: false,
      error: null,
      forecast: normalizeForecast(forecast)
    };

    await browserApi.storage.local.set({ [STORAGE_KEYS.cache]: data });
    return data;
  } catch (error) {
    return cacheRefreshError(previous, error, activeSettings.language);
  }
}

export async function refreshWeatherWarnings(
  settings: Settings | null = null
): Promise<WeatherData> {
  const activeSettings = settings ?? (await getSettings());
  const lang = toHkoLang(activeSettings.language);
  const previous = await getCachedWeather();

  if (!previous || previous.language !== activeSettings.language) {
    return refreshWeather(activeSettings);
  }

  try {
    const [warnsum, warningInfo] = await Promise.all([
      fetchHkoJson(`${API_ROOT}?dataType=warnsum&lang=${lang}`, hkoWarnsumSchema),
      fetchHkoJson(`${API_ROOT}?dataType=warningInfo&lang=${lang}`, hkoWarningInfoSchema)
    ]);
    const warnings = normalizeWarnings(warnsum, warningInfo);
    const data: WeatherData = {
      ...previous,
      language: activeSettings.language,
      fetchedAt: new Date().toISOString(),
      stale: false,
      error: null,
      current: {
        ...previous.current,
        warningSummary: warnings.map((warning) => warning.name).join(", ")
      },
      warnings,
      warningInfo: normalizeWarningInfo(warningInfo)
    };

    await browserApi.storage.local.set({ [STORAGE_KEYS.cache]: data });
    await reconcileWarningNotifications(previous, data, activeSettings);
    return data;
  } catch (error) {
    return cacheRefreshError(previous, error, activeSettings.language);
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

  const highestWarning = getHighestPriorityWarning(getSignalWarnings(weather.warnings));
  const warningBadge = highestWarning
    ? formatWarningBadgeForLanguage(highestWarning, weather.language)
    : "";
  const warningColorBadge = highestWarning?.badge ?? "";
  const temperatureBadge = formatTemperatureBadge(weather.current.temperature);

  const text = formatActionBadgeText(activeSettings.badgeMode, warningBadge, temperatureBadge);

  await browserApi.action.setBadgeText({ text: text.slice(0, 4) });
  await browserApi.action.setBadgeBackgroundColor({
    color: badgeBackgroundColor(warningColorBadge)
  });
  await browserApi.action.setBadgeTextColor({
    color: badgeTextColor(warningColorBadge)
  });
  await browserApi.action.setTitle({
    title: formatActionTitle(weather, warningBadge, temperatureBadge)
  });
  await updateActionIcon(weather.current.icon);
}

export async function sendTestNotification(language: Language): Promise<NotificationTestResult> {
  const copy = notificationCopy(language);
  const permission = await browserApi.notifications.getPermissionLevel();
  if (permission !== "granted") {
    throw new Error(`Notifications are ${permission}.`);
  }

  const id = await createTestNotification(copy.testTitle, copy.testMessage);
  const activeNotifications = await browserApi.notifications.getAll();
  return {
    id,
    permission,
    visibleInChrome: Boolean(activeNotifications[id])
  };
}

export function getHighestPriorityWarning(warnings: WeatherWarning[] = []): WeatherWarning | null {
  if (!warnings.length) return null;
  return [...warnings].sort((a, b) => b.priority - a.priority)[0] ?? null;
}

export function getSignalWarnings(warnings: WeatherWarning[] = []): WeatherWarning[] {
  return warnings.filter((warning) => warning.type !== "other");
}

export function formatActionBadgeText(
  badgeMode: Settings["badgeMode"],
  warningBadge: string,
  temperatureBadge: string
): string {
  if (badgeMode === "warning") return warningBadge;
  if (badgeMode === "temperature") return temperatureBadge;
  return formatAutoBadgeText(warningBadge, temperatureBadge);
}

export function badgeBackgroundColor(warningBadge: string): string {
  if (warningBadge === "黑") return "#111111";
  if (warningBadge === "紅") return "#df1d1d";
  if (warningBadge === "黃") return "#ffd84d";
  if (warningBadge) return "#b42318";
  return "#2f5f98";
}

export function badgeTextColor(warningBadge: string): string {
  if (warningBadge === "黃") return "#5c4300";
  return "#ffffff";
}

export function formatWarningBadgeForLanguage(
  warning: Pick<WeatherWarning, "badge" | "code" | "type">,
  language: Language
): string {
  if (language !== "en") {
    if (language === "sc" && warning.badge === "熱") return "热";
    if (language === "sc" && warning.badge === "海嘯") return "海啸";
    return warning.badge;
  }

  if (warning.type === "rain-black") return "Blk";
  if (warning.type === "rain-red") return "Red";
  if (warning.type === "rain-amber") return "Amb";
  if (warning.type === "thunderstorm") return "TS";
  if (warning.type === "landslip") return "LS";
  if (warning.type === "flooding") return "Fld";
  if (warning.type === "monsoon") return "Mon";
  if (warning.type === "frost") return "Frst";
  if (warning.type === "fire-yellow" || warning.type === "fire-red") return "Fire";
  if (warning.type === "heat") return "Hot";
  if (warning.type === "cold") return "Cold";
  if (warning.type === "tsunami") return "Tsu";
  if (warning.type === "typhoon" && warning.badge) return warning.badge;

  return warning.code.replace(/^W/, "").slice(0, 4);
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

export interface NotificationTestResult {
  id: string;
  permission: string;
  visibleInChrome: boolean;
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
    current: normalizeCurrentWeather(current, warnings, settings),
    forecast: normalizeForecast(forecast),
    warnings,
    warningInfo: normalizeWarningInfo(warningInfo)
  };
}

function normalizeCurrentWeather(
  current: HkoCurrent,
  warnings: WeatherWarning[],
  settings: Pick<Settings, "language">
): CurrentWeather {
  return {
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
    warningMessages: asStringArray(current.warningMessage),
    forecast: current.forecastDesc || current.generalSituation || "",
    warningSummary: warnings.map((warning) => warning.name).join(", ")
  };
}

function normalizeForecast(forecast: HkoForecast): ForecastDay[] {
  return asArray(forecast.weatherForecast)
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
    }));
}

function normalizeWarningInfo(warningInfo: HkoWarningInfo): WarningInfo[] {
  return asArray(warningInfo.details).map<WarningInfo>((item) => ({
    code: item.warningStatementCode || "",
    name: item.subtype || item.warningStatementCode || "",
    contents: asStringArray(item.contents).join("\n"),
    issueTime: item.issueTime || "",
    updateTime: item.updateTime || "",
    expireTime: item.expireTime || ""
  }));
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

async function cacheRefreshError(
  previous: WeatherData | null,
  error: unknown,
  language?: Language
): Promise<WeatherData> {
  if (!previous || (language && previous.language !== language)) {
    throw error;
  }

  const cached = {
    ...previous,
    stale: true,
    error: {
      message: errorMessage(error, "Unable to update weather data."),
      at: new Date().toISOString()
    }
  };

  await browserApi.storage.local.set({ [STORAGE_KEYS.cache]: cached });
  return cached;
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
    await createNotification(title, message);
  } catch {
    // Notifications may be unavailable in some extension contexts.
  }
}

async function createNotification(title: string, message: string): Promise<void> {
  await browserApi.notifications.create({
    type: "basic",
    title,
    message,
    iconUrl: browserApi.runtime.getUrl("assets/generated/weather-mark-128.png")
  });
}

async function createTestNotification(title: string, message: string): Promise<string> {
  return browserApi.notifications.createWithId("hk-weather-alerts-test", {
    type: "basic",
    title,
    message,
    iconUrl: browserApi.runtime.getUrl("assets/generated/weather-mark-128.png"),
    priority: 2,
    requireInteraction: true
  });
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
  if (normalized === "WL") return 78;
  if (normalized.includes("MSGNL")) return 74;
  if (normalized.includes("TC")) return 70;
  if (normalized.includes("FNTSA") || normalized.includes("FLOOD")) return 58;
  if (normalized.includes("TS")) return 60;
  if (normalized.includes("FROST")) return 55;
  if (normalized.includes("FIRE")) return 53;
  if (normalized.includes("HOT")) return 50;
  if (normalized.includes("COLD")) return 45;
  if (normalized.includes("TMW")) return 88;
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
  if (isLandslipWarning(code, name)) return "山";
  if (isFloodingWarning(code, name)) return "水";
  if (isMonsoonWarning(code, name)) return "季";
  if (isFrostWarning(code, name)) return "霜";
  if (isFireDangerWarning(code, name)) return "火";
  if (isTsunamiWarning(code, name)) return "海嘯";
  if (value.includes("BLACK") || value.includes("黑")) return "黑";
  if (value.includes("RED") || value.includes("紅")) return "紅";
  if (value.includes("AMBER") || value.includes("黃")) return "黃";
  if (isThunderstormWarning(code, name)) return "雷";
  if (value.includes("HOT") || value.includes("熱")) return "熱";
  if (value.includes("COLD") || value.includes("冷")) return "冷";
  return code.replace(/^W/, "").slice(0, 3);
}

function warningType(code: string, name: string): WarningType {
  const value = `${code} ${name}`.toUpperCase();
  if (value.includes("WRAINB")) return "rain-black";
  if (value.includes("WRAINR")) return "rain-red";
  if (value.includes("WRAINA")) return "rain-amber";
  if (isLandslipWarning(code, name)) return "landslip";
  if (isFloodingWarning(code, name)) return "flooding";
  if (isMonsoonWarning(code, name)) return "monsoon";
  if (isFrostWarning(code, name)) return "frost";
  if (isYellowFireDangerWarning(code, name)) return "fire-yellow";
  if (isRedFireDangerWarning(code, name)) return "fire-red";
  if (isTsunamiWarning(code, name)) return "tsunami";
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
  if (isThunderstormWarning(code, name)) {
    return "thunderstorm";
  }
  if (value.includes("HOT") || value.includes("熱")) return "heat";
  if (value.includes("COLD") || value.includes("冷")) return "cold";
  return "other";
}

function isThunderstormWarning(code: string, name: string): boolean {
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  return (
    normalizedCode === "WTS" ||
    normalizedCode.startsWith("WTS_") ||
    normalizedName.includes("THUNDER") ||
    normalizedName.includes("雷暴")
  );
}

function isLandslipWarning(code: string, name: string): boolean {
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  return normalizedCode === "WL" || normalizedName.includes("LANDSLIP") || name.includes("山泥");
}

function isFloodingWarning(code: string, name: string): boolean {
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  return (
    normalizedCode === "WFNTSA" ||
    normalizedCode.includes("FLOOD") ||
    normalizedName.includes("FLOOD") ||
    name.includes("水浸")
  );
}

function isMonsoonWarning(code: string, name: string): boolean {
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  return (
    normalizedCode.includes("MSGNL") ||
    normalizedName.includes("MONSOON") ||
    name.includes("季候風") ||
    name.includes("季候风")
  );
}

function isFrostWarning(code: string, name: string): boolean {
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  return (
    normalizedCode === "WFROST" ||
    normalizedName.includes("FROST") ||
    name.includes("霜凍") ||
    name.includes("霜冻")
  );
}

function isFireDangerWarning(code: string, name: string): boolean {
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  return (
    normalizedCode.includes("WFIRE") ||
    normalizedName.includes("FIRE") ||
    name.includes("火災") ||
    name.includes("火灾")
  );
}

function isYellowFireDangerWarning(code: string, name: string): boolean {
  const value = `${code} ${name}`.toUpperCase();
  return (
    isFireDangerWarning(code, name) &&
    (value.includes("YELLOW") ||
      value.includes("WFIREY") ||
      name.includes("黃") ||
      name.includes("黄"))
  );
}

function isRedFireDangerWarning(code: string, name: string): boolean {
  const value = `${code} ${name}`.toUpperCase();
  return (
    isFireDangerWarning(code, name) &&
    (value.includes("RED") ||
      value.includes("WFIRER") ||
      name.includes("紅") ||
      name.includes("红"))
  );
}

function isTsunamiWarning(code: string, name: string): boolean {
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  return (
    normalizedCode === "WTMW" ||
    normalizedName.includes("TSUNAMI") ||
    name.includes("海嘯") ||
    name.includes("海啸")
  );
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

function notificationCopy(language: Language): { testMessage: string; testTitle: string } {
  if (language === "en") {
    return {
      testTitle: "Weather notification test",
      testMessage:
        "Notifications are working. Real alerts are only sent when warning status changes."
    };
  }

  if (language === "sc") {
    return {
      testTitle: "天气通知测试",
      testMessage: "通知功能正常。真正提示只会在天气警告状态有变化时发出。"
    };
  }

  return {
    testTitle: "天氣通知測試",
    testMessage: "通知功能正常。真正提示只會在天氣警告狀態有變化時發出。"
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatAutoBadgeText(warningBadge: string, temperatureBadge: string): string {
  return warningBadge || temperatureBadge;
}

function formatTemperatureBadge(value: number | null): string {
  return value != null ? `${Math.round(value)}°` : "";
}

async function updateActionIcon(icon: number | string | null): Promise<void> {
  if (!icon) return;

  try {
    await browserApi.action.setIcon({
      imageData: await buildActionIconImageData(hkoIconUrl(icon))
    });
  } catch {
    // Keep the previous extension icon if the HKO icon cannot be loaded in this context.
  }
}

async function buildActionIconImageData(url: string): Promise<Record<number, ImageData>> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Weather icon request failed: ${response.status}`);

  const bitmap = await createImageBitmap(await response.blob());
  return Object.fromEntries([16, 32, 48, 128].map((size) => [size, renderIconSize(bitmap, size)]));
}

function renderIconSize(bitmap: ImageBitmap, size: number): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to render weather icon.");

  context.clearRect(0, 0, size, size);
  context.drawImage(bitmap, 0, 0, size, size);
  return context.getImageData(0, 0, size, size);
}

function hkoIconUrl(icon: number | string): string {
  return `${HKO_ICON_BASE}/pic${encodeURIComponent(String(icon))}.png`;
}

function formatActionTitle(
  weather: WeatherData,
  warningBadge: string,
  temperatureBadge: string
): string {
  const warning = getHighestPriorityWarning(getSignalWarnings(weather.warnings))?.name ?? "";
  const temperatureLabel = text("Temperature", "現時氣溫", weather.language);
  const warningLabel = text("Warning", "警告", weather.language);
  const parts = [
    "HK Weather Alerts",
    weather.current.temperature != null ? `${temperatureLabel} ${temperatureBadge}` : "",
    warningBadge && warning ? `${warningLabel} ${warning}` : ""
  ].filter(Boolean);

  return parts.join(" · ");
}
