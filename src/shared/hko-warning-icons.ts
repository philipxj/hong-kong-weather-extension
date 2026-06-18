import type { WeatherWarning } from "./types";

const HKO_WARNING_ICON_ROOT = "https://www.hko.gov.hk/images_e";

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

export function hkoWarningIconUrl(
  warning: Pick<WeatherWarning, "badge" | "code" | "type">
): string {
  const prefix = hkoWarningIconPrefix(warning);
  return prefix ? `${HKO_WARNING_ICON_ROOT}/${prefix}.gif` : "";
}

export function hkoWarningIconPrefix(
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
  if (code === "WMSGNL" || warning.type === "monsoon") return "msn";
  if (code === "WHOT" || warning.type === "heat") return "vhot";
  if (code === "WCOLD" || warning.type === "cold") return "cold";

  if (code in TYPHOON_ICON_PREFIXES) return TYPHOON_ICON_PREFIXES[code] ?? "";
  if (badge in TYPHOON_ICON_PREFIXES) return TYPHOON_ICON_PREFIXES[badge] ?? "";

  return "";
}
