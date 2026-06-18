import { describe, expect, test } from "vitest";
import { formatSpecialWeatherTips } from "../src/popup/special-weather";

describe("popup special weather tips", () => {
  test("formats available tips for the compact widget", () => {
    expect(formatSpecialWeatherTips(["局部地區有大雨", "市民應提高警覺"])).toBe(
      "局部地區有大雨、市民應提高警覺"
    );
  });

  test("returns null when no tips are available", () => {
    expect(formatSpecialWeatherTips([])).toBeNull();
    expect(formatSpecialWeatherTips(["", "   "])).toBeNull();
  });
});
