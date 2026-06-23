import type { Language } from "../shared/types";

interface OptionsCopy {
  about: string;
  appVersionLabel: string;
  auto: string;
  badgeMode: string;
  badgeModeDescription: string;
  currentRefreshMinutes: string;
  currentRefreshMinutesDescription: string;
  dataSource: string;
  dataSourceValue: string;
  disclaimer: string;
  disclaimerValue: string;
  display: string;
  english: string;
  englishDescription: string;
  githubRepository: string;
  language: string;
  notificationChangesOnlyDescription: string;
  notificationWarningCategories: string;
  notificationWarningCategoriesDescription: string;
  notificationWarningCategoryCold: string;
  notificationWarningCategoryFire: string;
  notificationWarningCategoryFlooding: string;
  notificationWarningCategoryFrost: string;
  notificationWarningCategoryHeat: string;
  notificationWarningCategoryLandslip: string;
  notificationWarningCategoryMonsoon: string;
  notificationWarningCategoryOther: string;
  notificationWarningCategoryRainAmber: string;
  notificationWarningCategoryRainBlack: string;
  notificationWarningCategoryRainRed: string;
  notificationWarningCategoryThunderstorm: string;
  notificationWarningCategoryTsunami: string;
  notificationWarningCategoryTyphoon: string;
  notifications: string;
  off: string;
  options: string;
  refreshIntervals: string;
  saveSettings: string;
  saved: string;
  simplifiedChinese: string;
  simplifiedChineseDescription: string;
  temperature: string;
  testNotification: string;
  testNotificationDescription: string;
  testNotificationCreatedNoPopup: string;
  testNotificationFailed: string;
  testNotificationSent: string;
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
    appVersionLabel: "版本",
    auto: "自動",
    badgeMode: "徽章模式",
    badgeModeDescription:
      "自動會優先顯示警告；沒有警告時顯示溫度。也可改為只顯示溫度、只顯示警告，或關閉徽章。",
    currentRefreshMinutes: "現時天氣更新分鐘",
    currentRefreshMinutesDescription: "控制現時氣溫、濕度及紫外線指數隔多久重新更新。",
    dataSource: "資料來源",
    dataSourceValue: "香港天文台開放數據",
    disclaimer: "免責聲明",
    disclaimerValue: "獨立工具，並非由香港天文台營運、認可或支持。",
    display: "顯示",
    english: "English",
    englishDescription: "設定頁、popup 文字及天文台連結使用英文。",
    githubRepository: "GitHub",
    language: "語言",
    notificationChangesOnlyDescription:
      "通知只會在警告狀態有變化時發出；已經生效中的警告不會每次更新都彈出。",
    notificationWarningCategories: "通知警告種類",
    notificationWarningCategoriesDescription:
      "只為已選種類發出通知；彈出視窗及徽章仍會顯示所有生效警告。",
    notificationWarningCategoryCold: "寒冷",
    notificationWarningCategoryFire: "火災危險",
    notificationWarningCategoryFlooding: "水浸",
    notificationWarningCategoryFrost: "霜凍",
    notificationWarningCategoryHeat: "酷熱",
    notificationWarningCategoryLandslip: "山泥傾瀉",
    notificationWarningCategoryMonsoon: "季候風",
    notificationWarningCategoryOther: "其他警告",
    notificationWarningCategoryRainAmber: "黃雨",
    notificationWarningCategoryRainBlack: "黑雨",
    notificationWarningCategoryRainRed: "紅雨",
    notificationWarningCategoryThunderstorm: "雷暴",
    notificationWarningCategoryTsunami: "海嘯",
    notificationWarningCategoryTyphoon: "熱帶氣旋",
    notifications: "通知",
    off: "關閉",
    options: "設定",
    refreshIntervals: "更新間隔",
    saveSettings: "儲存設定",
    saved: "已儲存",
    simplifiedChinese: "簡體中文",
    simplifiedChineseDescription: "設定頁、popup 文字及天文台連結使用簡體中文。",
    temperature: "溫度",
    testNotification: "測試通知",
    testNotificationCreatedNoPopup:
      "Chrome 已建立通知，但系統未彈出；請檢查 macOS/Chrome 通知及專注模式。",
    testNotificationDescription: "立即發出一個測試通知，確認 Chrome 或系統通知設定是否已開啟。",
    testNotificationFailed: "未能發出測試通知，請檢查瀏覽器或系統通知權限。",
    testNotificationSent: "已發出測試通知",
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
    warningIssuedDescription: "有新天氣警告由未生效變成生效時發出通知。",
    warningUpdated: "警告更新",
    warningUpdatedDescription: "警告內容更新時發出通知；可能會比較頻密。"
  },
  sc: {
    about: "关于",
    appVersionLabel: "版本",
    auto: "自动",
    badgeMode: "徽章模式",
    badgeModeDescription:
      "自动会优先显示警告；没有警告时显示温度。也可改为只显示温度、只显示警告，或关闭徽章。",
    currentRefreshMinutes: "现时天气更新分钟",
    currentRefreshMinutesDescription: "控制现时气温、湿度及紫外线指数隔多久重新更新。",
    dataSource: "资料来源",
    dataSourceValue: "香港天文台开放数据",
    disclaimer: "免责声明",
    disclaimerValue: "独立工具，并非由香港天文台营运、认可或支持。",
    display: "显示",
    english: "English",
    englishDescription: "设置页、popup 文字及天文台链接使用英文。",
    githubRepository: "GitHub",
    language: "语言",
    notificationChangesOnlyDescription:
      "通知只会在警告状态有变化时发出；已经生效中的警告不会每次更新都弹出。",
    notificationWarningCategories: "通知警告种类",
    notificationWarningCategoriesDescription:
      "只为已选种类发出通知；弹出窗口及徽章仍会显示所有生效警告。",
    notificationWarningCategoryCold: "寒冷",
    notificationWarningCategoryFire: "火灾危险",
    notificationWarningCategoryFlooding: "水浸",
    notificationWarningCategoryFrost: "霜冻",
    notificationWarningCategoryHeat: "酷热",
    notificationWarningCategoryLandslip: "山泥倾泻",
    notificationWarningCategoryMonsoon: "季候风",
    notificationWarningCategoryOther: "其他警告",
    notificationWarningCategoryRainAmber: "黄雨",
    notificationWarningCategoryRainBlack: "黑雨",
    notificationWarningCategoryRainRed: "红雨",
    notificationWarningCategoryThunderstorm: "雷暴",
    notificationWarningCategoryTsunami: "海啸",
    notificationWarningCategoryTyphoon: "热带气旋",
    notifications: "通知",
    off: "关闭",
    options: "设置",
    refreshIntervals: "更新间隔",
    saveSettings: "保存设置",
    saved: "已保存",
    simplifiedChinese: "簡體中文",
    simplifiedChineseDescription: "设置页、popup 文字及天文台链接使用简体中文。",
    temperature: "温度",
    testNotification: "测试通知",
    testNotificationCreatedNoPopup:
      "Chrome 已建立通知，但系统未弹出；请检查 macOS/Chrome 通知及专注模式。",
    testNotificationDescription: "立即发出一个测试通知，确认 Chrome 或系统通知设置是否已开启。",
    testNotificationFailed: "未能发出测试通知，请检查浏览器或系统通知权限。",
    testNotificationSent: "已发出测试通知",
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
    warningIssuedDescription: "有新天气警告由未生效变成生效时发出通知。",
    warningUpdated: "警告更新",
    warningUpdatedDescription: "警告内容更新时发出通知；可能会比较频密。"
  },
  en: {
    about: "About",
    appVersionLabel: "Version",
    auto: "Auto",
    badgeMode: "Badge mode",
    badgeModeDescription:
      "Auto shows the highest warning first, then temperature when no warning is active. You can also force temperature, warning only, or hide the badge.",
    currentRefreshMinutes: "Current weather refresh minutes",
    currentRefreshMinutesDescription:
      "Controls how often current temperature, humidity, and UV index refresh.",
    dataSource: "Data source",
    dataSourceValue: "Hong Kong Observatory Open Data",
    disclaimer: "Disclaimer",
    disclaimerValue:
      "Independent utility. Not affiliated with or endorsed by the Hong Kong Observatory.",
    display: "Display",
    english: "English",
    englishDescription: "Use English for settings, popup labels, and Observatory links.",
    githubRepository: "GitHub",
    language: "Language",
    notificationChangesOnlyDescription:
      "Notifications are sent only when warning status changes. Existing active warnings do not notify on every refresh.",
    notificationWarningCategories: "Warning types",
    notificationWarningCategoriesDescription:
      "Only selected types send notifications. The popup and badge still show every active warning.",
    notificationWarningCategoryCold: "Cold",
    notificationWarningCategoryFire: "Fire danger",
    notificationWarningCategoryFlooding: "Flooding",
    notificationWarningCategoryFrost: "Frost",
    notificationWarningCategoryHeat: "Very hot",
    notificationWarningCategoryLandslip: "Landslip",
    notificationWarningCategoryMonsoon: "Monsoon",
    notificationWarningCategoryOther: "Other warnings",
    notificationWarningCategoryRainAmber: "Amber rainstorm",
    notificationWarningCategoryRainBlack: "Black rainstorm",
    notificationWarningCategoryRainRed: "Red rainstorm",
    notificationWarningCategoryThunderstorm: "Thunderstorm",
    notificationWarningCategoryTsunami: "Tsunami",
    notificationWarningCategoryTyphoon: "Tropical cyclone",
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
    testNotification: "Test notification",
    testNotificationCreatedNoPopup:
      "Chrome created the notification, but the system did not show it. Check macOS/Chrome notifications and Focus mode.",
    testNotificationDescription:
      "Send a test notification now to confirm Chrome and system notifications are enabled.",
    testNotificationFailed:
      "Unable to send a test notification. Check browser or system notification permissions.",
    testNotificationSent: "Test notification sent",
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
    warningIssuedDescription:
      "Send a notification when a weather warning changes from inactive to active.",
    warningUpdated: "Warning updated",
    warningUpdatedDescription:
      "Send a notification when warning content changes; this may be more frequent."
  }
};

export function optionsCopy(language: Language): OptionsCopy {
  return OPTIONS_COPY[language] ?? OPTIONS_COPY.tc;
}
