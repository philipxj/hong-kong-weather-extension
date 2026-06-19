import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { describe, expect, test } from "vitest";

describe("open source readiness", () => {
  test("uses the localized product name in browser manifests", async () => {
    const [chromiumManifest, firefoxManifest] = await Promise.all([
      readFile(new URL("../manifests/chromium.json", import.meta.url), "utf8"),
      readFile(new URL("../manifests/firefox.json", import.meta.url), "utf8")
    ]);

    for (const manifestText of [chromiumManifest, firefoxManifest]) {
      const manifest = JSON.parse(manifestText) as {
        name?: string;
        action?: { default_title?: string };
      };
      expect(manifest.name).toBe("香港天氣預報");
      expect(manifest.action?.default_title).toBe("香港天氣預報");
    }
  });

  test("documents license, data attribution, and unofficial status", async () => {
    const [license, notice, readme] = await Promise.all([
      readFile(new URL("../LICENSE", import.meta.url), "utf8"),
      readFile(new URL("../NOTICE.md", import.meta.url), "utf8"),
      readFile(new URL("../README.md", import.meta.url), "utf8")
    ]);

    expect(license).toContain("MIT License");
    expect(notice).toContain("DATA.GOV.HK");
    expect(notice).toContain("Hong Kong Observatory");
    expect(notice).toContain("not affiliated with or endorsed by");
    expect(readme).toMatch(/unofficial/i);
    expect(readme).toContain("Hong Kong Observatory Open Data");
    expect(readme).toContain("https://chromewebstore.google.com/detail/");
    expect(readme).not.toContain("Chrome Web Store: Coming soon");
  });

  test("does not bundle or render the Hong Kong Observatory logo", async () => {
    const popupHtml = await readFile(new URL("../src/popup/index.html", import.meta.url), "utf8");

    await expect(
      access(new URL("../assets/hko-logo.png", import.meta.url), constants.F_OK)
    ).rejects.toThrow();
    expect(popupHtml).not.toContain("hko-logo.png");
    expect(popupHtml).not.toContain("weather-mark.png");
    expect(popupHtml).toContain("observatory-link-icon");
    expect(popupHtml).toContain("HKO");
    expect(popupHtml).toContain("Open Hong Kong Observatory");
  });
});
