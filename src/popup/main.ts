import { browserApi } from "../shared/browser-api";
import { hkoPageUrl } from "../shared/hko-links";
import { hkoWarningIconUrl } from "../shared/hko-warning-icons";
import { getImageryUrlsWithCache } from "../shared/imagery-cache";
import {
  getCachedWeather,
  getSettings,
  getSignalWarnings,
  refreshWeather,
  updateBadge
} from "../shared/weather-service";
import type {
  ForecastDay,
  ImageryType,
  Language,
  Settings,
  WeatherData,
  WeatherWarning
} from "../shared/types";

type WarningSignalClass = WeatherWarning["type"];

type RefreshWeatherResponse = { ok: true; data: WeatherData } | { ok: false; error: string };

interface PopupState {
  data: WeatherData | null;
  settings: Settings | null;
  updating: boolean;
}

interface ImageryItem {
  fallbackUrl: string;
  imageUrl?: string;
  ranges?: ImageryRangeImages[];
  selectedIndex?: number;
  selectedRangeId?: RadarRangeId;
}

type RadarRangeId = "range0" | "range1" | "range2";

interface ImageryRangeImages {
  id: RadarRangeId;
  label: string;
  urls: string[];
}

const state: PopupState = {
  data: null,
  settings: null,
  updating: false
};

const HKO_ICON_BASE = "https://www.hko.gov.hk/images/wxicon";
const HKO_ROOT = "https://www.hko.gov.hk";
const RADAR_LIST_URL = `${HKO_ROOT}/wxinfo/radars/temp_json/nradar_img.json`;
const LIGHTNING_SCRIPT_URL = `${HKO_ROOT}/wxinfo/llis/llisradar/radar-image.js`;
const LIGHTNING_IMAGE_ROOT = `${HKO_ROOT}/wxinfo/llis/llisradar/images`;
const SATELLITE_IMAGE_URL = `${HKO_ROOT}/wxinfo/intersat/misc_images/icon_sate_gallery_tc.gif`;
const RADAR_RANGE_LABELS: Record<RadarRangeId, string> = {
  range0: "256km",
  range1: "128km",
  range2: "64km"
};
const VISIBLE_RADAR_RANGE_IDS: RadarRangeId[] = ["range0", "range1", "range2"];
const IMAGERY: Record<ImageryType, ImageryItem> = {
  radar: {
    fallbackUrl: `${HKO_ROOT}/wxinfo/intersat/misc_images/icon_radar_tc.gif`,
    imageUrl: `${HKO_ROOT}/wxinfo/intersat/misc_images/icon_radar_tc.gif`
  },
  satellite: {
    fallbackUrl: SATELLITE_IMAGE_URL,
    imageUrl: SATELLITE_IMAGE_URL
  },
  lightning: {
    fallbackUrl: `${HKO_ROOT}/en/wxinfo/intersat/misc_images/images/icon_radar_lightn_tc.gif`
  }
};
const WEATHER_CAPTIONS: Record<Language, Record<number, string>> = {
  tc: {
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
  },
  sc: {
    50: "天晴",
    51: "间有阳光",
    52: "短暂时间有阳光",
    53: "短暂阳光及骤雨",
    54: "短暂阳光有骤雨",
    60: "多云",
    61: "密云",
    62: "微雨",
    63: "有雨",
    64: "大雨",
    65: "雷暴",
    76: "晚间多云",
    77: "晚间大致天晴",
    80: "有风",
    81: "干燥",
    82: "潮湿",
    83: "有雾",
    84: "薄雾",
    85: "烟霞",
    90: "酷热",
    91: "和暖",
    92: "清凉",
    93: "寒冷"
  },
  en: {
    50: "Sunny",
    51: "Sunny Periods",
    52: "Sunny Intervals",
    53: "Sunny Intervals with Showers",
    54: "Sunny Periods with Showers",
    60: "Cloudy",
    61: "Overcast",
    62: "Light Rain",
    63: "Rain",
    64: "Heavy Rain",
    65: "Thunderstorms",
    76: "Cloudy Night",
    77: "Mainly Fine Night",
    80: "Windy",
    81: "Dry",
    82: "Humid",
    83: "Fog",
    84: "Mist",
    85: "Haze",
    90: "Hot",
    91: "Warm",
    92: "Cool",
    93: "Cold"
  }
};

const COPY: Record<
  Language,
  {
    cacheNote: string;
    currentTemp: string;
    fallbackWeather: string;
    forecastEmpty: string;
    humidity: string;
    lastUpdated: string;
    loadingFailed: string;
    noWarningSignals: string;
    noWeatherTips: string;
    radarRangeSuffix: string;
    radarSnapshot: string;
    settings: string;
    specialWeather: string;
    temperatureUnit: string;
    unableToLoad: string;
    updateFailed: string;
    updating: string;
    uvIndex: string;
    warning: string;
  }
> = {
  tc: {
    cacheNote: "快取資料",
    currentTemp: "現時氣溫",
    fallbackWeather: "香港天氣",
    forecastEmpty: "沒有九天天氣預報資料。",
    humidity: "相對濕度",
    lastUpdated: "更新",
    loadingFailed: "未能載入",
    noWarningSignals: "沒有警告信號",
    noWeatherTips: "沒有生效提示",
    radarRangeSuffix: "公里",
    radarSnapshot: "雷達圖",
    settings: "設定",
    specialWeather: "特別天氣提示",
    temperatureUnit: "度",
    unableToLoad: "未能載入天氣資料，亦沒有可用快取。",
    updateFailed: "更新失敗，正顯示快取資料。",
    updating: "更新中...",
    uvIndex: "紫外線指數",
    warning: "警告"
  },
  sc: {
    cacheNote: "快取资料",
    currentTemp: "现时气温",
    fallbackWeather: "香港天气",
    forecastEmpty: "没有九天天气预报资料。",
    humidity: "相对湿度",
    lastUpdated: "更新",
    loadingFailed: "未能载入",
    noWarningSignals: "没有警告信号",
    noWeatherTips: "没有生效提示",
    radarRangeSuffix: "公里",
    radarSnapshot: "雷达图",
    settings: "设定",
    specialWeather: "特别天气提示",
    temperatureUnit: "度",
    unableToLoad: "未能载入天气资料，亦没有可用快取。",
    updateFailed: "更新失败，正显示快取资料。",
    updating: "更新中...",
    uvIndex: "紫外线指数",
    warning: "警告"
  },
  en: {
    cacheNote: "Cached data",
    currentTemp: "Temperature",
    fallbackWeather: "Hong Kong Weather",
    forecastEmpty: "No forecast data available.",
    humidity: "Humidity",
    lastUpdated: "Updated",
    loadingFailed: "Unable to load",
    noWarningSignals: "No warning signals",
    noWeatherTips: "No active notice",
    radarRangeSuffix: "km",
    radarSnapshot: "Radar snapshot",
    settings: "Settings",
    specialWeather: "Special Weather Tips",
    temperatureUnit: "°C",
    unableToLoad: "Unable to load weather data and no cache is available.",
    updateFailed: "Update failed. Showing cached data.",
    updating: "Updating...",
    uvIndex: "UV Index",
    warning: "Warning"
  }
};

const IMAGERY_TITLES: Record<Language, Record<ImageryType, string>> = {
  tc: {
    radar: "等雨量線圖",
    satellite: "衛星圖像",
    lightning: "閃電位置"
  },
  sc: {
    radar: "等雨量线图",
    satellite: "卫星图像",
    lightning: "闪电位置"
  },
  en: {
    radar: "Radar Image",
    satellite: "Satellite Image",
    lightning: "Lightning"
  }
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
  labelCurrentTemp: query<HTMLElement>("#label-current-temp"),
  labelHumidity: query<HTMLElement>("#label-humidity"),
  labelUv: query<HTMLElement>("#label-uv"),
  warningCount: query<HTMLElement>("#warning-count"),
  warningSignalRow: query<HTMLElement>("#warning-signal-row"),
  forecastList: query<HTMLElement>("#forecast-list"),
  imageryCard: query<HTMLElement>("#imagery-card"),
  radarRanges: query<HTMLElement>("#radar-ranges"),
  specialWeatherOpen: query<HTMLButtonElement>("#special-weather-open"),
  typhoonMap: query<HTMLButtonElement>("#typhoon-map"),
  imageryTabs: document.querySelectorAll<HTMLButtonElement>(".imagery-tab"),
  imageryOpen: query<HTMLElement>("#imagery-open"),
  imageryImage: query<HTMLImageElement>("#imagery-image"),
  imageryFallback: query<HTMLElement>("#imagery-fallback"),
  imagerySnapshots: query<HTMLElement>("#imagery-snapshots"),
  imageryTitle: query<HTMLElement>("#imagery-title"),
  imageryTime: query<HTMLElement>("#imagery-time"),
  specialWeatherTitle: query<HTMLElement>("#special-weather-title")
};

query<HTMLButtonElement>("#refresh").addEventListener("click", () => {
  void load({ force: true });
});
query<HTMLButtonElement>("#hko-page").addEventListener("click", () => {
  void browserApi.tabs.create({ url: hkoPageUrl(activeLanguage(), "index.html") });
});
query<HTMLButtonElement>("#settings").addEventListener("click", openOptions);
els.typhoonMap.addEventListener("click", () => {
  void browserApi.tabs.create({ url: hkoPageUrl(activeLanguage(), "wxinfo/currwx/tc_pos.htm") });
});
els.specialWeatherOpen.addEventListener("click", () => {
  void browserApi.tabs.create({ url: hkoPageUrl(activeLanguage(), "sweather_tips.html") });
});
els.imageryOpen.addEventListener("click", () => {
  toggleImageryExpanded();
});
els.imageryOpen.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  toggleImageryExpanded();
});
els.imageryImage.addEventListener("error", () => {
  const type = toImageryType(els.imageryOpen.dataset.imagery);
  const fallbackUrl = IMAGERY[type].fallbackUrl;
  if (els.imageryImage.src !== fallbackUrl) {
    els.imageryImage.src = fallbackUrl;
  } else {
    els.imageryImage.hidden = true;
    els.imageryFallback.hidden = false;
    els.imageryFallback.textContent = copy().loadingFailed;
  }
});
els.imageryTabs.forEach((tab) => {
  tab.addEventListener("click", () => selectImagery(toImageryType(tab.dataset.imagery)));
});

await load();

async function load({ force = false }: { force?: boolean } = {}): Promise<void> {
  state.settings = await getSettings();
  applyLanguage(state.settings.language);
  setUpdating(true);

  try {
    const cached = await getCachedWeather();
    if (cached && cachedMatchesSettings(cached) && !force) {
      state.data = cached;
      render();
    }

    state.data = await refreshThroughBackground();
    render();
  } catch (error) {
    const cached = await getCachedWeather();
    if (cached && cachedMatchesSettings(cached)) {
      state.data = {
        ...cached,
        stale: true,
        error: {
          message: errorMessage(error, copy().unableToLoad)
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

function cachedMatchesSettings(data: WeatherData): boolean {
  return data.language === activeLanguage();
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
  applyLanguage(data.language);
  const localized = copy(data.language);

  els.loading.hidden = true;
  els.content.hidden = false;
  els.error.hidden = !data.error;
  els.error.textContent = data.error ? `${localized.updateFailed} ${data.error.message}` : "";
  els.cacheNote.textContent = data.stale ? localized.cacheNote : "";
  els.lastUpdated.textContent = `${formatUpdateTime(data.fetchedAt)} ${localized.lastUpdated}`;

  const caption = weatherCaption(data.current.icon, data.language);
  setWeatherIcon(els.weatherIcon, data.current.icon, caption);
  els.topTemp.textContent = formatDegree(data.current.temperature);
  els.topHumidity.textContent = formatUnit(data.current.humidity, "%");
  els.topUvValue.textContent = String(data.current.uvIndex ?? "--");
  els.topUvDesc.textContent = data.current.uvDesc ? `(${data.current.uvDesc})` : "";
  els.topSummary.textContent =
    caption || data.current.forecast || data.current.summary || localized.fallbackWeather;

  renderSpecialWeather(data);
  renderTyphoonMap(data.warnings);
  renderWarningSignals(data.warnings);
  renderForecast(data.forecast);
  void loadImagery();
}

function renderWarningSignals(warnings: WeatherWarning[]): void {
  els.warningSignalRow.replaceChildren();
  const signalWarnings = getSignalWarnings(warnings);

  if (!signalWarnings.length) {
    const emptySignal = document.createElement("div");
    emptySignal.className = "warning-signal-empty";
    emptySignal.textContent = copy().noWarningSignals;
    els.warningSignalRow.append(emptySignal);
    return;
  }

  signalWarnings.slice(0, 4).forEach((warning) => {
    const signal = document.createElement("button");
    const signalType = signalTypeClass(warning);
    signal.className = `warning-signal warning-signal-${signalType}`;
    signal.type = "button";
    signal.title = warning.name;
    signal.setAttribute("aria-label", warning.name || copy().warning);
    signal.innerHTML = warningSignalHtml(warning, signalType);
    signal.addEventListener("click", () => {
      void browserApi.tabs.create({ url: hkoPageUrl(activeLanguage(), "detail.htm") });
    });
    els.warningSignalRow.append(signal);
  });
}

function renderSpecialWeather(data: WeatherData): void {
  const highestWarning = data.warnings[0] || null;
  els.warningCount.textContent =
    data.current.tips[0] ||
    data.current.warningMessages[0] ||
    (highestWarning ? highestWarning.name : copy(data.language).noWeatherTips);
}

function renderTyphoonMap(warnings: WeatherWarning[]): void {
  const typhoonWarning = getSignalWarnings(warnings).find((warning) => warning.type === "typhoon");
  els.typhoonMap.hidden = !typhoonWarning;
  if (!typhoonWarning) {
    els.typhoonMap.textContent = "";
    return;
  }

  const fallback = localText({
    tc: "熱帶氣旋",
    sc: "热带气旋",
    en: "Tropical Cyclone"
  });
  const suffix = localText({
    tc: "路徑圖",
    sc: "路径图",
    en: "Track"
  });
  els.typhoonMap.textContent = `${typhoonWarning.name || fallback} ${suffix}`;
}

async function loadImagery(): Promise<void> {
  const currentType = toImageryType(els.imageryOpen.dataset.imagery);
  const [radarRanges, lightningRanges] = await Promise.all([
    getRadarRanges().catch(() => []),
    getLightningRanges().catch(() => [])
  ]);

  IMAGERY.radar.ranges = radarRanges;
  IMAGERY.radar.selectedRangeId = IMAGERY.radar.selectedRangeId ?? "range2";
  if (!selectedImageryRange("radar"))
    IMAGERY.radar.selectedRangeId = radarRanges[0]?.id ?? "range2";
  const radarUrls = currentImageryUrls("radar");
  IMAGERY.radar.selectedIndex = Math.max(0, radarUrls.length - 1);
  IMAGERY.radar.imageUrl = radarUrls.at(-1) || IMAGERY.radar.fallbackUrl;

  IMAGERY.lightning.ranges = lightningRanges;
  IMAGERY.lightning.selectedRangeId = IMAGERY.lightning.selectedRangeId ?? "range2";
  if (!selectedImageryRange("lightning")) {
    IMAGERY.lightning.selectedRangeId = lightningRanges[0]?.id ?? "range2";
  }
  const lightningUrls = currentImageryUrls("lightning");
  IMAGERY.lightning.selectedIndex = Math.max(0, lightningUrls.length - 1);
  IMAGERY.lightning.imageUrl = lightningUrls.at(-1) || IMAGERY.lightning.fallbackUrl;

  selectImagery(currentType);
}

function selectImagery(type: ImageryType = "radar"): void {
  const item = IMAGERY[type];
  els.imageryTabs.forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.imagery === type));
  });

  els.imageryOpen.dataset.imagery = type;
  const canCropRadar = type === "radar" && Boolean(currentImageryUrls("radar").length);
  els.imageryImage.classList.toggle("imagery-image-crop-radar", canCropRadar);
  const title = imageryTitle(type);
  els.imageryTitle.textContent = title;
  els.imageryTime.textContent = imageTime(item.imageUrl) || "";
  els.imageryFallback.hidden = true;
  els.imageryImage.hidden = false;
  els.imageryImage.src = item.imageUrl || item.fallbackUrl;
  els.imageryImage.alt = title;
  renderImagerySnapshots(type);
  renderRadarRanges(type);
}

function toggleImageryExpanded(): void {
  els.imageryCard.classList.toggle("is-expanded");
}

function renderImagerySnapshots(type: ImageryType): void {
  els.imagerySnapshots.replaceChildren();
  const urls = currentImageryUrls(type);
  els.imagerySnapshots.hidden = !usesSnapshotControls(type) || !urls.length;
  if (!usesSnapshotControls(type)) return;

  latestImagerySnapshotUrls(type).forEach(({ url, originalIndex }, displayIndex) => {
    const button = document.createElement("button");
    button.className = "imagery-snapshot";
    button.type = "button";
    button.textContent = String(displayIndex + 1);
    button.title = imageTime(url) || `${copy().radarSnapshot} ${displayIndex + 1}`;
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-selected", String(originalIndex === IMAGERY[type].selectedIndex));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectImagerySnapshot(type, originalIndex);
    });
    els.imagerySnapshots.append(button);
  });
}

function renderRadarRanges(type: ImageryType): void {
  els.radarRanges.replaceChildren();
  els.radarRanges.hidden = !usesSnapshotControls(type) || !(IMAGERY[type].ranges ?? []).length;
  if (!usesSnapshotControls(type)) return;

  for (const range of IMAGERY[type].ranges ?? []) {
    const button = document.createElement("button");
    button.className = "radar-range";
    button.type = "button";
    button.textContent = range.label;
    button.title = range.label.replace("km", copy().radarRangeSuffix);
    button.setAttribute("aria-selected", String(range.id === IMAGERY[type].selectedRangeId));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectImageryRange(type, range.id);
    });
    els.radarRanges.append(button);
  }
}

function selectImageryRange(type: ImageryType, id: RadarRangeId): void {
  IMAGERY[type].selectedRangeId = id;
  const urls = currentImageryUrls(type);
  IMAGERY[type].selectedIndex = Math.max(0, urls.length - 1);
  IMAGERY[type].imageUrl = urls.at(-1) || IMAGERY[type].fallbackUrl;
  selectImagery(type);
}

function selectImagerySnapshot(type: ImageryType, index: number): void {
  const urls = currentImageryUrls(type);
  const url = urls[index];
  if (!url) return;
  IMAGERY[type].selectedIndex = index;
  IMAGERY[type].imageUrl = url;
  selectImagery(type);
}

function selectedImageryRange(type: ImageryType): ImageryRangeImages | undefined {
  return (IMAGERY[type].ranges ?? []).find((range) => range.id === IMAGERY[type].selectedRangeId);
}

function currentImageryUrls(type: ImageryType): string[] {
  return selectedImageryRange(type)?.urls ?? [];
}

function latestImagerySnapshotUrls(
  type: ImageryType
): Array<{ originalIndex: number; url: string }> {
  return currentImageryUrls(type)
    .map((url, originalIndex) => ({ originalIndex, url }))
    .slice(-5);
}

function usesSnapshotControls(type: ImageryType): boolean {
  return type === "radar" || type === "lightning";
}

async function getRadarRanges(): Promise<ImageryRangeImages[]> {
  const ranges = await getImageryUrlsWithCache("radar", getRadarRangePaths);
  const rangeEntries = ranges.filter(isCachedRadarRangePath);
  if (!rangeEntries.length && ranges.length) {
    return parseRadarRangePaths(await getRadarRangePaths());
  }

  return parseRadarRangePaths(rangeEntries);
}

function parseRadarRangePaths(ranges: string[]): ImageryRangeImages[] {
  const grouped = new Map<RadarRangeId, string[]>();
  for (const entry of ranges) {
    const [id, path] = entry.split("|");
    if (!isRadarRangeId(id) || !path) continue;
    grouped.set(id, [...(grouped.get(id) ?? []), `${HKO_ROOT}/wxinfo/radars/${path}`]);
  }

  return VISIBLE_RADAR_RANGE_IDS.map((id) => ({
    id,
    label: RADAR_RANGE_LABELS[id],
    urls: grouped.get(id) ?? []
  })).filter((range) => range.urls.length);
}

function isCachedRadarRangePath(value: string): boolean {
  const [id, path] = value.split("|");
  return isRadarRangeId(id) && Boolean(path);
}

async function getRadarRangePaths(): Promise<string[]> {
  const response = await fetch(`${RADAR_LIST_URL}?${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load radar image list.");
  const data: unknown = await response.json();
  return radarRangeEntries(data).flatMap(({ id, entries }) =>
    extractImagePaths(entries).map((path) => `${id}|${path}`)
  );
}

async function getLightningRanges(): Promise<ImageryRangeImages[]> {
  const ranges = await getImageryUrlsWithCache("lightning", getLightningRangePaths);
  const rangeEntries = ranges.filter(isCachedRadarRangePath);
  if (!rangeEntries.length && ranges.length) {
    return parseLightningRangePaths(await getLightningRangePaths());
  }

  return parseLightningRangePaths(rangeEntries);
}

function parseLightningRangePaths(ranges: string[]): ImageryRangeImages[] {
  const grouped = new Map<RadarRangeId, string[]>();
  for (const entry of ranges) {
    const [id, filename] = entry.split("|");
    if (!isRadarRangeId(id) || !filename) continue;
    grouped.set(id, [...(grouped.get(id) ?? []), `${LIGHTNING_IMAGE_ROOT}/${filename}`]);
  }

  return VISIBLE_RADAR_RANGE_IDS.map((id) => ({
    id,
    label: RADAR_RANGE_LABELS[id],
    urls: grouped.get(id) ?? []
  })).filter((range) => range.urls.length);
}

async function getLightningRangePaths(): Promise<string[]> {
  const response = await fetch(`${LIGHTNING_SCRIPT_URL}?${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load lightning image list.");
  const script = await response.text();
  return [
    ...extractLightningArrayPaths(script, "cgPngArray", "range0"),
    ...extractLightningArrayPaths(script, "cgPngArray64", "range2")
  ];
}

function extractLightningArrayPaths(
  script: string,
  arrayName: string,
  rangeId: RadarRangeId
): string[] {
  const escapedArrayName = arrayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...script.matchAll(new RegExp(`${escapedArrayName}\\[\\d+\\]="([^"]+)"`, "g"))];
  return matches
    .map((match) => `${rangeId}|${match[1] ?? ""}`)
    .filter((entry) => !entry.endsWith("|"));
}

function extractImagePaths(entries: unknown[]): string[] {
  return entries
    .map((entry) => String(entry).match(/"([^"]+)"/)?.[1])
    .filter((path): path is string => Boolean(path));
}

function radarRangeEntries(value: unknown): Array<{ entries: unknown[]; id: RadarRangeId }> {
  if (!value || typeof value !== "object") return [];
  const radar = "radar" in value ? value.radar : undefined;
  if (!radar || typeof radar !== "object") return [];
  const radarRecord = radar as Record<string, unknown>;

  return VISIBLE_RADAR_RANGE_IDS.map((id) => {
    const range = radarRecord[id];
    const image = range && typeof range === "object" && "image" in range ? range.image : undefined;
    return {
      id,
      entries: Array.isArray(image) ? image : []
    };
  });
}

function signalTypeClass(warning: WeatherWarning): WarningSignalClass {
  return warning.type;
}

function warningSignalHtml(warning: WeatherWarning, type: WarningSignalClass): string {
  const iconUrl = hkoWarningIconUrl(warning);
  if (!iconUrl)
    return `<span class="warning-signal-fallback">${escapeHtml(warning.badge || warning.name)}</span>`;
  return `<img class="warning-signal-icon" src="${escapeHtml(iconUrl)}" alt="${escapeHtml(warning.name || type)}" />`;
}

function renderForecast(forecast: ForecastDay[]): void {
  els.forecastList.replaceChildren();
  if (!forecast.length) {
    els.forecastList.append(empty(copy().forecastEmpty));
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
    icon.alt = weatherCaption(item.icon, activeLanguage()) || item.text || "";
    setWeatherIcon(icon, item.icon, icon.alt);

    const temp = document.createElement("div");
    temp.className = "legacy-forecast-temp";
    temp.textContent = `${formatNumber(item.minTemp)}-${formatNumber(item.maxTemp)} ${copy().temperatureUnit}`;

    row.append(date, icon, temp);
    els.forecastList.append(row);
  });
}

function renderFatalError(error: unknown): void {
  els.loading.hidden = true;
  els.content.hidden = true;
  els.error.hidden = false;
  els.error.textContent = `${copy().unableToLoad} ${errorMessage(error, "")}`;
}

function setUpdating(value: boolean): void {
  state.updating = value;
  els.updating.hidden = !value;
}

function openOptions(): void {
  void browserApi.runtime.openOptionsPage();
}

function applyLanguage(language: Language): void {
  const localized = copy(language);
  document.documentElement.lang =
    language === "en" ? "en" : language === "sc" ? "zh-Hans" : "zh-Hant";
  els.labelCurrentTemp.textContent = localized.currentTemp;
  els.labelHumidity.textContent = localized.humidity;
  els.labelUv.textContent = localized.uvIndex;
  els.specialWeatherTitle.textContent = localized.specialWeather;
  els.updating.textContent = localized.updating;
  query<HTMLButtonElement>("#settings").title = localized.settings;
  query<HTMLButtonElement>("#settings").setAttribute("aria-label", localized.settings);
  els.imageryTabs.forEach((tab) => {
    tab.textContent = imageryTitle(toImageryType(tab.dataset.imagery), language);
  });
}

function activeLanguage(): Language {
  return state.data?.language ?? state.settings?.language ?? "tc";
}

function copy(language: Language = activeLanguage()): (typeof COPY)[Language] {
  return COPY[language] ?? COPY.tc;
}

function localText(
  values: Record<Language, string>,
  language: Language = activeLanguage()
): string {
  return values[language] ?? values.tc;
}

function imageryTitle(type: ImageryType, language: Language = activeLanguage()): string {
  return IMAGERY_TITLES[language]?.[type] ?? IMAGERY_TITLES.tc[type];
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
  return `${date} ${weekdayShort(weekday, activeLanguage())}`.trim();
}

function imageTime(value: string | undefined): string {
  const match = String(value || "").match(/_(\d{12})\./);
  if (!match) return "";
  const stamp = match[1] ?? "";
  return `${Number(stamp.slice(8, 10))}:${stamp.slice(10, 12)}`;
}

function formatUpdateTime(value: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(dateLocale(activeLanguage()), {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong"
  });
}

function weekdayShort(value: string, language: Language): string {
  const weekday = String(value || "").trim();
  if (language === "en") return weekday.slice(0, 3) || weekday;

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

function dateLocale(language: Language): string {
  if (language === "en") return "en-HK";
  if (language === "sc") return "zh-Hans-HK";
  return "zh-Hant-HK";
}

function weatherCaption(
  icon: number | string | null,
  language: Language = activeLanguage()
): string {
  return WEATHER_CAPTIONS[language]?.[Number(icon)] || "";
}

function toImageryType(value: string | undefined): ImageryType {
  if (value === "satellite" || value === "lightning") return value;
  return "radar";
}

function isRadarRangeId(value: string | undefined): value is RadarRangeId {
  return value === "range0" || value === "range1" || value === "range2";
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function query<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}
