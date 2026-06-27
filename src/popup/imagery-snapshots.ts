import type { ImageryType } from "../shared/types";

export interface ImagerySnapshot {
  originalIndex: number;
  url: string;
}

const DEFAULT_MAX_SNAPSHOTS = 5;
const DEFAULT_SOURCE_GAP = 3;

export function selectImagerySnapshots(type: ImageryType, urls: string[]): ImagerySnapshot[] {
  return type === "radar" ? selectSpacedImagerySnapshots(urls) : selectLatestImagerySnapshots(urls);
}

export function selectSpacedImagerySnapshots(
  urls: string[],
  maxSnapshots = DEFAULT_MAX_SNAPSHOTS,
  sourceGap = DEFAULT_SOURCE_GAP
): ImagerySnapshot[] {
  if (urls.length <= maxSnapshots) {
    return urls.map((url, originalIndex) => ({ originalIndex, url }));
  }

  const preferredSpan = (maxSnapshots - 1) * sourceGap + 1;
  if (urls.length >= preferredSpan) {
    const startIndex = urls.length - preferredSpan;
    return Array.from({ length: maxSnapshots }, (_, index) => {
      const originalIndex = startIndex + index * sourceGap;
      return {
        originalIndex,
        url: urls[originalIndex] ?? ""
      };
    }).filter((snapshot) => snapshot.url);
  }

  return evenlySampleImagerySnapshots(urls, maxSnapshots);
}

function selectLatestImagerySnapshots(
  urls: string[],
  maxSnapshots = DEFAULT_MAX_SNAPSHOTS
): ImagerySnapshot[] {
  return urls
    .map((url, originalIndex) => ({ originalIndex, url }))
    .slice(Math.max(0, urls.length - maxSnapshots));
}

function evenlySampleImagerySnapshots(urls: string[], maxSnapshots: number): ImagerySnapshot[] {
  const lastIndex = urls.length - 1;
  const indexes = new Set<number>();
  for (let index = 0; index < maxSnapshots; index += 1) {
    indexes.add(Math.round((index * lastIndex) / (maxSnapshots - 1)));
  }

  return [...indexes]
    .sort((a, b) => a - b)
    .map((originalIndex) => ({
      originalIndex,
      url: urls[originalIndex] ?? ""
    }));
}
