import { browserApi } from "../shared/browser-api";
import { hkoPageUrl } from "../shared/hko-links";
import { createInFlightTaskRunner } from "../shared/in-flight-task";
import { getImageryUrlsWithCache, getStoredImageryUrls } from "../shared/imagery-cache";
import {
  warningSignalIconAssetPath,
  warningSignalText,
  weatherIconAssetPath
} from "../shared/local-weather-assets";
import { weatherScene } from "./weather-scene";
import {
  getCachedWeather,
  getSettings,
  getSignalWarnings,
  refreshWeather,
  selectPrimaryTropicalCyclone,
  tropicalCycloneDirectionLabel,
  updateBadge
} from "../shared/weather-service";
import type {
  ForecastDay,
  ImageryType,
  Language,
  Settings,
  TropicalCyclone,
  WeatherData,
  WeatherWarning
} from "../shared/types";
import { formatSpecialWeatherTips } from "./special-weather";
import { formatHongKongTime, millisecondsUntilNextMinute } from "./hong-kong-time";
import { loadImageryProgressively } from "./imagery-loader";
import { selectImagerySnapshots } from "./imagery-snapshots";
import { sidePanelFullTitle, sidePanelTabTitle } from "./imagery-tabs";

type WarningSignalClass = WeatherWarning["type"];
type SidePanelType = ImageryType | "typhoon";

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
const runImageryLoad = createInFlightTaskRunner<void>();

const HKO_ROOT = "https://www.hko.gov.hk";
const RADAR_LIST_URL = `${HKO_ROOT}/wxinfo/radars/temp_json/nradar_img.json`;
const LIGHTNING_SCRIPT_URL = `${HKO_ROOT}/wxinfo/llis/llisradar/radar-image.js`;
const LIGHTNING_IMAGE_ROOT = `${HKO_ROOT}/wxinfo/llis/llisradar/images`;
const RADAR_RANGE_LABELS: Record<RadarRangeId, string> = {
  range0: "256km",
  range1: "128km",
  range2: "64km"
};
const VISIBLE_RADAR_RANGE_IDS: RadarRangeId[] = ["range0", "range1", "range2"];
const IMAGERY_TYPES: ImageryType[] = ["radar", "lightning"];
const WEATHER_TITLE_MAX_FONT_SIZE = 40;
const WEATHER_TITLE_MIN_FONT_SIZE = 24;
const IMAGERY_STEP_FEEDBACK_MS = 360;
const IMAGERY_TOAST_MS = 1600;
const IMAGERY_STEP_HINT_STORAGE_KEY = "imageryStepHintDismissed";
const IMAGERY: Record<ImageryType, ImageryItem> = {
  radar: {
    fallbackUrl: `${HKO_ROOT}/wxinfo/intersat/misc_images/icon_radar_tc.gif`,
    imageUrl: `${HKO_ROOT}/wxinfo/intersat/misc_images/icon_radar_tc.gif`
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
    collapseImagery: string;
    expandImagery: string;
    fallbackWeather: string;
    forecastEmpty: string;
    humidity: string;
    imageryExpandHint: string;
    imageryPreviewAction: string;
    lastUpdated: string;
    loadingFailed: string;
    noWarningSignals: string;
    noWeatherTips: string;
    imageryTimePrefix: string;
    radarRangeSuffix: string;
    radarSnapshot: string;
    settings: string;
    specialWeather: string;
    temperatureUnit: string;
    tropicalCyclone: string;
    tropicalCycloneTrack: string;
    tropicalCycloneTrackMap: string;
    tropicalCycloneTrackMapClose: string;
    tropicalCycloneTrackMapFailed: string;
    tropicalCycloneTrackMapLoading: string;
    tropicalCycloneTrackMapRetry: string;
    unableToLoad: string;
    updateFailed: string;
    updating: string;
    uvIndex: string;
    warning: string;
  }
> = {
  tc: {
    cacheNote: "快取資料",
    collapseImagery: "縮小",
    currentTemp: "現時氣溫",
    expandImagery: "放大",
    fallbackWeather: "香港天氣",
    forecastEmpty: "沒有九天天氣預報資料。",
    humidity: "相對濕度",
    imageryExpandHint: "連按圖像放大",
    imageryPreviewAction: "天氣圖像預覽，按左右方向鍵轉圖，按 Enter 放大或縮小",
    lastUpdated: "更新",
    loadingFailed: "未能載入",
    noWarningSignals: "沒有警告信號",
    noWeatherTips: "沒有生效提示",
    imageryTimePrefix: "時間",
    radarRangeSuffix: "公里",
    radarSnapshot: "雷達圖",
    settings: "設定",
    specialWeather: "特別天氣提示",
    temperatureUnit: "度",
    tropicalCyclone: "熱帶氣旋",
    tropicalCycloneTrack: "詳情",
    tropicalCycloneTrackMap: "路徑圖",
    tropicalCycloneTrackMapClose: "關閉",
    tropicalCycloneTrackMapFailed: "未能載入路徑圖",
    tropicalCycloneTrackMapLoading: "載入路徑圖中...",
    tropicalCycloneTrackMapRetry: "重新載入",
    unableToLoad: "未能載入天氣資料，亦沒有可用快取。",
    updateFailed: "更新失敗，正顯示快取資料。",
    updating: "更新中...",
    uvIndex: "紫外線指數",
    warning: "警告"
  },
  sc: {
    cacheNote: "快取资料",
    collapseImagery: "缩小",
    currentTemp: "现时气温",
    expandImagery: "放大",
    fallbackWeather: "香港天气",
    forecastEmpty: "没有九天天气预报资料。",
    humidity: "相对湿度",
    imageryExpandHint: "连按图像放大",
    imageryPreviewAction: "天气图像预览，按左右方向键转图，按 Enter 放大或缩小",
    lastUpdated: "更新",
    loadingFailed: "未能载入",
    noWarningSignals: "没有警告信号",
    noWeatherTips: "没有生效提示",
    imageryTimePrefix: "时间",
    radarRangeSuffix: "公里",
    radarSnapshot: "雷达图",
    settings: "设定",
    specialWeather: "特别天气提示",
    temperatureUnit: "度",
    tropicalCyclone: "热带气旋",
    tropicalCycloneTrack: "详情",
    tropicalCycloneTrackMap: "路径图",
    tropicalCycloneTrackMapClose: "关闭",
    tropicalCycloneTrackMapFailed: "未能载入路径图",
    tropicalCycloneTrackMapLoading: "载入路径图中...",
    tropicalCycloneTrackMapRetry: "重新载入",
    unableToLoad: "未能载入天气资料，亦没有可用快取。",
    updateFailed: "更新失败，正显示快取资料。",
    updating: "更新中...",
    uvIndex: "紫外线指数",
    warning: "警告"
  },
  en: {
    cacheNote: "Cached data",
    collapseImagery: "Collapse",
    currentTemp: "Temperature",
    expandImagery: "Expand",
    fallbackWeather: "Hong Kong Weather",
    forecastEmpty: "No forecast data available.",
    humidity: "Humidity",
    imageryExpandHint: "Double-click image to expand",
    imageryPreviewAction:
      "Weather imagery preview. Press Left or Right Arrow to change image, Enter to expand or collapse.",
    lastUpdated: "Updated",
    loadingFailed: "Unable to load",
    noWarningSignals: "No warning signals",
    noWeatherTips: "No active notice",
    imageryTimePrefix: "Time",
    radarRangeSuffix: "km",
    radarSnapshot: "Radar snapshot",
    settings: "Settings",
    specialWeather: "Special Weather Tips",
    temperatureUnit: "°C",
    tropicalCyclone: "Tropical Cyclone",
    tropicalCycloneTrack: "Detail",
    tropicalCycloneTrackMap: "Track Map",
    tropicalCycloneTrackMapClose: "Close",
    tropicalCycloneTrackMapFailed: "Unable to load track map",
    tropicalCycloneTrackMapLoading: "Loading track map...",
    tropicalCycloneTrackMapRetry: "Retry",
    unableToLoad: "Unable to load weather data and no cache is available.",
    updateFailed: "Update failed. Showing cached data.",
    updating: "Updating...",
    uvIndex: "UV Index",
    warning: "Warning"
  }
};

const els = {
  shell: query<HTMLElement>(".popup-shell"),
  loading: query<HTMLElement>("#loading"),
  content: query<HTMLElement>("#content"),
  updating: query<HTMLElement>("#updating"),
  error: query<HTMLElement>("#error"),
  cacheNote: query<HTMLElement>("#cache-note"),
  hongKongTime: query<HTMLElement>("#hong-kong-time"),
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
  imageryCaption: query<HTMLElement>(".imagery-caption"),
  radarRanges: query<HTMLElement>("#radar-ranges"),
  specialWeatherOpen: query<HTMLButtonElement>("#special-weather-open"),
  typhoonMap: query<HTMLButtonElement>("#typhoon-map"),
  typhoonMapLabel: query<HTMLElement>("#typhoon-map-label"),
  typhoonTrackMap: query<HTMLButtonElement>("#typhoon-track-map"),
  typhoonTrackMapClose: query<HTMLButtonElement>("#typhoon-track-map-close"),
  typhoonTrackMapFallback: query<HTMLElement>("#typhoon-track-map-fallback"),
  typhoonTrackMapImage: query<HTMLImageElement>("#typhoon-track-map-image"),
  typhoonTrackMapMessage: query<HTMLElement>("#typhoon-track-map-message"),
  typhoonTrackMapOverlay: query<HTMLElement>("#typhoon-track-map-overlay"),
  typhoonTrackMapPanel: query<HTMLElement>(".typhoon-track-map-panel"),
  typhoonTrackMapRetry: query<HTMLButtonElement>("#typhoon-track-map-retry"),
  tropicalCycloneDistance: query<HTMLElement>("#tropical-cyclone-distance"),
  tropicalCycloneDistanceLabel: query<HTMLElement>("#tropical-cyclone-distance-label"),
  tropicalCycloneDescription: query<HTMLElement>("#tropical-cyclone-description"),
  tropicalCycloneKicker: query<HTMLElement>("#tropical-cyclone-kicker"),
  tropicalCycloneMeta: query<HTMLElement>("#tropical-cyclone-meta"),
  tropicalCycloneSelect: query<HTMLSelectElement>("#tropical-cyclone-select"),
  tropicalCycloneTab: query<HTMLButtonElement>("#tropical-cyclone-tab"),
  tropicalCycloneTimeLabel: query<HTMLElement>("#tropical-cyclone-time-label"),
  tropicalCycloneView: query<HTMLElement>("#tropical-cyclone-view"),
  tropicalCycloneWindLabel: query<HTMLElement>("#tropical-cyclone-wind-label"),
  tropicalCycloneWind: query<HTMLElement>("#tropical-cyclone-wind"),
  imageryTabs: document.querySelectorAll<HTMLButtonElement>(".imagery-tab"),
  imageryOpen: query<HTMLElement>("#imagery-open"),
  imageryImage: query<HTMLImageElement>("#imagery-image"),
  imageryExpand: query<HTMLButtonElement>("#imagery-expand"),
  imageryFallback: query<HTMLElement>("#imagery-fallback"),
  imageryPosition: query<HTMLElement>("#imagery-position"),
  imageryStepper: query<HTMLElement>("#imagery-stepper"),
  imageryStepHint: query<HTMLElement>("#imagery-step-hint"),
  imageryStepHintLeft: query<HTMLElement>(".imagery-step-hint-left"),
  imageryStepHintRight: query<HTMLElement>(".imagery-step-hint-right"),
  imageryTitle: query<HTMLElement>("#imagery-title"),
  imageryToast: query<HTMLElement>("#imagery-toast"),
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
  const url =
    els.typhoonMap.dataset.trackUrl || hkoPageUrl(activeLanguage(), "wxinfo/currwx/tc_pos.htm");
  void browserApi.tabs.create({ url });
});
els.typhoonTrackMap.addEventListener("click", () => showTropicalCycloneTrackMap());
els.typhoonTrackMapClose.addEventListener("click", hideTropicalCycloneTrackMap);
els.typhoonTrackMapRetry.addEventListener("click", () => {
  showTropicalCycloneTrackMap({ forceReload: true });
});
els.typhoonTrackMapOverlay.addEventListener("click", (event) => {
  if (event.target === els.typhoonTrackMapOverlay) hideTropicalCycloneTrackMap();
});
els.typhoonTrackMapImage.addEventListener("load", () => {
  els.typhoonTrackMapImage.hidden = false;
  setTrackMapMessageState("hidden");
});
els.typhoonTrackMapImage.addEventListener("error", () => {
  els.typhoonTrackMapImage.hidden = true;
  setTrackMapMessageState("error");
});
els.tropicalCycloneSelect.addEventListener("change", () => {
  selectTropicalCyclone(els.tropicalCycloneSelect.value);
});
els.specialWeatherOpen.addEventListener("click", () => {
  void browserApi.tabs.create({ url: hkoPageUrl(activeLanguage(), "sweather_tips.html") });
});
let previewClickTimer: number | undefined;
let previewFeedbackTimer: number | undefined;
let imageryToastTimer: number | undefined;
let imageryStepHintDismissed = true;
let selectedTropicalCycloneIndex = 0;
let tropicalCycloneIdSignature = "";
let hongKongTimeTimer: number | undefined;

els.imageryOpen.addEventListener("click", (event) => {
  if (shouldIgnorePreviewAction(event.target)) return;
  const rect = els.imageryOpen.getBoundingClientRect();
  const direction = event.clientX < rect.left + rect.width / 2 ? -1 : 1;
  clearPreviewClickTimer();
  previewClickTimer = window.setTimeout(() => {
    previewClickTimer = undefined;
    if (stepImagerySnapshot(direction)) {
      dismissImageryStepHint();
      showImageryStepFeedback(direction);
    }
  }, 220);
});
els.imageryOpen.addEventListener("dblclick", (event) => {
  if (shouldIgnorePreviewAction(event.target)) return;
  clearPreviewClickTimer();
  clearImageryStepFeedback();
  event.preventDefault();
  toggleImageryExpanded();
});
els.imageryOpen.addEventListener("keydown", (event) => {
  if (shouldIgnorePreviewAction(event.target)) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    clearPreviewClickTimer();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    if (stepImagerySnapshot(direction)) {
      dismissImageryStepHint();
      showImageryStepFeedback(direction);
    }
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    clearPreviewClickTimer();
    clearImageryStepFeedback();
    toggleImageryExpanded();
  }
});
els.imageryExpand.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleImageryExpanded({ showToast: true });
});
document.addEventListener(
  "click",
  (event) => {
    if (!els.imageryCard.classList.contains("is-expanded")) return;
    if (event.target instanceof Node && els.imageryCard.contains(event.target)) return;
    collapseImageryExpanded();
  },
  { capture: true }
);
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
  tab.addEventListener("click", () => selectSidePanel(toSidePanelType(tab.dataset.panel)));
});

els.loading.textContent = "Loading weather data...";
startHongKongTimeClock();
await loadImageryStepHintPreference();
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
  renderHongKongTime();
  els.lastUpdated.textContent = `${formatUpdateTime(data.fetchedAt)} ${localized.lastUpdated}`;

  const caption = weatherCaption(data.current.icon, data.language);
  const scene = weatherScene(data.current.icon);
  els.shell.dataset.weatherScene = scene;
  els.content.dataset.weatherScene = scene;
  setWeatherIcon(els.weatherIcon, data.current.icon, caption);
  els.topTemp.textContent = formatDegree(data.current.temperature);
  els.topHumidity.textContent = formatUnit(data.current.humidity, "%");
  els.topUvValue.textContent = String(data.current.uvIndex ?? "--");
  els.topUvDesc.textContent = data.current.uvDesc ? `(${data.current.uvDesc})` : "";
  els.topSummary.textContent =
    caption || data.current.forecast || data.current.summary || localized.fallbackWeather;

  renderSpecialWeather(data.current.tips);
  fitWeatherTitle();
  renderTropicalCyclonePanel(data.tropicalCyclones);
  renderWarningSignals(data.warnings);
  renderForecast(data.forecast);
  selectSidePanel(defaultSidePanelType());
  void runImageryLoad("popup-imagery", loadImagery);
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
    signal.append(warningSignalElement(warning, signalType));
    signal.addEventListener("click", () => {
      void browserApi.tabs.create({ url: hkoPageUrl(activeLanguage(), "detail.htm") });
    });
    els.warningSignalRow.append(signal);
  });
}

function renderSpecialWeather(tips: string[]): void {
  const text = formatSpecialWeatherTips(tips);
  els.specialWeatherOpen.hidden = !text;
  els.warningCount.textContent = text ?? "";
}

function fitWeatherTitle(): void {
  els.topSummary.style.removeProperty("font-size");
  els.topSummary.style.removeProperty("max-width");

  const titleRect = els.topSummary.getBoundingClientRect();
  const rightEdge = els.specialWeatherOpen.hidden
    ? (els.topSummary.parentElement?.getBoundingClientRect().right ?? titleRect.right)
    : els.specialWeatherOpen.getBoundingClientRect().left;
  const availableWidth = Math.floor(Math.max(110, rightEdge - titleRect.left - 8));

  els.topSummary.style.maxWidth = `${availableWidth}px`;
  els.topSummary.style.fontSize = `${WEATHER_TITLE_MAX_FONT_SIZE}px`;

  for (
    let size = WEATHER_TITLE_MAX_FONT_SIZE;
    size > WEATHER_TITLE_MIN_FONT_SIZE && els.topSummary.scrollWidth > els.topSummary.clientWidth;
    size -= 1
  ) {
    els.topSummary.style.fontSize = `${size - 1}px`;
  }
}

function renderTropicalCyclonePanel(cyclones: TropicalCyclone[] = []): void {
  const activeCyclones = cyclones.filter(Boolean);
  const idSignature = activeCyclones.map((cyclone) => cyclone.id).join("|");
  if (idSignature !== tropicalCycloneIdSignature) {
    tropicalCycloneIdSignature = idSignature;
    selectedTropicalCycloneIndex = 0;
  }
  selectedTropicalCycloneIndex = clampIndex(selectedTropicalCycloneIndex, activeCyclones.length);
  const cyclone =
    activeCyclones[selectedTropicalCycloneIndex] ?? selectPrimaryTropicalCyclone(cyclones);
  els.tropicalCycloneTab.hidden = !cyclone;
  els.tropicalCycloneView.hidden = !cyclone;
  renderSidePanelTabLabels();

  if (!cyclone) {
    els.typhoonMap.dataset.trackUrl = "";
    els.typhoonTrackMap.dataset.trackMapUrl = "";
    hideTropicalCycloneTrackMap();
    els.tropicalCycloneKicker.textContent = copy().tropicalCyclone;
    els.tropicalCycloneMeta.textContent = "";
    els.tropicalCycloneDistance.textContent = "";
    els.tropicalCycloneWind.textContent = "";
    els.tropicalCycloneDescription.textContent = "";
    els.tropicalCycloneDescription.hidden = true;
    els.tropicalCycloneSelect.replaceChildren();
    els.tropicalCycloneSelect.hidden = true;
    els.typhoonTrackMap.textContent = copy().tropicalCycloneTrackMap;
    els.typhoonTrackMap.removeAttribute("title");
    els.typhoonTrackMap.removeAttribute("aria-label");
    els.typhoonMapLabel.textContent = copy().tropicalCycloneTrack;
    els.typhoonMap.removeAttribute("title");
    els.typhoonMap.removeAttribute("aria-label");
    return;
  }

  const localized = copy();
  const name = formatTropicalCycloneName(cyclone);
  const observedAt = formatTropicalCycloneObservedAt(cyclone.observedAtHkt);
  const distance = formatTropicalCycloneDistance(cyclone);
  const windValue = formatTropicalCycloneWindValue(cyclone);
  const meta = formatTropicalCycloneMeta(cyclone);
  const wind = formatTropicalCycloneWind(cyclone);
  const position = formatTropicalCyclonePosition(
    selectedTropicalCycloneIndex,
    activeCyclones.length
  );
  const label = [localized.tropicalCyclone, position, name, meta, wind, cyclone.description]
    .filter(Boolean)
    .join("\n");

  els.typhoonMap.dataset.trackUrl = cyclone.trackUrl;
  els.typhoonTrackMap.dataset.trackMapUrl = cyclone.trackMapUrl;
  els.tropicalCycloneKicker.textContent = localized.tropicalCyclone;
  els.tropicalCycloneMeta.textContent = observedAt || "--";
  els.tropicalCycloneDistance.textContent = distance || "--";
  els.tropicalCycloneWind.textContent = windValue || "--";
  els.tropicalCycloneDescription.textContent = cyclone.description;
  els.tropicalCycloneDescription.hidden = !cyclone.description;
  renderTropicalCycloneSelect(activeCyclones);
  els.tropicalCycloneTimeLabel.textContent = localText({ tc: "時間", sc: "时间", en: "Time" });
  els.tropicalCycloneDistanceLabel.textContent = localText({
    tc: "位置",
    sc: "位置",
    en: "Position"
  });
  els.tropicalCycloneWindLabel.textContent = localText({ tc: "風速", sc: "风速", en: "Wind" });
  els.typhoonTrackMap.textContent = localized.tropicalCycloneTrackMap;
  els.typhoonMapLabel.textContent = localized.tropicalCycloneTrack;
  els.typhoonMap.title = label;
  els.typhoonMap.setAttribute("aria-label", label);
  els.typhoonTrackMap.title = localized.tropicalCycloneTrackMap;
  els.typhoonTrackMap.setAttribute("aria-label", localized.tropicalCycloneTrackMap);
}

function formatTropicalCycloneName(cyclone: TropicalCyclone): string {
  return [cyclone.classification, cyclone.name].filter(Boolean).join(" ") || copy().tropicalCyclone;
}

function showTropicalCycloneTrackMap({
  forceReload = false
}: { forceReload?: boolean } = {}): void {
  const url = els.typhoonTrackMap.dataset.trackMapUrl;
  if (!url) return;

  els.typhoonTrackMapOverlay.hidden = false;
  setTrackMapMessageState("loading");
  els.typhoonTrackMapImage.alt = copy().tropicalCycloneTrackMap;

  if (forceReload) {
    els.typhoonTrackMapImage.hidden = true;
    els.typhoonTrackMapImage.removeAttribute("src");
    els.typhoonTrackMapImage.src = url;
    return;
  }

  if (els.typhoonTrackMapImage.src !== url) {
    els.typhoonTrackMapImage.hidden = true;
    els.typhoonTrackMapImage.src = url;
    return;
  }

  if (els.typhoonTrackMapImage.complete && els.typhoonTrackMapImage.naturalWidth > 0) {
    els.typhoonTrackMapImage.hidden = false;
    setTrackMapMessageState("hidden");
  }
}

function hideTropicalCycloneTrackMap(): void {
  els.typhoonTrackMapOverlay.hidden = true;
}

function setTrackMapMessageState(state: "hidden" | "loading" | "error"): void {
  const visible = state !== "hidden";
  els.typhoonTrackMapOverlay.classList.toggle("has-message", visible);
  els.typhoonTrackMapPanel.classList.toggle("is-message", visible);
  els.typhoonTrackMapMessage.hidden = !visible;
  els.typhoonTrackMapRetry.hidden = state !== "error";
  if (state === "loading") {
    els.typhoonTrackMapFallback.textContent = copy().tropicalCycloneTrackMapLoading;
  } else if (state === "error") {
    els.typhoonTrackMapFallback.textContent = copy().tropicalCycloneTrackMapFailed;
  }
}

function selectTropicalCyclone(value: string): void {
  const cyclones = state.data?.tropicalCyclones ?? [];
  if (!cyclones.length) return;
  selectedTropicalCycloneIndex = clampIndex(Number(value), cyclones.length);
  renderTropicalCyclonePanel(cyclones);
  selectSidePanel("typhoon");
}

function renderTropicalCycloneSelect(cyclones: TropicalCyclone[]): void {
  els.tropicalCycloneSelect.replaceChildren(
    ...cyclones.map((cyclone, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = formatTropicalCycloneName(cyclone);
      return option;
    })
  );
  els.tropicalCycloneSelect.value = String(selectedTropicalCycloneIndex);
  els.tropicalCycloneSelect.hidden = cyclones.length <= 1;
  els.tropicalCycloneSelect.title = localText({
    tc: "選擇熱帶氣旋",
    sc: "选择热带气旋",
    en: "Select tropical cyclone"
  });
}

function formatTropicalCyclonePosition(index: number, count: number): string {
  if (count <= 0) return "1/1";
  return `${index + 1}/${count}`;
}

function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(0, index), count - 1);
}

function formatTropicalCycloneMeta(cyclone: TropicalCyclone): string {
  return [
    formatTropicalCycloneObservedAt(cyclone.observedAtHkt),
    formatTropicalCycloneDistance(cyclone)
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatTropicalCycloneObservedAt(value: string | null): string {
  if (!value || !/^\d{10}$/.test(value)) return "";
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = value.slice(8, 10);

  if (activeLanguage() === "en") {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    return `${hour}:00 HKT ${day} ${months[month - 1] ?? ""}`.trim();
  }

  return localText({
    tc: `香港時間 ${month}月${day}日${hour}時`,
    sc: `香港时间 ${month}月${day}日${hour}时`,
    en: ""
  });
}

function formatTropicalCycloneDistance(
  cyclone: TropicalCyclone,
  { compact = false }: { compact?: boolean } = {}
): string {
  if (cyclone.distanceKm == null) return "";
  const language = activeLanguage();
  const direction = tropicalCycloneDirectionLabel(cyclone.directionFromHongKong, language);
  const distance = formatNumber(cyclone.distanceKm);
  if (compact) {
    if (language === "en") return `${distance} km ${direction ?? ""}`.trim();
    return `${direction ?? ""}${distance}公里`;
  }

  if (language === "en") {
    return direction
      ? `about ${distance} km ${direction} of Hong Kong`
      : `about ${distance} km from Hong Kong`;
  }

  const place = localText({ tc: "香港", sc: "香港", en: "Hong Kong" });
  const about = localText({ tc: "約", sc: "约", en: "about" });
  const unit = localText({ tc: "公里", sc: "公里", en: "km" });
  return direction
    ? `${place}以${direction}${about} ${distance} ${unit}`
    : `${place}${about} ${distance} ${unit}`;
}

function formatTropicalCycloneWind(
  cyclone: TropicalCyclone,
  { compact = false }: { compact?: boolean } = {}
): string {
  if (cyclone.maxWindKmh == null) return "";
  const speed = formatNumber(cyclone.maxWindKmh);
  if (activeLanguage() === "en") {
    return compact ? `${speed} km/h` : `Maximum sustained wind near centre ${speed} km/h`;
  }
  return compact
    ? `${speed}公里/時`
    : `${localText({
        tc: "中心附近最高持續風速",
        sc: "中心附近最高持续风速",
        en: ""
      })} ${localText({ tc: "每小時", sc: "每小时", en: "" })} ${speed} ${localText({
        tc: "公里",
        sc: "公里",
        en: ""
      })}`;
}

function formatTropicalCycloneWindValue(cyclone: TropicalCyclone): string {
  if (cyclone.maxWindKmh == null) return "";
  const speed = formatNumber(cyclone.maxWindKmh);
  if (activeLanguage() === "en") return `${speed} km/h`;
  return `${localText({ tc: "每小時", sc: "每小时", en: "" })} ${speed} ${localText({
    tc: "公里",
    sc: "公里",
    en: ""
  })}`;
}

async function loadImagery(): Promise<void> {
  const currentType = toImageryType(els.imageryOpen.dataset.imagery);
  await loadImageryProgressively({
    currentType,
    otherTypes: IMAGERY_TYPES.filter((type) => type !== currentType),
    hydrateFromStored: hydrateStoredImagery,
    refresh: refreshImagery,
    getCurrentType: () => toImageryType(els.imageryOpen.dataset.imagery),
    renderType: selectImagery
  });
}

function selectSidePanel(type: SidePanelType = "radar"): void {
  const safeType = type === "typhoon" && els.tropicalCycloneTab.hidden ? "radar" : type;
  els.imageryCard.dataset.panel = safeType;
  els.imageryTabs.forEach((tab) => {
    tab.setAttribute("aria-selected", String(toSidePanelType(tab.dataset.panel) === safeType));
  });

  if (safeType === "typhoon") {
    collapseImageryExpanded();
    els.tropicalCycloneView.hidden = false;
    els.imageryOpen.hidden = true;
    els.imageryCaption.hidden = true;
    els.radarRanges.hidden = true;
    els.imageryStepHint.hidden = true;
    hideImageryToast();
    return;
  }

  els.tropicalCycloneView.hidden = true;
  els.imageryOpen.hidden = false;
  els.imageryCaption.hidden = false;
  selectImagery(safeType);
}

function defaultSidePanelType(): SidePanelType {
  const current = toSidePanelType(els.imageryCard.dataset.panel);
  if (current === "typhoon" && els.tropicalCycloneTab.hidden) return "radar";
  return current;
}

function selectImagery(type: ImageryType = "radar"): void {
  const item = IMAGERY[type];
  els.imageryOpen.dataset.imagery = type;
  const canCropMap = usesSnapshotControls(type) && Boolean(currentImageryUrls(type).length);
  els.imageryImage.classList.toggle("imagery-image-crop-map", canCropMap);
  els.imageryImage.classList.toggle("imagery-image-lightning", type === "lightning" && canCropMap);
  const title = imageryTitle(type);
  const time = imageTime(item.imageUrl);
  els.imageryTitle.textContent = time ? copy().imageryTimePrefix : title;
  els.imageryTime.textContent = time;
  els.imageryFallback.hidden = true;
  els.imageryImage.hidden = false;
  els.imageryImage.src = item.imageUrl || item.fallbackUrl;
  els.imageryImage.alt = title;
  renderImageryStepper(type);
  renderRadarRanges(type);
  renderImageryStepHint(type);
  if (toSidePanelType(els.imageryCard.dataset.panel) === "typhoon") {
    els.radarRanges.hidden = true;
    els.imageryStepHint.hidden = true;
  }
}

function toggleImageryExpanded({ showToast = false }: { showToast?: boolean } = {}): void {
  const wasExpanded = els.imageryCard.classList.contains("is-expanded");
  els.imageryCard.classList.toggle("is-expanded");
  renderImageryExpandButton();
  if (!wasExpanded && els.imageryCard.classList.contains("is-expanded") && showToast) {
    showImageryToast();
  } else {
    hideImageryToast();
  }
}

function collapseImageryExpanded(): void {
  els.imageryCard.classList.remove("is-expanded");
  renderImageryExpandButton();
  hideImageryToast();
}

function renderRadarRanges(type: ImageryType): void {
  els.radarRanges.replaceChildren();
  const ranges = IMAGERY[type].ranges ?? [];
  els.radarRanges.style.setProperty("--range-count", String(Math.max(1, ranges.length)));
  els.radarRanges.hidden = !usesSnapshotControls(type) || !ranges.length;
  if (!usesSnapshotControls(type)) return;

  for (const range of ranges) {
    const button = document.createElement("button");
    button.className = "radar-range";
    button.type = "button";
    button.textContent = range.label;
    button.title = range.label.replace("km", copy().radarRangeSuffix);
    const isSelected = range.id === IMAGERY[type].selectedRangeId;
    button.setAttribute("aria-selected", String(isSelected));
    button.setAttribute("aria-pressed", String(isSelected));
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
  selectSidePanel(type);
}

function selectImagerySnapshot(type: ImageryType, index: number): void {
  const urls = currentImageryUrls(type);
  const url = urls[index];
  if (!url) return;
  IMAGERY[type].selectedIndex = index;
  IMAGERY[type].imageUrl = url;
  selectSidePanel(type);
}

function stepImagerySnapshot(direction: -1 | 1): boolean {
  const type = toImageryType(els.imageryOpen.dataset.imagery);
  const snapshots = latestImagerySnapshotUrls(type);
  if (!snapshots.length) return false;

  const selectedIndex = IMAGERY[type].selectedIndex ?? snapshots.at(-1)?.originalIndex ?? 0;
  const currentDisplayIndex = Math.max(
    0,
    snapshots.findIndex((item) => item.originalIndex === selectedIndex)
  );
  const nextDisplayIndex = currentDisplayIndex + direction;
  const next = snapshots[nextDisplayIndex];
  if (!next) return false;

  selectImagerySnapshot(type, next.originalIndex);
  return true;
}

function renderImageryStepper(type: ImageryType): void {
  const snapshots = latestImagerySnapshotUrls(type);
  const selectedIndex = IMAGERY[type].selectedIndex ?? snapshots.at(-1)?.originalIndex ?? 0;
  const currentDisplayIndex = snapshots.findIndex((item) => item.originalIndex === selectedIndex);
  const safeDisplayIndex = currentDisplayIndex >= 0 ? currentDisplayIndex : snapshots.length - 1;
  const hasSnapshots = usesSnapshotControls(type) && snapshots.length > 0;

  els.imageryStepper.hidden = !hasSnapshots;
  els.imageryPosition.hidden = !hasSnapshots;
  els.imageryPosition.textContent = hasSnapshots
    ? `${safeDisplayIndex + 1} / ${snapshots.length}`
    : "-- / --";
}

async function loadImageryStepHintPreference(): Promise<void> {
  const stored = await browserApi.storage.local.get<boolean>(IMAGERY_STEP_HINT_STORAGE_KEY);
  imageryStepHintDismissed = stored[IMAGERY_STEP_HINT_STORAGE_KEY] === true;
}

function dismissImageryStepHint(): void {
  if (imageryStepHintDismissed) return;
  imageryStepHintDismissed = true;
  renderImageryStepHint(toImageryType(els.imageryOpen.dataset.imagery));
  void browserApi.storage.local.set({ [IMAGERY_STEP_HINT_STORAGE_KEY]: true });
}

function renderImageryStepHint(type: ImageryType): void {
  const snapshots = latestImagerySnapshotUrls(type);
  const selectedIndex = IMAGERY[type].selectedIndex ?? snapshots.at(-1)?.originalIndex ?? 0;
  const currentDisplayIndex = snapshots.findIndex((item) => item.originalIndex === selectedIndex);
  const safeDisplayIndex = currentDisplayIndex >= 0 ? currentDisplayIndex : snapshots.length - 1;
  const hasStepHint = usesSnapshotControls(type) && snapshots.length > 1;

  els.imageryStepHint.hidden =
    imageryStepHintDismissed || !hasStepHint || els.imageryStepper.hidden;
  els.imageryStepHintLeft.classList.toggle("is-disabled", safeDisplayIndex <= 0);
  els.imageryStepHintRight.classList.toggle(
    "is-disabled",
    safeDisplayIndex >= snapshots.length - 1
  );
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
  return selectImagerySnapshots(type, currentImageryUrls(type));
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

async function hydrateStoredImagery(type: ImageryType): Promise<void> {
  const ranges = parseImageryRangePaths(type, await getStoredImageryUrls(type));
  if (ranges.length) applyImageryRanges(type, ranges);
}

async function refreshImagery(type: ImageryType): Promise<void> {
  applyImageryRanges(type, await getImageryRanges(type));
}

async function getImageryRanges(type: ImageryType): Promise<ImageryRangeImages[]> {
  return type === "lightning" ? getLightningRanges() : getRadarRanges();
}

function parseImageryRangePaths(type: ImageryType, ranges: string[]): ImageryRangeImages[] {
  const rangeEntries = ranges.filter(isCachedRadarRangePath);
  return type === "lightning"
    ? parseLightningRangePaths(rangeEntries)
    : parseRadarRangePaths(rangeEntries);
}

function applyImageryRanges(type: ImageryType, ranges: ImageryRangeImages[]): void {
  const item = IMAGERY[type];
  item.ranges = ranges;
  item.selectedRangeId = item.selectedRangeId ?? "range2";
  if (!selectedImageryRange(type)) {
    item.selectedRangeId = ranges[0]?.id ?? "range2";
  }

  const urls = currentImageryUrls(type);
  item.selectedIndex = Math.max(0, urls.length - 1);
  item.imageUrl = urls.at(-1) || item.fallbackUrl;
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

function warningSignalElement(
  warning: WeatherWarning,
  type: WarningSignalClass
): HTMLImageElement | HTMLSpanElement {
  const iconPath = warningSignalIconAssetPath(warning);
  if (iconPath) {
    const icon = document.createElement("img");
    icon.className = "warning-signal-icon";
    icon.src = browserApi.runtime.getUrl(iconPath);
    icon.alt = warning.name || type;
    return icon;
  }

  const glyph = document.createElement("span");
  glyph.className = "warning-signal-icon warning-signal-glyph";
  glyph.textContent = warningSignalText(warning);
  glyph.setAttribute("aria-hidden", "true");
  glyph.dataset.signalType = type;
  return glyph;
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

function startHongKongTimeClock(): void {
  renderHongKongTime();
  scheduleNextHongKongTimeTick();
}

function scheduleNextHongKongTimeTick(): void {
  if (hongKongTimeTimer !== undefined) {
    window.clearTimeout(hongKongTimeTimer);
  }
  hongKongTimeTimer = window.setTimeout(() => {
    renderHongKongTime();
    scheduleNextHongKongTimeTick();
  }, millisecondsUntilNextMinute(new Date()));
}

function renderHongKongTime(): void {
  els.hongKongTime.textContent = formatHongKongTime(new Date(), activeLanguage());
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
  renderHongKongTime();
  els.imageryOpen.setAttribute("aria-label", localized.imageryPreviewAction);
  els.typhoonMapLabel.textContent = localized.tropicalCycloneTrack;
  els.typhoonTrackMap.textContent = localized.tropicalCycloneTrackMap;
  els.typhoonTrackMapClose.textContent = localized.tropicalCycloneTrackMapClose;
  els.typhoonTrackMapClose.setAttribute("aria-label", localized.tropicalCycloneTrackMapClose);
  els.typhoonTrackMapOverlay.setAttribute("aria-label", localized.tropicalCycloneTrackMap);
  els.typhoonTrackMapImage.alt = localized.tropicalCycloneTrackMap;
  els.typhoonTrackMapRetry.textContent = localized.tropicalCycloneTrackMapRetry;
  els.typhoonTrackMapRetry.setAttribute("aria-label", localized.tropicalCycloneTrackMapRetry);
  renderImageryExpandButton(language);
  query<HTMLButtonElement>("#settings").title = localized.settings;
  query<HTMLButtonElement>("#settings").setAttribute("aria-label", localized.settings);
  renderSidePanelTabLabels(language);
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

function clearPreviewClickTimer(): void {
  if (previewClickTimer === undefined) return;
  window.clearTimeout(previewClickTimer);
  previewClickTimer = undefined;
}

function showImageryStepFeedback(direction: -1 | 1): void {
  clearImageryStepFeedback();
  const className = direction < 0 ? "is-stepping-left" : "is-stepping-right";
  void els.imageryOpen.offsetWidth;
  els.imageryOpen.classList.add(className);
  previewFeedbackTimer = window.setTimeout(clearImageryStepFeedback, IMAGERY_STEP_FEEDBACK_MS);
}

function clearImageryStepFeedback(): void {
  if (previewFeedbackTimer !== undefined) {
    window.clearTimeout(previewFeedbackTimer);
    previewFeedbackTimer = undefined;
  }
  els.imageryOpen.classList.remove("is-stepping-left", "is-stepping-right");
}

function showImageryToast(): void {
  if (imageryToastTimer !== undefined) {
    window.clearTimeout(imageryToastTimer);
    imageryToastTimer = undefined;
  }
  els.imageryToast.textContent = copy().imageryExpandHint;
  els.imageryToast.hidden = false;
  imageryToastTimer = window.setTimeout(hideImageryToast, IMAGERY_TOAST_MS);
}

function hideImageryToast(): void {
  if (imageryToastTimer !== undefined) {
    window.clearTimeout(imageryToastTimer);
    imageryToastTimer = undefined;
  }
  els.imageryToast.hidden = true;
}

function shouldIgnorePreviewAction(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".imagery-stepper, button"));
}

function renderImageryExpandButton(language: Language = activeLanguage()): void {
  const localized = copy(language);
  const label = els.imageryCard.classList.contains("is-expanded")
    ? localized.collapseImagery
    : localized.expandImagery;
  els.imageryExpand.textContent = label;
  els.imageryExpand.title = label;
  els.imageryExpand.setAttribute("aria-label", label);
}

function imageryTitle(type: ImageryType, language: Language = activeLanguage()): string {
  return sidePanelFullTitle(type, language, 0);
}

function renderSidePanelTabLabels(language: Language = activeLanguage()): void {
  const cycloneCount = state.data?.tropicalCyclones.length ?? 0;
  els.imageryTabs.forEach((tab) => {
    const type = toSidePanelType(tab.dataset.panel);
    const fullTitle = sidePanelFullTitle(type, language, cycloneCount);
    tab.textContent = sidePanelTabTitle(type, language, cycloneCount);
    tab.title = fullTitle;
    tab.setAttribute("aria-label", fullTitle);
  });
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

function localWeatherIconUrl(icon: number | string | null): string {
  const assetPath = weatherIconAssetPath(icon);
  return assetPath ? browserApi.runtime.getUrl(assetPath) : "";
}

function setWeatherIcon(img: HTMLImageElement, icon: number | string | null, alt = ""): void {
  const url = localWeatherIconUrl(icon);
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
  if (value === "lightning") return value;
  return "radar";
}

function toSidePanelType(value: string | undefined): SidePanelType {
  if (value === "typhoon") return "typhoon";
  return toImageryType(value);
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
