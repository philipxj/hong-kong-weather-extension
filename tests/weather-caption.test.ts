import { describe, expect, test } from "vitest";
import { weatherCaption } from "../src/popup/weather-caption";
import { HKO_WEATHER_ICON_CODES } from "../src/shared/local-weather-assets";
import type { Language } from "../src/shared/types";

describe("weather caption mapping", () => {
  test("provides a caption for every bundled HKO weather icon in every language", () => {
    const languages: Language[] = ["tc", "sc", "en"];

    for (const language of languages) {
      for (const code of HKO_WEATHER_ICON_CODES) {
        expect(weatherCaption(code, language), `${language} icon ${code}`).not.toBe("");
      }
    }
  });

  test("uses a compact fine-weather caption for lunar-phase night icons", () => {
    expect(weatherCaption(70, "tc")).toBe("天色良好");
    expect(weatherCaption(75, "sc")).toBe("天色良好");
    expect(weatherCaption(72, "en")).toBe("Fine");
  });

  test("returns an empty caption for an unknown icon", () => {
    expect(weatherCaption(999, "tc")).toBe("");
    expect(weatherCaption(null, "en")).toBe("");
  });
});
