import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("popup tropical cyclone UI", () => {
  test("renders a dropdown for multiple active tropical cyclones", async () => {
    const html = await readFile(new URL("../src/popup/index.html", import.meta.url), "utf8");

    expect(html).toContain('id="tropical-cyclone-select"');
    expect(html).toContain('class="tropical-cyclone-select"');
    expect(html).toContain('id="typhoon-track-map"');
    expect(html).toContain('id="typhoon-track-map-overlay"');
    expect(html).toContain('id="typhoon-track-map-image"');
    expect(html).toContain('id="typhoon-map-label"');
    expect(html).toContain('id="tropical-cyclone-name"');
    expect(html).toContain('class="external-link-icon"');
    expect(html).toContain('aria-hidden="true"');
  });

  test("wires the single-cyclone name and dropdown selection states", async () => {
    const source = await readFile(new URL("../src/popup/main.ts", import.meta.url), "utf8");

    expect(source).toContain('tropicalCycloneSelect.addEventListener("change"');
    expect(source).toContain('typhoonTrackMap.addEventListener("click"');
    expect(source).toContain("showTropicalCycloneTrackMap(");
    expect(source).toContain("trackMapUrl");
    expect(source).toContain("typhoonMapLabel");
    expect(source).toContain("selectTropicalCyclone(");
    expect(source).toContain("selectedTropicalCycloneIndex");
    expect(source).toContain("tropicalCycloneName");
    expect(source).toContain("els.tropicalCycloneName.textContent = name");
    expect(source).toContain("els.tropicalCycloneName.hidden = activeCyclones.length !== 1");
  });

  test("keeps radar as the default side panel even when tropical cyclones are active", async () => {
    const source = await readFile(new URL("../src/popup/main.ts", import.meta.url), "utf8");

    expect(source).toContain("function defaultSidePanelType(");
    expect(source).toContain("selectSidePanel(defaultSidePanelType())");
    expect(source).not.toContain(
      'selectPrimaryTropicalCyclone(data.tropicalCyclones)\n      ? "typhoon"'
    );
  });

  test("localizes the external tropical cyclone detail button label", async () => {
    const source = await readFile(new URL("../src/popup/main.ts", import.meta.url), "utf8");

    expect(source).toContain('tropicalCycloneTrack: "詳情"');
    expect(source).toContain('tropicalCycloneTrack: "详情"');
    expect(source).toContain('tropicalCycloneTrack: "Detail"');
  });
});
