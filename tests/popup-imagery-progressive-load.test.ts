import { describe, expect, test, vi } from "vitest";
import { loadImageryProgressively } from "../src/popup/imagery-loader";
import type { ImageryType } from "../src/shared/types";

describe("progressive popup imagery loading", () => {
  test("renders radar without waiting for lightning metadata", async () => {
    const selectedType: ImageryType = "radar";
    let finishLightning: (() => void) | undefined;
    const events: string[] = [];

    const load = loadImageryProgressively({
      currentType: selectedType,
      otherTypes: ["lightning"],
      hydrateFromStored: async (type) => {
        await Promise.resolve();
        events.push(`hydrate:${type}`);
      },
      refresh: async (type) => {
        events.push(`refresh:${type}`);
        if (type === "lightning") {
          await new Promise<void>((resolve) => {
            finishLightning = resolve;
          });
        }
        events.push(`refreshed:${type}`);
      },
      getCurrentType: () => selectedType,
      renderType: (type) => {
        events.push(`render:${type}`);
      }
    });

    await vi.waitFor(() => expect(events).toContain("refreshed:radar"));

    expect(events).toContain("render:radar");
    expect(events).not.toContain("refreshed:lightning");

    finishLightning?.();
    await load;
  });

  test("hydrates the selected imagery from storage before refreshing metadata", async () => {
    const events: string[] = [];

    await loadImageryProgressively({
      currentType: "radar",
      otherTypes: [],
      hydrateFromStored: async (type) => {
        await Promise.resolve();
        events.push(`hydrate:${type}`);
      },
      refresh: async (type) => {
        await Promise.resolve();
        events.push(`refresh:${type}`);
      },
      getCurrentType: () => "radar",
      renderType: (type) => {
        events.push(`render:${type}`);
      }
    });

    expect(events).toEqual(["hydrate:radar", "render:radar", "refresh:radar", "render:radar"]);
  });
});
