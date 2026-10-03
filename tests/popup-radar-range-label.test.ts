import { describe, expect, test } from "vitest";

import { compactRadarRangeLabel } from "../src/popup/radar-range-label";

describe("compact radar range labels", () => {
  test("shows km beside the number and preserves a localized accessible label", () => {
    expect(compactRadarRangeLabel("256km", "公里")).toEqual({
      accessible: "256公里",
      visible: "256 km"
    });
    expect(compactRadarRangeLabel("128km", "km")).toEqual({
      accessible: "128km",
      visible: "128 km"
    });
  });

  test("leaves an unexpected label intact", () => {
    expect(compactRadarRangeLabel("Local", "km")).toEqual({
      accessible: "Local",
      visible: "Local"
    });
  });
});
