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
    expect(iconUrl({ badge: "季", code: "WMSGNL", type: "monsoon" })).toBe(
      "https://www.hko.gov.hk/images_e/sms.gif"
    );
    expect(iconUrl({ badge: "霜", code: "WFROST", type: "frost" })).toBe(
      "https://www.hko.gov.hk/images_e/frost.gif"
    );
    expect(iconUrl({ badge: "火", code: "WFIREY", type: "fire-yellow" })).toBe(
      "https://www.hko.gov.hk/images_e/firey.gif"
    );
    expect(iconUrl({ badge: "火", code: "WFIRER", type: "fire-red" })).toBe(
      "https://www.hko.gov.hk/images_e/firer.gif"
    );
    expect(iconUrl({ badge: "海嘯", code: "WTMW", type: "tsunami" })).toBe(
      "https://www.hko.gov.hk/images_e/tsunami-warn.gif"
    );
  });
});

function iconUrl(warning: Pick<WeatherWarning, "badge" | "code" | "type">): string {
  return hkoWarningIconUrl(warning);
}
