import { describe, expect, test } from "vitest";

import {
  selectImagerySnapshots,
  selectSpacedImagerySnapshots
} from "../src/popup/imagery-snapshots";

describe("popup imagery snapshots", () => {
  test("selects five radar frames with a wider source interval when enough frames exist", () => {
    const urls = Array.from({ length: 15 }, (_, index) => `radar-${index}`);

    expect(selectImagerySnapshots("radar", urls)).toEqual([
      { originalIndex: 2, url: "radar-2" },
      { originalIndex: 5, url: "radar-5" },
      { originalIndex: 8, url: "radar-8" },
      { originalIndex: 11, url: "radar-11" },
      { originalIndex: 14, url: "radar-14" }
    ]);
  });

  test("keeps lightning frames consecutive", () => {
    const urls = Array.from({ length: 15 }, (_, index) => `lightning-${index}`);

    expect(selectImagerySnapshots("lightning", urls)).toEqual([
      { originalIndex: 10, url: "lightning-10" },
      { originalIndex: 11, url: "lightning-11" },
      { originalIndex: 12, url: "lightning-12" },
      { originalIndex: 13, url: "lightning-13" },
      { originalIndex: 14, url: "lightning-14" }
    ]);
  });

  test("evenly samples available frames when there are not enough for the preferred gap", () => {
    const urls = Array.from({ length: 8 }, (_, index) => `radar-${index}`);

    expect(selectSpacedImagerySnapshots(urls)).toEqual([
      { originalIndex: 0, url: "radar-0" },
      { originalIndex: 2, url: "radar-2" },
      { originalIndex: 4, url: "radar-4" },
      { originalIndex: 5, url: "radar-5" },
      { originalIndex: 7, url: "radar-7" }
    ]);
  });

  test("keeps all frames when five or fewer are available", () => {
    const urls = ["radar-0", "radar-1", "radar-2"];

    expect(selectSpacedImagerySnapshots(urls)).toEqual([
      { originalIndex: 0, url: "radar-0" },
      { originalIndex: 1, url: "radar-1" },
      { originalIndex: 2, url: "radar-2" }
    ]);
  });
});
