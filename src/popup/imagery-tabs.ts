import type { ImageryType, Language } from "../shared/types";

export type ImageryPanelType = ImageryType | "typhoon";

const COMPACT_TITLES: Record<Language, Record<ImageryPanelType, string>> = {
  tc: {
    radar: "雷達",
    lightning: "閃電",
    typhoon: "颱風"
  },
  sc: {
    radar: "雷达",
    lightning: "闪电",
    typhoon: "台风"
  },
  en: {
    radar: "Radar",
    lightning: "Lightning",
    typhoon: "Cyclone"
  }
};

const FULL_TITLES: Record<Language, Record<ImageryPanelType, string>> = {
  tc: {
    radar: "等雨量線圖",
    lightning: "閃電位置",
    typhoon: "熱帶氣旋"
  },
  sc: {
    radar: "等雨量线图",
    lightning: "闪电位置",
    typhoon: "热带气旋"
  },
  en: {
    radar: "Radar Image",
    lightning: "Lightning",
    typhoon: "Tropical Cyclone"
  }
};

export function sidePanelTabTitle(
  type: ImageryPanelType,
  language: Language,
  cycloneCount: number
): string {
  return titleWithCycloneCount(
    COMPACT_TITLES[language]?.[type] ?? COMPACT_TITLES.tc[type],
    type,
    cycloneCount
  );
}

export function sidePanelFullTitle(
  type: ImageryPanelType,
  language: Language,
  cycloneCount: number
): string {
  return titleWithCycloneCount(
    FULL_TITLES[language]?.[type] ?? FULL_TITLES.tc[type],
    type,
    cycloneCount
  );
}

function titleWithCycloneCount(
  label: string,
  type: ImageryPanelType,
  cycloneCount: number
): string {
  if (type !== "typhoon" || cycloneCount <= 1) return label;
  return `${label} ${cycloneCount}`;
}
