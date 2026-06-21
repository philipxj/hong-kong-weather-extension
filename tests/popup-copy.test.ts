import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("popup copy", () => {
  test("localizes the imagery expand toast without mixed English in Chinese copy", async () => {
    const source = await readFile(new URL("../src/popup/main.ts", import.meta.url), "utf8");

    expect(source).toContain('imageryExpandHint: "連按圖像放大"');
    expect(source).toContain('imageryExpandHint: "连按图像放大"');
    expect(source).toContain('imageryExpandHint: "Double-click image to expand"');
    expect(source).not.toMatch(/imageryExpandHint: "已放大/);
  });
});
