import type { Language } from "../shared/types";

interface OptionsCopy {
  about: string;
  auto: string;
  badgeMode: string;
  badgeModeDescription: string;
  compactMode: string;
  compactModeDescription: string;
  currentRefreshMinutes: string;
  currentRefreshMinutesDescription: string;
  dataSource: string;
  dataSourceValue: string;
  disclaimer: string;
  disclaimerValue: string;
  display: string;
  english: string;
  englishDescription: string;
  language: string;
  notifications: string;
  off: string;
  options: string;
  refreshIntervals: string;
  saveSettings: string;
  saved: string;
  simplifiedChinese: string;
  simplifiedChineseDescription: string;
  temperature: string;
  traditionalChinese: string;
  traditionalChineseDescription: string;
  warning: string;
  warningCancelled: string;
  warningCancelledDescription: string;
  warningCheckMinutes: string;
  warningCheckMinutesDescription: string;
  warningExtended: string;
  warningExtendedDescription: string;
  warningIssued: string;
  warningIssuedDescription: string;
  warningUpdated: string;
  warningUpdatedDescription: string;
}

export const OPTIONS_COPY: Record<Language, OptionsCopy> = {
  tc: {
    about: "關於",
    auto: "自動",
    badgeMode: "徽章模式",
    badgeModeDescription:
      "自動會優先顯示警告；沒有警告時顯示溫度。也可改為只顯示溫度、只顯示警告，或關閉徽章。",
    compactMode: "精簡模式",
    compactModeDescription: "保持 popup 使用緊湊版天文台風格版面。",
    currentRefreshMinutes: "現時天氣更新分鐘",
    currentRefreshMinutesDescription: "控制現時氣溫、濕度、紫外線及預報資料隔多久重新更新。",
    dataSource: "資料來源",
    dataSourceValue: "香港天文台開放數據",
    disclaimer: "免責聲明",
    disclaimerValue: "獨立工具，並非由香港天文台營運、認可或支持。",
    display: "顯示",
    english: "English",
    englishDescription: "設定頁、popup 文字及天文台連結使用英文。",
    language: "語言",
    notifications: "通知",
    off: "關閉",
    options: "設定",
    refreshIntervals: "更新間隔",
    saveSettings: "儲存設定",
    saved: "已儲存",
    simplifiedChinese: "簡體中文",
    simplifiedChineseDescription: "設定頁、popup 文字及天文台連結使用簡體中文。",
    temperature: "溫度",
    traditionalChinese: "繁體中文",
    traditionalChineseDescription: "設定頁、popup 文字及天文台連結使用繁體中文。",
    warning: "警告",
    warningCancelled: "警告取消",
    warningCancelledDescription: "有警告取消時發出通知。",
    warningCheckMinutes: "警告檢查分鐘",
    warningCheckMinutesDescription: "控制背景服務隔多久檢查一次天氣警告變化。",
    warningExtended: "警告延長",
    warningExtendedDescription: "雷暴等警告延長有效時間時發出通知。",
    warningIssued: "警告發出",
    warningIssuedDescription: "有新天氣警告生效時發出通知。",
    warningUpdated: "警告更新",
    warningUpdatedDescription: "警告內容更新時發出通知；可能會比較頻密。"
  },
  sc: {
    about: "关于",
    auto: "自动",
    badgeMode: "徽章模式",
    badgeModeDescription:
      "自动会优先显示警告；没有警告时显示温度。也可改为只显示温度、只显示警告，或关闭徽章。",
    compactMode: "精简模式",
    compactModeDescription: "保持 popup 使用紧凑版天文台风格版面。",
    currentRefreshMinutes: "现时天气更新分钟",
    currentRefreshMinutesDescription: "控制现时气温、湿度、紫外线及预报资料隔多久重新更新。",
    dataSource: "资料来源",
    dataSourceValue: "香港天文台开放数据",
    disclaimer: "免责声明",
    disclaimerValue: "独立工具，并非由香港天文台营运、认可或支持。",
    display: "显示",
    english: "English",
    englishDescription: "设置页、popup 文字及天文台链接使用英文。",
    language: "语言",
    notifications: "通知",
    off: "关闭",
    options: "设置",
    refreshIntervals: "更新间隔",
    saveSettings: "保存设置",
    saved: "已保存",
    simplifiedChinese: "簡體中文",
    simplifiedChineseDescription: "设置页、popup 文字及天文台链接使用简体中文。",
    temperature: "温度",
    traditionalChinese: "繁體中文",
    traditionalChineseDescription: "设置页、popup 文字及天文台链接使用繁体中文。",
    warning: "警告",
    warningCancelled: "警告取消",
    warningCancelledDescription: "有警告取消时发出通知。",
    warningCheckMinutes: "警告检查分钟",
    warningCheckMinutesDescription: "控制背景服务隔多久检查一次天气警告变化。",
    warningExtended: "警告延长",
    warningExtendedDescription: "雷暴等警告延长有效时间时发出通知。",
    warningIssued: "警告发出",
    warningIssuedDescription: "有新天气警告生效时发出通知。",
    warningUpdated: "警告更新",
    warningUpdatedDescription: "警告内容更新时发出通知；可能会比较频密。"
  },
  en: {
    about: "About",
    auto: "Auto",
    badgeMode: "Badge mode",
    badgeModeDescription:
      "Auto shows the highest warning first, then temperature when no warning is active. You can also force temperature, warning only, or hide the badge.",
    compactMode: "Compact mode",
    compactModeDescription: "Keeps the popup in the compact Observatory-style layout.",
    currentRefreshMinutes: "Current weather refresh minutes",
    currentRefreshMinutesDescription:
      "Controls how often current temperature, humidity, UV index, and forecast data refresh.",
    dataSource: "Data source",
    dataSourceValue: "Hong Kong Observatory Open Data",
    disclaimer: "Disclaimer",
    disclaimerValue:
      "Independent utility. Not affiliated with or endorsed by the Hong Kong Observatory.",
    display: "Display",
    english: "English",
    englishDescription: "Use English for settings, popup labels, and Observatory links.",
    language: "Language",
    notifications: "Notifications",
    off: "Off",
    options: "Options",
    refreshIntervals: "Refresh intervals",
    saveSettings: "Save settings",
    saved: "Saved",
    simplifiedChinese: "簡體中文",
    simplifiedChineseDescription:
      "Use Simplified Chinese for settings, popup labels, and Observatory links.",
    temperature: "Temperature",
    traditionalChinese: "繁體中文",
    traditionalChineseDescription:
      "Use Traditional Chinese for settings, popup labels, and Observatory links.",
    warning: "Warning",
    warningCancelled: "Warning cancelled",
    warningCancelledDescription: "Send a notification when an active warning is cancelled.",
    warningCheckMinutes: "Warning check minutes",
    warningCheckMinutesDescription:
      "Controls how often the background service checks for weather warning changes.",
    warningExtended: "Warning extended",
    warningExtendedDescription:
      "Send a notification when warnings such as thunderstorms are extended.",
    warningIssued: "Warning issued",
    warningIssuedDescription: "Send a notification when a new weather warning becomes active.",
    warningUpdated: "Warning updated",
    warningUpdatedDescription:
      "Send a notification when warning content changes; this may be more frequent."
  }
};

export function optionsCopy(language: Language): OptionsCopy {
  return OPTIONS_COPY[language] ?? OPTIONS_COPY.tc;
}
