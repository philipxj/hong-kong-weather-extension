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

  test("Edge uploads are submitted for review automatically", async () => {
    const workflow = await readFile(
      new URL("../.github/workflows/release-upload.yml", import.meta.url),
      "utf8"
    );

    expect(workflow).not.toContain("submit_edge:");
    expect(workflow).not.toContain("inputs.submit_edge");
    expect(workflow).toContain(
      "description: Upload the package to Microsoft Edge Add-ons, submit it for review, and publish automatically after certification."
    );
    expect(workflow).toContain(
      "EDGE_SUBMIT_REVIEW: ${{ inputs.upload_edge && 'true' || 'false' }}"
    );
    expect(workflow).toContain(
      "if: ${{ inputs.upload_edge && env.EDGE_PRODUCT_ID != '' && env.EDGE_CLIENT_ID != '' && env.EDGE_API_KEY != '' }}"
    );
  });
});
