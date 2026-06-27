import { describe, expect, test } from "vitest";

import { formatHongKongTime, millisecondsUntilNextMinute } from "../src/popup/hong-kong-time";

describe("popup Hong Kong time", () => {
  test("formats traditional Chinese Hong Kong time in 24-hour format", () => {
    const value = new Date("2026-06-27T10:44:30.000Z");

    expect(formatHongKongTime(value, "tc")).toBe("香港時間 18:44");
  });

  test("formats simplified Chinese Hong Kong time in 24-hour format", () => {
    const value = new Date("2026-06-27T10:44:30.000Z");

    expect(formatHongKongTime(value, "sc")).toBe("香港时间 18:44");
  });

  test("formats English Hong Kong time without AM or PM", () => {
    const value = new Date("2026-06-27T16:05:00.000Z");

    expect(formatHongKongTime(value, "en")).toBe("Hong Kong Time 00:05");
  });

  test("aligns the refresh delay to the next minute boundary", () => {
    expect(millisecondsUntilNextMinute(new Date("2026-06-27T10:44:30.250Z"))).toBe(29750);
    expect(millisecondsUntilNextMinute(new Date("2026-06-27T10:44:00.000Z"))).toBe(60000);
  });
});
