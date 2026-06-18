import { browserApi } from "../shared/browser-api";
import {
  getCachedWeather,
  getSettings,
  refreshWeather,
  updateBadge
} from "../shared/weather-service";
import type {
  ForecastDay,
  ImageryType,
  Settings,
  WeatherData,
  WeatherWarning
} from "../shared/types";
import { formatSpecialWeatherTips } from "./special-weather";

type WarningSignalClass = WeatherWarning["type"];

type RefreshWeatherResponse = { ok: true; data: WeatherData } | { ok: false; error: string };

interface PopupState {
  data: WeatherData | null;
  settings: Settings | null;
  updating: boolean;
}

interface ImageryItem {
  title: string;
  pageUrl: string;
  fallbackUrl: string;
  imageUrl?: string;
}

const state: PopupState = {
  data: null,
  settings: null,
  updating: false
};

const HKO_ICON_BASE = "https://www.hko.gov.hk/images/wxicon";
const TYPHOON_TRACK_URL = "https://www.hko.gov.hk/tc/wxinfo/currwx/tc_pos.htm";
const HKO_ROOT = "https://www.hko.gov.hk";
const RADAR_LIST_URL = `${HKO_ROOT}/wxinfo/radars/temp_json/nradar_img.json`;
const RADAR_PAGE_URL = `${HKO_ROOT}/tc/wxinfo/radars/radar_range1.htm`;
const LIGHTNING_SCRIPT_URL = `${HKO_ROOT}/wxinfo/llis/llisradar/radar-image.js`;
const LIGHTNING_IMAGE_ROOT = `${HKO_ROOT}/wxinfo/llis/llisradar/images`;
const LIGHTNING_PAGE_URL = `${HKO_ROOT}/tc/wxinfo/llis/llisradar.shtml`;
const SATELLITE_IMAGE_URL = `${HKO_ROOT}/wxinfo/intersat/misc_images/icon_sate_gallery_tc.gif`;
const SATELLITE_PAGE_URL = `${HKO_ROOT}/tc/wxinfo/intersat/satellite/sate.htm`;
const IMAGERY: Record<ImageryType, ImageryItem> = {
  radar: {
    title: "等雨量線圖",
    pageUrl: RADAR_PAGE_URL,
    fallbackUrl: `${HKO_ROOT}/wxinfo/intersat/misc_images/icon_radar_tc.gif`
  },
  satellite: {
    title: "衛星圖像",
    pageUrl: SATELLITE_PAGE_URL,
    fallbackUrl: SATELLITE_IMAGE_URL,
    imageUrl: SATELLITE_IMAGE_URL
  },
  lightning: {
    title: "閃電位置",
    pageUrl: LIGHTNING_PAGE_URL,
    fallbackUrl: `${HKO_ROOT}/en/wxinfo/intersat/misc_images/images/icon_radar_lightn_tc.gif`
  }
};
const WEATHER_CAPTIONS_TC: Record<number, string> = {
  50: "天晴",
  51: "間有陽光",
  52: "短暫時間有陽光",
  53: "短暫陽光及驟雨",
  54: "短暫陽光有驟雨",
  60: "多雲",
  61: "密雲",
  62: "微雨",
  63: "有雨",
  64: "大雨",
  65: "雷暴",
  76: "晚間多雲",
  77: "晚間大致天晴",
  80: "有風",
  81: "乾燥",
  82: "潮濕",
  83: "有霧",
  84: "薄霧",
  85: "煙霞",
  90: "酷熱",
  91: "和暖",
  92: "清涼",
  93: "寒冷"
};

const els = {
  loading: query<HTMLElement>("#loading"),
  content: query<HTMLElement>("#content"),
  updating: query<HTMLElement>("#updating"),
  error: query<HTMLElement>("#error"),
  cacheNote: query<HTMLElement>("#cache-note"),
  lastUpdated: query<HTMLElement>("#last-updated"),
  weatherIcon: query<HTMLImageElement>("#weather-icon"),
  topTemp: query<HTMLElement>("#top-temp"),
  topHumidity: query<HTMLElement>("#top-humidity"),
  topUvValue: query<HTMLElement>("#top-uv-value"),
  topUvDesc: query<HTMLElement>("#top-uv-desc"),
  topSummary: query<HTMLElement>("#top-summary"),
  specialWeatherCard: query<HTMLElement>("#special-weather-card"),
  specialWeatherContent: query<HTMLElement>("#special-weather-content"),
  warningSignalRow: query<HTMLElement>("#warning-signal-row"),
  forecastList: query<HTMLElement>("#forecast-list"),
  typhoonMap: query<HTMLButtonElement>("#typhoon-map"),
  imageryTabs: document.querySelectorAll<HTMLButtonElement>(".imagery-tab"),
  imageryOpen: query<HTMLButtonElement>("#imagery-open"),
  imageryImage: query<HTMLImageElement>("#imagery-image"),
  imageryFallback: query<HTMLElement>("#imagery-fallback"),
  imageryTitle: query<HTMLElement>("#imagery-title"),
  imageryTime: query<HTMLElement>("#imagery-time")
};

query<HTMLButtonElement>("#refresh").addEventListener("click", () => {
  void load({ force: true });
});
query<HTMLButtonElement>("#settings").addEventListener("click", openOptions);
els.typhoonMap.addEventListener("click", () => {
  void browserApi.tabs.create({ url: TYPHOON_TRACK_URL });
});
els.imageryOpen.addEventListener("click", () => {
  const type = toImageryType(els.imageryOpen.dataset.imagery);
  void browserApi.tabs.create({ url: IMAGERY[type].pageUrl || RADAR_PAGE_URL });
});
els.imageryImage.addEventListener("error", () => {
  const type = toImageryType(els.imageryOpen.dataset.imagery);
  const fallbackUrl = IMAGERY[type].fallbackUrl;
  if (els.imageryImage.src !== fallbackUrl) {
    els.imageryImage.src = fallbackUrl;
  } else {
    els.imageryImage.hidden = true;
    els.imageryFallback.hidden = false;
    els.imageryFallback.textContent = "未能載入";
  }
});
els.imageryTabs.forEach((tab) => {
  tab.addEventListener("click", () => selectImagery(toImageryType(tab.dataset.imagery)));
});

await load();

async function load({ force = false }: { force?: boolean } = {}): Promise<void> {
  state.settings = await getSettings();
  setUpdating(true);

  try {
    const cached = await getCachedWeather();
    if (cached && !force) {
      state.data = cached;
      render();
    }

    state.data = await refreshThroughBackground();
    render();
  } catch (error) {
    const cached = await getCachedWeather();
    if (cached) {
      state.data = {
        ...cached,
        stale: true,
        error: {
          message: errorMessage(error, "Unable to update weather data.")
        }
      };
      render();
    } else {
      renderFatalError(error);
    }
  } finally {
    setUpdating(false);
  }
}

async function refreshThroughBackground(): Promise<WeatherData> {
  try {
    const response = await browserApi.runtime.sendMessage<RefreshWeatherResponse>({
      type: "refreshWeather"
    });
    if (response?.ok) return response.data;
    throw new Error(response?.error || "Refresh failed");
  } catch {
    const data = await refreshWeather(state.settings);
    await updateBadge(data, state.settings);
    return data;
  }
}

function render(): void {
  const data = state.data;
  if (!data) return;

  els.loading.hidden = true;
  els.content.hidden = false;
  els.error.hidden = !data.error;
  els.error.textContent = data.error
    ? `Update failed. Showing cached data. ${data.error.message}`
    : "";
  els.cacheNote.textContent = data.stale ? "Cached data" : "";
  els.lastUpdated.textContent = `Last updated: ${formatDateTime(data.fetchedAt)}`;

  setWeatherIcon(els.weatherIcon, data.current.icon, weatherCaption(data.current.icon));
  els.topTemp.textContent = formatDegree(data.current.temperature);
  els.topHumidity.textContent = formatUnit(data.current.humidity, "%");
  els.topUvValue.textContent = String(data.current.uvIndex ?? "--");
  els.topUvDesc.textContent = data.current.uvDesc ? `(${data.current.uvDesc})` : "";
  els.topSummary.textContent =
    weatherCaption(data.current.icon) ||
    data.current.forecast ||
    data.current.summary ||
    "香港天氣";

  renderSpecialWeather(data.current.tips);
  renderWarningSignals(data.warnings);
  renderForecast(data.forecast);
  void loadImagery();
}

function renderWarningSignals(warnings: WeatherWarning[]): void {
  els.warningSignalRow.replaceChildren();

  if (!warnings.length) {
    const emptySignal = document.createElement("div");
    emptySignal.className = "warning-signal-empty";
    emptySignal.textContent = "沒有警告信號";
    els.warningSignalRow.append(emptySignal);
    return;
  }

  warnings.slice(0, 4).forEach((warning) => {
    const signal = document.createElement("div");
    const signalType = signalTypeClass(warning);
    signal.className = `warning-signal warning-signal-${signalType}`;
    signal.title = warning.name;
    signal.innerHTML = warningSignalHtml(warning, signalType);
    els.warningSignalRow.append(signal);
  });
}

function renderSpecialWeather(tips: string[]): void {
  const text = formatSpecialWeatherTips(tips);
  els.specialWeatherCard.hidden = !text;
  els.specialWeatherContent.textContent = text ?? "";
}

async function loadImagery(): Promise<void> {
  const currentType = toImageryType(els.imageryOpen.dataset.imagery);
  const [radarUrl, lightningUrl] = await Promise.all([
    getLatestRadarImage().catch(() => ""),
    getLatestLightningImage().catch(() => "")
  ]);

  IMAGERY.radar.imageUrl = radarUrl || IMAGERY.radar.fallbackUrl;
  IMAGERY.lightning.imageUrl = lightningUrl || IMAGERY.lightning.fallbackUrl;
  selectImagery(currentType);
}

function selectImagery(type: ImageryType = "radar"): void {
  const item = IMAGERY[type];
  els.imageryTabs.forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.imagery === type));
  });

  els.imageryOpen.dataset.imagery = type;
  els.imageryTitle.textContent = item.title;
  els.imageryTime.textContent = imageTime(item.imageUrl) || "";
  els.imageryFallback.hidden = true;
  els.imageryImage.hidden = false;
  els.imageryImage.src = item.imageUrl || item.fallbackUrl;
  els.imageryImage.alt = item.title;
}

async function getLatestRadarImage(): Promise<string> {
  const response = await fetch(`${RADAR_LIST_URL}?${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load radar image list.");
  const data: unknown = await response.json();
  const entries = radarListEntries(data);
  const latest = extractLastImagePath(entries);
  return latest ? `${HKO_ROOT}/wxinfo/radars/${latest}` : "";
}

async function getLatestLightningImage(): Promise<string> {
  const response = await fetch(`${LIGHTNING_SCRIPT_URL}?${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load lightning image list.");
  const script = await response.text();
  const matches = [...script.matchAll(/cgPngArray64\[\d+\]="([^"]+)"/g)];
  const latest = matches.at(-1)?.[1] || "";
  return latest ? `${LIGHTNING_IMAGE_ROOT}/${latest}` : "";
}

function extractLastImagePath(entries: unknown[]): string {
  const paths = entries.map((entry) => String(entry).match(/"([^"]+)"/)?.[1]).filter(Boolean);
  return paths.at(-1) || "";
}

function signalTypeClass(warning: WeatherWarning): WarningSignalClass {
  const value = `${warning.code} ${warning.badge} ${warning.name}`.toUpperCase();
  if (
    value.includes("TC") ||
    value.includes("T1") ||
    value.includes("T3") ||
    value.includes("T8") ||
    value.includes("T9") ||
    value.includes("T10")
  ) {
    return "typhoon";
  }
  if (value.includes("WTS") || value.includes("雷")) return "thunderstorm";
  if (value.includes("WRAINB") || value.includes("黑")) return "rain-black";
  if (value.includes("WRAINR") || value.includes("紅")) return "rain-red";
  if (value.includes("WRAINA") || value.includes("黃")) return "rain-amber";
  if (value.includes("HOT") || value.includes("熱")) return "heat";
  if (value.includes("COLD") || value.includes("冷")) return "cold";
  return "other";
}

function warningSignalHtml(warning: WeatherWarning, type: WarningSignalClass): string {
  if (type === "typhoon") {
    return `<span class="typhoon-stem"></span><strong>${escapeHtml(formatWarningBadge(warning.badge))}</strong>`;
  }

  if (type === "thunderstorm") {
    return `<span class="lightning-mark">⚡</span><span class="signal-text">雷暴<small>Thunderstorm</small></span>`;
  }

  if (type.startsWith("rain-")) {
    const text = type === "rain-black" ? "黑雨" : type === "rain-red" ? "紅雨" : "黃雨";
    return `<span class="rain-block">${escapeHtml(text)}</span>`;
  }

  return `<span class="rain-block">${escapeHtml(warning.badge || warning.name)}</span>`;
}

function renderForecast(forecast: ForecastDay[]): void {
  els.forecastList.replaceChildren();
  if (!forecast.length) {
    els.forecastList.append(empty("No forecast data available."));
    return;
  }

  forecast.slice(0, 7).forEach((item) => {
    const row = document.createElement("div");
    row.className = "legacy-forecast-day";

    const date = document.createElement("div");
    date.className = "legacy-forecast-date";
    date.textContent = formatLegacyDate(item.date, item.weekday);

    const icon = document.createElement("img");
    icon.className = "legacy-forecast-icon";
    icon.alt = weatherCaption(item.icon) || item.text || "";
    setWeatherIcon(icon, item.icon, icon.alt);

    const temp = document.createElement("div");
    temp.className = "legacy-forecast-temp";
    temp.textContent = `${formatNumber(item.minTemp)}-${formatNumber(item.maxTemp)} 度`;

    row.append(date, icon, temp);
    els.forecastList.append(row);
  });
}

function renderFatalError(error: unknown): void {
  els.loading.hidden = true;
  els.content.hidden = true;
  els.error.hidden = false;
  els.error.textContent = `Unable to load weather data and no cache is available. ${errorMessage(error, "")}`;
}

function setUpdating(value: boolean): void {
  state.updating = value;
  els.updating.hidden = !value;
}

function openOptions(): void {
  void browserApi.runtime.openOptionsPage();
}

function empty(message: string): HTMLElement {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = message;
  return node;
}

function formatUnit(value: number | string | null, unit: string): string {
  return value == null || value === "" ? "--" : `${value}${unit}`;
}

function formatDegree(value: number | string | null): string {
  return value == null || value === "" ? "--" : `${formatNumber(value)}°`;
}

function formatNumber(value: number | string | null): string {
  if (value == null || value === "") return "--";
  return Number.isInteger(value) ? String(value) : String(value);
}

function formatLegacyDate(value: string, weekday: string): string {
  const date = /^\d{8}$/.test(value || "")
    ? `${Number(value.slice(4, 6))}/${Number(value.slice(6, 8))}`
    : value || "--";
  return `${date} ${weekdayShort(weekday)}`.trim();
}

function imageTime(value: string | undefined): string {
  const match = String(value || "").match(/_(\d{12})\./);
  if (!match) return "";
  const stamp = match[1] ?? "";
  return `${Number(stamp.slice(8, 10))}:${stamp.slice(10, 12)}`;
}

function formatDateTime(value: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function weekdayShort(value: string): string {
  const weekday = String(value || "").trim();
  const english: Record<string, string> = {
    Sun: "日",
    Mon: "一",
    Tue: "二",
    Wed: "三",
    Thu: "四",
    Fri: "五",
    Sat: "六"
  };
  const englishWeekday = english[weekday.slice(0, 3)];
  if (englishWeekday) return englishWeekday;
  return weekday.replace("星期", "").replace("周", "").replace("週", "").replace("禮拜", "");
}

function escapeHtml(value: unknown): string {
  return stringifyHtmlValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stringifyHtmlValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}

function hkoIconUrl(icon: number | string | null): string {
  return icon ? `${HKO_ICON_BASE}/pic${encodeURIComponent(String(icon))}.png` : "";
}

function setWeatherIcon(img: HTMLImageElement, icon: number | string | null, alt = ""): void {
  const url = hkoIconUrl(icon);
  img.alt = alt;
  img.hidden = !url;
  if (!url) {
    img.removeAttribute("src");
    return;
  }
  img.src = url;
}

function weatherCaption(icon: number | string | null): string {
  return WEATHER_CAPTIONS_TC[Number(icon)] || "";
}

function formatWarningBadge(value: string): string {
  const badge = String(value || "").trim();
  const typhoonSignal = badge.match(/^T(\d+)$/i);
  if (typhoonSignal) return `T ${typhoonSignal[1]}`;
  return badge || "無";
}

function toImageryType(value: string | undefined): ImageryType {
  if (value === "satellite" || value === "lightning") return value;
  return "radar";
}

function radarListEntries(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  const radar = "radar" in value ? value.radar : undefined;
  if (!radar || typeof radar !== "object") return [];
  const range2 = "range2" in radar ? radar.range2 : undefined;
  if (!range2 || typeof range2 !== "object") return [];
  const image = "image" in range2 ? range2.image : undefined;
  return Array.isArray(image) ? image : [];
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function query<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}
