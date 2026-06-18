import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { describe, expect, test } from "vitest";

describe("open source readiness", () => {
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
  });

  test("does not bundle or render the Hong Kong Observatory logo", async () => {
    const popupHtml = await readFile(new URL("../src/popup/index.html", import.meta.url), "utf8");

    await expect(access(new URL("../assets/hko-logo.png", import.meta.url), constants.F_OK))
      .rejects.toThrow();
    expect(popupHtml).not.toContain("hko-logo.png");
    expect(popupHtml).toContain("weather-mark.png");
  });
});
