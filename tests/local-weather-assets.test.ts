import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import {
  HKO_WARNING_ICON_PREFIXES,
  HKO_WEATHER_ICON_CODES,
  warningSignalIconAssetPath,
  warningSignalText,
  weatherIconAssetPath
} from "../src/shared/local-weather-assets";
import type { WeatherWarning } from "../src/shared/types";

describe("local weather assets", () => {
  test("maps HKO weather icon codes to bundled HKO assets", () => {
    expect(weatherIconAssetPath(50)).toBe("assets/hko/weather-icons/pic50.png");
    expect(weatherIconAssetPath(64)).toBe("assets/hko/weather-icons/pic64.png");
    expect(weatherIconAssetPath(65)).toBe("assets/hko/weather-icons/pic65.png");
    expect(weatherIconAssetPath(70)).toBe("assets/hko/weather-icons/pic70.png");
    expect(weatherIconAssetPath(75)).toBe("assets/hko/weather-icons/pic75.png");
    expect(weatherIconAssetPath(83)).toBe("assets/hko/weather-icons/pic83.png");
    expect(weatherIconAssetPath(null)).toBe("");
  });

  test("maps warning signals to bundled HKO assets", () => {
    expect(signalIconPath({ badge: "黑", code: "WRAINB", type: "rain-black" })).toBe(
      "assets/hko/warning-icons/rainb.gif"
    );
    expect(signalIconPath({ badge: "山", code: "WL", type: "landslip" })).toBe(
      "assets/hko/warning-icons/landslip.gif"
    );
    expect(signalIconPath({ badge: "", code: "WTS", type: "thunderstorm" })).toBe(
      "assets/hko/warning-icons/ts.gif"
    );
    expect(signalIconPath({ badge: "T8", code: "TC8NE", type: "typhoon" })).toBe(
      "assets/hko/warning-icons/tc8ne.gif"
    );
  });

  test("does not expose remote HKO image URLs", () => {
    expect(weatherIconAssetPath(52)).not.toContain("www.hko.gov.hk");
    expect(signalIconPath({ badge: "雷", code: "WTS", type: "thunderstorm" })).not.toContain(
      "www.hko.gov.hk"
    );
  });

  test("keeps bundled HKO weather and warning icon files in the repo", async () => {
    await Promise.all([
      ...HKO_WEATHER_ICON_CODES.map((code) =>
        access(
          new URL(`../assets/hko/weather-icons/pic${code}.png`, import.meta.url),
          constants.F_OK
        )
      ),
      ...HKO_WARNING_ICON_PREFIXES.map((prefix) =>
        access(
          new URL(`../assets/hko/warning-icons/${prefix}.gif`, import.meta.url),
          constants.F_OK
        )
      )
    ]);
  });

  test("falls back to local warning text when no bundled HKO warning icon exists", () => {
    expect(signalIconPath({ badge: "", code: "WOTHER", type: "other" })).toBe("");
    expect(signalText({ badge: "", code: "WOTHER", name: "Other warning" })).toBe("WOTHER");
  });
});

function signalText(warning: Pick<WeatherWarning, "badge" | "code" | "name">): string {
  return warningSignalText(warning);
}

function signalIconPath(warning: Pick<WeatherWarning, "badge" | "code" | "type">): string {
  return warningSignalIconAssetPath(warning);
}
