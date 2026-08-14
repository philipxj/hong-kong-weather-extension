import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("popup weather refresh ownership", () => {
  test("delegates cache refreshes to the background", async () => {
    const source = await readFile(new URL("../src/popup/main.ts", import.meta.url), "utf8");

    expect(source).not.toContain("refreshWeather(state.settings)");
    expect(source).not.toContain("updateBadge(data, state.settings)");
    expect(source).toMatch(
      /sendMessage<RefreshWeatherResponse>\(\{\s*type: "refreshWeather",\s*force\s*\}\)/
    );
  });

  test("options delegates weather refresh writes to the background", async () => {
    const source = await readFile(new URL("../src/options/main.ts", import.meta.url), "utf8");

    expect(source).not.toContain("refreshWeather(next)");
    expect(source).toMatch(/type: "refreshWeather",\s*force: true/);
  });

  test("options expose the same safe refresh interval bounds as runtime validation", async () => {
    const html = await readFile(new URL("../src/options/index.html", import.meta.url), "utf8");

    expect(html).toContain('id="currentRefreshMinutes" type="number" min="10" max="120" step="1"');
    expect(html).toContain('id="warningCheckMinutes" type="number" min="5" max="60" step="1"');
  });
});
