import { browserApi } from "./browser-api";
import type {
  Language,
  WeatherData,
  WeatherError,
  WeatherSliceName,
  WeatherSliceState,
  WeatherSliceStates
} from "./types";

const CACHE_KEY = "weatherCache";
let cacheWriteQueue: Promise<void> = Promise.resolve();

export interface WeatherCacheUpdate {
  previous: WeatherData | null;
  next: WeatherData;
}

export function createEmptyWeatherData(language: Language): WeatherData {
  return summarizeWeatherData({
    language,
    fetchedAt: "",
    stale: true,
    error: null,
    current: {
      temperature: null,
      humidity: null,
      uvIndex: null,
      uvDesc: "",
      rainfall: null,
      icon: null,
      tips: [],
      warningMessages: [],
      forecast: "",
      warningSummary: ""
    },
    forecast: [],
    tropicalCyclones: [],
    warnings: [],
    warningInfo: [],
    sliceStates: createEmptySliceStates()
  });
}

export function cacheSliceIsFresh(
  data: WeatherData | null,
  slice: WeatherSliceName,
  ttlMs: number,
  now = Date.now()
): boolean {
  const state = data?.sliceStates?.[slice];
  if (!state || state.stale || !state.fetchedAt) return false;

  const fetchedAt = Date.parse(state.fetchedAt);
  if (!Number.isFinite(fetchedAt) || fetchedAt > now) return false;
  return now - fetchedAt <= ttlMs;
}

export function withWeatherSliceState(
  data: WeatherData,
  slice: WeatherSliceName,
  state: WeatherSliceState
): WeatherData {
  return summarizeWeatherData({
    ...data,
    sliceStates: {
      ...createEmptySliceStates(),
      ...data.sliceStates,
      [slice]: state
    }
  });
}

export function summarizeWeatherData(data: WeatherData): WeatherData {
  const states = data.sliceStates;
  if (!states) return data;

  const successfulTimes = Object.values(states)
    .map((state) => state.fetchedAt)
    .filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value))
    );
  const errors = Object.values(states)
    .map((state) => state.error)
    .filter((error): error is WeatherError => Boolean(error))
    .sort((a, b) => errorTime(b) - errorTime(a));

  return {
    ...data,
    fetchedAt:
      successfulTimes.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? data.fetchedAt ?? "",
    stale: Object.values(states).some((state) => state.stale),
    error: errors[0] ?? null,
    sliceStates: states
  };
}

export function updateWeatherCache(
  updater: (current: WeatherData | null) => WeatherData | Promise<WeatherData>
): Promise<WeatherCacheUpdate> {
  const operation = cacheWriteQueue.then(async () => {
    const stored = await browserApi.storage.local.get<WeatherData>(CACHE_KEY);
    const previous = stored[CACHE_KEY] ?? null;
    const next = summarizeWeatherData(await updater(previous));
    await browserApi.storage.local.set({ [CACHE_KEY]: next });
    return { previous, next };
  });

  cacheWriteQueue = operation.then(
    () => undefined,
    () => undefined
  );
  return operation;
}

function createEmptySliceStates(): WeatherSliceStates {
  return {
    current: emptySliceState(),
    forecast: emptySliceState(),
    warnings: emptySliceState(),
    tropicalCyclones: emptySliceState()
  };
}

function emptySliceState(): WeatherSliceState {
  return { fetchedAt: null, stale: true, error: null };
}

function errorTime(error: WeatherError): number {
  const timestamp = error.at ? Date.parse(error.at) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}
