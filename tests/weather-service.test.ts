import { describe, expect, test } from "vitest";
import { normalizeWeather } from "../src/shared/weather-service";

describe("weather service normalization", () => {
  test("normalizes active warning badges from warnsum codes", () => {
    const weather = normalizeWeather({
      settings: { language: "tc" },
      fetchedAt: "2026-06-18T04:00:00.000Z",
      stale: false,
      error: null,
      current: {
        icon: [64],
        specialWxTips: ["局部地區有大雨"],
        uvindex: { data: [{ value: 0.4, desc: "低" }] },
        temperature: { data: [{ place: "香港天文台", value: 28 }] },
        humidity: { data: [{ place: "香港天文台", value: 87 }] }
      },
      forecast: { weatherForecast: [] },
      warnsum: {
        WRAIN: {
          name: "暴雨警告信號",
          code: "WRAINA",
          type: "黃色",
          issueTime: "2026-06-18T11:15:00+08:00"
        },
        WTS: {
          name: "雷暴警告",
          code: "WTS",
          issueTime: "2026-06-18T01:30:00+08:00"
        }
      },
      warningInfo: { details: [] }
    });

    const badges = new Map(weather.warnings.map((warning) => [warning.code, warning.badge]));
    expect(badges.get("WRAINA")).toBe("黃");
    expect(badges.get("WTS")).toBe("雷");
    expect(weather.current.tips).toEqual(["局部地區有大雨"]);
    expect(weather.current.uvIndex).toBe(0.4);
    expect(weather.current.uvDesc).toBe("低");
  });
});
