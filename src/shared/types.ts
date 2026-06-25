export type Language = "tc" | "en" | "sc";
export type BadgeMode = "auto" | "temperature" | "warning" | "off";
export type NotificationWarningCategory =
  | "rain-amber"
  | "rain-red"
  | "rain-black"
  | "typhoon"
  | "thunderstorm"
  | "heat"
  | "cold"
  | "landslip"
  | "flooding"
  | "monsoon"
  | "frost"
  | "fire"
  | "tsunami"
  | "other";

export type BadgeWarningCategory = Exclude<NotificationWarningCategory, "other">;

export interface Settings {
  language: Language;
  notifyIssued: boolean;
  notifyCancelled: boolean;
  notifyExtended: boolean;
  notifyUpdated: boolean;
  notifyWarningCategories: NotificationWarningCategory[];
  badgeWarningCategories: BadgeWarningCategory[];
  badgeMode: BadgeMode;
  currentRefreshMinutes: number;
  warningCheckMinutes: number;
}

export interface WeatherError {
  message: string;
  at?: string;
}

export interface CurrentWeather {
  temperature: number | null;
  humidity: number | null;
  uvIndex: number | string | null;
  uvDesc: string;
  rainfall: number | null;
  icon: number | string | null;
  summary: string;
  tips: string[];
  warningMessages: string[];
  forecast: string;
  warningSummary: string;
}

export interface ForecastDay {
  date: string;
  weekday: string;
  icon: number | string | null;
  minTemp: number | null;
  maxTemp: number | null;
  humidity: string;
  text: string;
  wind: string;
}

export type WarningType =
  | "rain-amber"
  | "rain-red"
  | "rain-black"
  | "typhoon"
  | "thunderstorm"
  | "landslip"
  | "flooding"
  | "monsoon"
  | "frost"
  | "fire-yellow"
  | "fire-red"
  | "heat"
  | "cold"
  | "tsunami"
  | "other";

export interface WeatherWarning {
  code: string;
  type: WarningType;
  name: string;
  badge: string;
  priority: number;
  issueTime: string;
  updateTime: string;
  expireTime: string;
  contents: string;
}

export interface WarningInfo {
  code: string;
  name: string;
  contents: string;
  issueTime: string;
  updateTime: string;
  expireTime: string;
}

export interface WeatherData {
  language: Language;
  fetchedAt: string;
  stale: boolean;
  error: WeatherError | null;
  current: CurrentWeather;
  forecast: ForecastDay[];
  warnings: WeatherWarning[];
  warningInfo: WarningInfo[];
}

export type ImageryType = "radar" | "lightning";
