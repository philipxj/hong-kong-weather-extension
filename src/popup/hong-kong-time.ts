import type { Language } from "../shared/types";

const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

const HONG_KONG_TIME_LABELS: Record<Language, string> = {
  tc: "香港時間",
  sc: "香港时间",
  en: "Hong Kong Time"
};

const HONG_KONG_TIME_LOCALES: Record<Language, string> = {
  tc: "zh-Hant-HK",
  sc: "zh-Hans-HK",
  en: "en-HK"
};

export function formatHongKongTime(value: Date, language: Language): string {
  const time = new Intl.DateTimeFormat(HONG_KONG_TIME_LOCALES[language], {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: HONG_KONG_TIME_ZONE
  }).format(value);

  return `${HONG_KONG_TIME_LABELS[language]} ${time}`;
}

export function millisecondsUntilNextMinute(value: Date): number {
  const elapsedInMinute = value.getSeconds() * 1000 + value.getMilliseconds();
  return elapsedInMinute === 0 ? 60_000 : 60_000 - elapsedInMinute;
}
