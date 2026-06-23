import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

describe("Release Upload workflow", () => {
  test("syncs GitHub Releases before store uploads are submitted", async () => {
    const workflow = await readFile(
      new URL("../.github/workflows/release-upload.yml", import.meta.url),
      "utf8"
    );

    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("name: Sync GitHub Release");
    expect(workflow).toContain("node scripts/sync-github-release.mjs");
    expect(workflow.indexOf("name: Sync GitHub Release")).toBeLessThan(
      workflow.indexOf("name: Upload Chrome Web Store draft")
    );
    expect(workflow).toContain("inputs.upload_chrome || inputs.upload_edge");
  });
});
