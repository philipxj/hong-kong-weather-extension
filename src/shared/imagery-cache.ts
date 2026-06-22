import { browserApi } from "./browser-api";
import type { ImageryType } from "./types";

export type CachedImageryType = Extract<ImageryType, "radar" | "lightning">;

export interface CachedImageryUrl {
  fetchedAt: number;
  url: string;
  urls?: string[];
}

export type ImageryUrlCache = Partial<Record<CachedImageryType, CachedImageryUrl>>;

const STORAGE_KEY = "imageryUrlCache";
export const DEFAULT_IMAGERY_CACHE_TTL_MS = 10 * 60 * 1000;

export function getFreshCachedImageryUrl(
  cache: ImageryUrlCache,
  type: CachedImageryType,
  now: number,
  ttlMs = DEFAULT_IMAGERY_CACHE_TTL_MS
): string {
  const cached = cache[type];
  if (!cached?.url) return "";
  if (now - cached.fetchedAt > ttlMs) return "";
  return cached.url;
}

export function getFreshCachedImageryUrls(
  cache: ImageryUrlCache,
  type: CachedImageryType,
  now: number,
  ttlMs = DEFAULT_IMAGERY_CACHE_TTL_MS
): string[] {
  const cached = cache[type];
  if (!cached?.urls?.length) return [];
  if (now - cached.fetchedAt > ttlMs) return [];
  return cached.urls;
}

export async function getImageryUrlWithCache(
  type: CachedImageryType,
  loadUrl: () => Promise<string>,
  now = Date.now(),
  ttlMs = DEFAULT_IMAGERY_CACHE_TTL_MS
): Promise<string> {
  const cache = await readImageryCache();
  const freshUrl = getFreshCachedImageryUrl(cache, type, now, ttlMs);
  if (freshUrl) return freshUrl;

  try {
    const url = await loadUrl();
    if (!url) return cache[type]?.url ?? "";

    await writeImageryCache({
      ...cache,
      [type]: { fetchedAt: now, url }
    });
    return url;
  } catch (error) {
    const staleUrl = cache[type]?.url;
    if (staleUrl) return staleUrl;
    throw error;
  }
}

export async function getImageryUrlsWithCache(
  type: CachedImageryType,
  loadUrls: () => Promise<string[]>,
  now = Date.now(),
  ttlMs = DEFAULT_IMAGERY_CACHE_TTL_MS
): Promise<string[]> {
  const cache = await readImageryCache();
  const freshUrls = getFreshCachedImageryUrls(cache, type, now, ttlMs);
  if (freshUrls.length) return freshUrls;

  try {
    const urls = await loadUrls();
    if (!urls.length) return cache[type]?.urls ?? [];

    await writeImageryCache({
      ...cache,
      [type]: { fetchedAt: now, url: urls.at(-1) ?? "", urls }
    });
    return urls;
  } catch (error) {
    const staleUrls = cache[type]?.urls;
    if (staleUrls?.length) return staleUrls;
    throw error;
  }
}

export async function getStoredImageryUrls(type: CachedImageryType): Promise<string[]> {
  try {
    return (await readImageryCache())[type]?.urls ?? [];
  } catch {
    return [];
  }
}

async function readImageryCache(): Promise<ImageryUrlCache> {
  const stored = await browserApi.storage.local.get<ImageryUrlCache>(STORAGE_KEY);
  return stored[STORAGE_KEY] ?? {};
}

async function writeImageryCache(cache: ImageryUrlCache): Promise<void> {
  await browserApi.storage.local.set({ [STORAGE_KEY]: cache });
}
