import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("popup imagery step hint wiring", () => {
  test("renders a non-interactive imagery step hint overlay in the popup markup", async () => {
    const html = await readFile(new URL("../src/popup/index.html", import.meta.url), "utf8");

    expect(html).toContain('id="imagery-step-hint"');
    expect(html).toContain('class="imagery-step-hint"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("imagery-step-hint-left");
    expect(html).toContain("imagery-step-hint-right");
  });

  test("persists imagery step hint dismissal through the browser API wrapper", async () => {
    const source = await readFile(new URL("../src/popup/main.ts", import.meta.url), "utf8");

    expect(source).toContain('IMAGERY_STEP_HINT_STORAGE_KEY = "imageryStepHintDismissed"');
    expect(source).toContain("browserApi.storage.local.get<boolean>(IMAGERY_STEP_HINT_STORAGE_KEY)");
    expect(source).toContain("browserApi.storage.local.set({ [IMAGERY_STEP_HINT_STORAGE_KEY]: true })");
  });
});
