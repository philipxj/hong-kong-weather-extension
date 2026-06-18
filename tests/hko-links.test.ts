import { describe, expect, test } from "vitest";
import { hkoPageUrl } from "../src/shared/hko-links";

describe("HKO links", () => {
  test("builds special weather tips links for the selected language", () => {
    expect(hkoPageUrl("tc", "sweather_tips.html")).toBe(
      "https://www.hko.gov.hk/tc/sweather_tips.html"
    );
    expect(hkoPageUrl("sc", "sweather_tips.html")).toBe(
      "https://www.hko.gov.hk/sc/sweather_tips.html"
    );
    expect(hkoPageUrl("en", "sweather_tips.html")).toBe(
      "https://www.hko.gov.hk/en/sweather_tips.html"
    );
  });
});
