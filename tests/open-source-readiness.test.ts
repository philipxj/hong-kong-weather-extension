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

  test("allows official HKO Open Data and required image hosts", async () => {
    const [chromiumManifest, firefoxManifest] = await Promise.all([
      readFile(new URL("../manifests/chromium.json", import.meta.url), "utf8"),
      readFile(new URL("../manifests/firefox.json", import.meta.url), "utf8")
    ]);

    for (const manifestText of [chromiumManifest, firefoxManifest]) {
      const manifest = JSON.parse(manifestText) as { host_permissions?: string[] };
      expect(manifest.host_permissions).toEqual(
        expect.arrayContaining([
          "https://data.weather.gov.hk/*",
          "https://www.weather.gov.hk/*",
          "https://www.hko.gov.hk/*"
        ])
      );
    }
  });

  test("documents license, data attribution, and unofficial status", async () => {
    const [license, notice, readme, hkoNotice] = await Promise.all([
      readFile(new URL("../LICENSE", import.meta.url), "utf8"),
      readFile(new URL("../NOTICE.md", import.meta.url), "utf8"),
      readFile(new URL("../README.md", import.meta.url), "utf8"),
      readFile(new URL("../assets/hko/NOTICE.md", import.meta.url), "utf8")
    ]);

    expect(license).toContain("MIT License");
    expect(notice).toContain("DATA.GOV.HK");
    expect(notice).toContain("Hong Kong Observatory");
    expect(notice).toContain("not affiliated with or endorsed by");
    expect(readme).toMatch(/unofficial/i);
    expect(readme).toContain("Hong Kong Observatory Open Data");
    expect(readme).toContain("assets/hko/");
    expect(hkoNotice).toContain("not licensed under this repository's MIT License");
    expect(hkoNotice).toContain("non-commercial");
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

  test("keeps extension pages free of inline scripts", async () => {
    const htmlFiles = [
      new URL("../src/options/index.html", import.meta.url),
      new URL("../src/popup/index.html", import.meta.url)
    ];

    for (const file of htmlFiles) {
      const html = await readFile(file, "utf8");
      const inlineScripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>/gi)];
      expect(inlineScripts).toEqual([]);
    }
  });

  test("shows the direct file warning without requiring popup scripts", async () => {
    const popupHtml = await readFile(new URL("../src/popup/index.html", import.meta.url), "utf8");

    expect(popupHtml).toContain("不能直接用 file:// 開啟 popup；請用開發伺服器或載入擴充功能。");
    expect(popupHtml).not.toContain("file-preview.js");
  });
});
