import { describe, expect, test } from "vitest";

import { sidePanelFullTitle, sidePanelTabTitle } from "../src/popup/imagery-tabs";

describe("popup imagery tabs", () => {
  test("uses compact English labels while keeping full accessible titles", () => {
    expect(sidePanelTabTitle("radar", "en", 2)).toBe("Radar");
    expect(sidePanelTabTitle("lightning", "en", 2)).toBe("Lightning");
    expect(sidePanelTabTitle("typhoon", "en", 2)).toBe("Cyclone 2");

    expect(sidePanelFullTitle("radar", "en", 2)).toBe("Radar Image");
    expect(sidePanelFullTitle("lightning", "en", 2)).toBe("Lightning");
    expect(sidePanelFullTitle("typhoon", "en", 2)).toBe("Tropical Cyclone 2");
  });

  test("keeps Chinese labels short in the compact tab row", () => {
    expect(sidePanelTabTitle("radar", "tc", 3)).toBe("雷達");
    expect(sidePanelTabTitle("lightning", "tc", 3)).toBe("閃電");
    expect(sidePanelTabTitle("typhoon", "tc", 3)).toBe("颱風 3");

    expect(sidePanelFullTitle("typhoon", "tc", 3)).toBe("熱帶氣旋 3");
  });
});
