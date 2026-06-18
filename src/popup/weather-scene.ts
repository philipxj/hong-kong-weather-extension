export type WeatherScene = "sunny" | "rain" | "storm" | "cloudy" | "mist" | "night";

const SUNNY_ICONS = new Set([50, 51, 52, 90, 91]);
const RAIN_ICONS = new Set([53, 54, 62, 63, 64]);
const STORM_ICONS = new Set([65]);
const CLOUDY_ICONS = new Set([60, 61, 80, 81, 82, 92, 93]);
const MIST_ICONS = new Set([83, 84, 85]);
const NIGHT_ICONS = new Set([76, 77]);

export function weatherScene(icon: number | string | null): WeatherScene {
  const value = Number(icon);

  if (NIGHT_ICONS.has(value)) return "night";
  if (SUNNY_ICONS.has(value)) return "sunny";
  if (RAIN_ICONS.has(value)) return "rain";
  if (STORM_ICONS.has(value)) return "storm";
  if (CLOUDY_ICONS.has(value)) return "cloudy";
  if (MIST_ICONS.has(value)) return "mist";

  return "cloudy";
}
