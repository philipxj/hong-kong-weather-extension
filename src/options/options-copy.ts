import type { Language } from "../shared/types";

interface OptionsCopy {
  about: string;
  auto: string;
  badgeMode: string;
  compactMode: string;
  currentRefreshMinutes: string;
  dataSource: string;
  dataSourceValue: string;
  disclaimer: string;
  disclaimerValue: string;
  display: string;
  english: string;
  language: string;
  notifications: string;
  off: string;
  options: string;
  refreshIntervals: string;
  saveSettings: string;
  saved: string;
  simplifiedChinese: string;
  temperature: string;
  traditionalChinese: string;
  warning: string;
  warningCancelled: string;
  warningCheckMinutes: string;
  warningExtended: string;
  warningIssued: string;
  warningUpdated: string;
}

export const OPTIONS_COPY: Record<Language, OptionsCopy> = {
  tc: {
    about: "關於",
    auto: "自動",
    badgeMode: "徽章模式",
    compactMode: "精簡模式",
    currentRefreshMinutes: "現時天氣更新分鐘",
    dataSource: "資料來源",
    dataSourceValue: "香港天文台開放數據",
    disclaimer: "免責聲明",
    disclaimerValue: "獨立工具，並非由香港天文台營運、認可或支持。",
    display: "顯示",
    english: "English",
    language: "語言",
    notifications: "通知",
    off: "關閉",
    options: "設定",
    refreshIntervals: "更新間隔",
    saveSettings: "儲存設定",
    saved: "已儲存",
    simplifiedChinese: "簡體中文",
    temperature: "溫度",
    traditionalChinese: "繁體中文",
    warning: "警告",
    warningCancelled: "警告取消",
    warningCheckMinutes: "警告檢查分鐘",
    warningExtended: "警告延長",
    warningIssued: "警告發出",
    warningUpdated: "警告更新"
  },
  sc: {
    about: "关于",
    auto: "自动",
    badgeMode: "徽章模式",
    compactMode: "精简模式",
    currentRefreshMinutes: "现时天气更新分钟",
    dataSource: "资料来源",
    dataSourceValue: "香港天文台开放数据",
    disclaimer: "免责声明",
    disclaimerValue: "独立工具，并非由香港天文台营运、认可或支持。",
    display: "显示",
    english: "English",
    language: "语言",
    notifications: "通知",
    off: "关闭",
    options: "设置",
    refreshIntervals: "更新间隔",
    saveSettings: "保存设置",
    saved: "已保存",
    simplifiedChinese: "簡體中文",
    temperature: "温度",
    traditionalChinese: "繁體中文",
    warning: "警告",
    warningCancelled: "警告取消",
    warningCheckMinutes: "警告检查分钟",
    warningExtended: "警告延长",
    warningIssued: "警告发出",
    warningUpdated: "警告更新"
  },
  en: {
    about: "About",
    auto: "Auto",
    badgeMode: "Badge mode",
    compactMode: "Compact mode",
    currentRefreshMinutes: "Current weather refresh minutes",
    dataSource: "Data source",
    dataSourceValue: "Hong Kong Observatory Open Data",
    disclaimer: "Disclaimer",
    disclaimerValue:
      "Independent utility. Not affiliated with or endorsed by the Hong Kong Observatory.",
    display: "Display",
    english: "English",
    language: "Language",
    notifications: "Notifications",
    off: "Off",
    options: "Options",
    refreshIntervals: "Refresh intervals",
    saveSettings: "Save settings",
    saved: "Saved",
    simplifiedChinese: "簡體中文",
    temperature: "Temperature",
    traditionalChinese: "繁體中文",
    warning: "Warning",
    warningCancelled: "Warning cancelled",
    warningCheckMinutes: "Warning check minutes",
    warningExtended: "Warning extended",
    warningIssued: "Warning issued",
    warningUpdated: "Warning updated"
  }
};

export function optionsCopy(language: Language): OptionsCopy {
  return OPTIONS_COPY[language] ?? OPTIONS_COPY.tc;
}
