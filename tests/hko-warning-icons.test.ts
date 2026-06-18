import { describe, expect, test } from "vitest";
import { hkoWarningIconUrl } from "../src/shared/hko-warning-icons";
import type { WeatherWarning } from "../src/shared/types";

describe("HKO warning icons", () => {
  test("uses HKO warning image assets for active warning signals", () => {
    expect(iconUrl({ badge: "黑", code: "WRAINB", type: "rain-black" })).toBe(
      "https://www.hko.gov.hk/images_e/rainb.gif"
    );
    expect(iconUrl({ badge: "山", code: "WL", type: "landslip" })).toBe(
      "https://www.hko.gov.hk/images_e/landslip.gif"
    );
    expect(iconUrl({ badge: "雷", code: "WTS", type: "thunderstorm" })).toBe(
      "https://www.hko.gov.hk/images_e/ts.gif"
    );
    expect(iconUrl({ badge: "水", code: "WFNTSA", type: "flooding" })).toBe(
      "https://www.hko.gov.hk/images_e/ntfl.gif"
    );
  });
});

function iconUrl(warning: Pick<WeatherWarning, "badge" | "code" | "type">): string {
  return hkoWarningIconUrl(warning);
}
