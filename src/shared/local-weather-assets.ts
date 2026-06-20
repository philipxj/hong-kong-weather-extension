import type { WeatherWarning } from "./types";

const WEATHER_ICON_ROOT = "assets/hko/weather-icons";
const WARNING_ICON_ROOT = "assets/hko/warning-icons";

export const HKO_WEATHER_ICON_CODES = [
  "50",
  "51",
  "52",
  "53",
  "54",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "76",
  "77",
  "80",
  "81",
  "82",
  "83",
  "84",
  "85",
  "90",
  "91",
  "92",
  "93"
] as const;

export const HKO_WARNING_ICON_PREFIXES = [
  "raina",
  "rainr",
  "rainb",
  "ts",
  "landslip",
  "ntfl",
  "sms",
  "frost",
  "firey",
  "firer",
  "vhot",
  "cold",
  "tsunami-warn",
  "tc1",
  "tc3",
  "tc8ne",
  "tc8nw",
  "tc8se",
  "tc8sw",
  "tc9",
  "tc10"
] as const;

const WEATHER_ICON_CODES = new Set<string>(HKO_WEATHER_ICON_CODES);

const TYPHOON_ICON_PREFIXES: Record<string, string> = {
  TC1: "tc1",
  TC3: "tc3",
  TC8NE: "tc8ne",
  TC8NW: "tc8nw",
  TC8SE: "tc8se",
  TC8SW: "tc8sw",
  TC9: "tc9",
  TC10: "tc10"
};

export function weatherIconAssetPath(icon: number | string | null): string {
  if (icon == null || icon === "") return "";
  const code = String(icon);
  return WEATHER_ICON_CODES.has(code) ? `${WEATHER_ICON_ROOT}/pic${code}.png` : "";
}

export function warningSignalIconAssetPath(
  warning: Pick<WeatherWarning, "badge" | "code" | "type">
): string {
  const prefix = warningSignalIconPrefix(warning);
  return prefix ? `${WARNING_ICON_ROOT}/${prefix}.gif` : "";
}

export function warningSignalIconPrefix(
  warning: Pick<WeatherWarning, "badge" | "code" | "type">
): string {
  const code = warning.code.toUpperCase();
  const badge = warning.badge.toUpperCase().replace(/\s+/g, "");

  if (code === "WRAINB" || warning.type === "rain-black") return "rainb";
  if (code === "WRAINR" || warning.type === "rain-red") return "rainr";
  if (code === "WRAINA" || warning.type === "rain-amber") return "raina";
  if (code === "WTS" || warning.type === "thunderstorm") return "ts";
  if (code === "WL" || warning.type === "landslip") return "landslip";
  if (code === "WFNTSA" || warning.type === "flooding") return "ntfl";
  if (code === "WMSGNL" || warning.type === "monsoon") return "sms";
  if (code === "WFROST" || warning.type === "frost") return "frost";
  if (code === "WFIREY" || warning.type === "fire-yellow") return "firey";
  if (code === "WFIRER" || warning.type === "fire-red") return "firer";
  if (code === "WHOT" || warning.type === "heat") return "vhot";
  if (code === "WCOLD" || warning.type === "cold") return "cold";
  if (code === "WTMW" || warning.type === "tsunami") return "tsunami-warn";

  if (code in TYPHOON_ICON_PREFIXES) return TYPHOON_ICON_PREFIXES[code] ?? "";
  if (badge in TYPHOON_ICON_PREFIXES) return TYPHOON_ICON_PREFIXES[badge] ?? "";

  return "";
}

export function warningSignalText(
  warning: Pick<WeatherWarning, "badge" | "code" | "name">
): string {
  return firstText(warning.badge, warning.code, warning.name);
}

function firstText(...values: Array<string | undefined>): string {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}
