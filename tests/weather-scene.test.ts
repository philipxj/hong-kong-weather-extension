import { describe, expect, test } from "vitest";
import { weatherScene } from "../src/popup/weather-scene";

describe("weather scene mapping", () => {
  test("maps HKO weather icons to hero scenes", () => {
    expect(weatherScene(50)).toBe("sunny");
    expect(weatherScene(64)).toBe("rain");
    expect(weatherScene(65)).toBe("storm");
    expect(weatherScene(60)).toBe("cloudy");
    expect(weatherScene(83)).toBe("mist");
    expect(weatherScene(77)).toBe("night");
    expect(weatherScene(null)).toBe("cloudy");
  });
});
