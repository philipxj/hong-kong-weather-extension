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
    expect(workflow).toContain(
      "inputs.upload_chrome || inputs.upload_edge || inputs.upload_firefox"
    );
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

  test("Firefox uploads build package and source before submitting to AMO", async () => {
    const workflow = await readFile(
      new URL("../.github/workflows/release-upload.yml", import.meta.url),
      "utf8"
    );

    expect(workflow).toContain("upload_firefox:");
    expect(workflow).toContain(
      "description: Upload the Firefox package and source to AMO and submit it for review."
    );
    expect(workflow).toContain("FIREFOX_ADDON_ID:");
    expect(workflow).toContain("FIREFOX_JWT_ISSUER:");
    expect(workflow).toContain("FIREFOX_JWT_SECRET:");
    expect(workflow).toContain("FIREFOX_LICENSE: ${{ vars.FIREFOX_LICENSE || 'MIT' }}");
    expect(workflow).toContain("FIREFOX_SUBMISSION_NOTES:");
    expect(workflow.indexOf("name: Package Firefox extension")).toBeGreaterThan(
      workflow.indexOf("run: npm test")
    );
    expect(workflow.indexOf("name: Package source archive")).toBeGreaterThan(
      workflow.indexOf("name: Package Firefox extension")
    );
    expect(workflow.indexOf("name: Upload Firefox Add-ons draft")).toBeGreaterThan(
      workflow.indexOf("name: Package source archive")
    );
    expect(workflow).toContain("npm run package:firefox");
    expect(workflow).toContain("npm run package:source");
    expect(workflow).toContain("node scripts/upload-firefox-draft.mjs");
  });

  test("Firefox upload auto-submits when requested and skips when credentials are missing", async () => {
    const workflow = await readFile(
      new URL("../.github/workflows/release-upload.yml", import.meta.url),
      "utf8"
    );

    expect(workflow).not.toContain("submit_firefox");
    expect(workflow).toContain(
      "if: ${{ inputs.upload_firefox && env.FIREFOX_ADDON_ID != '' && env.FIREFOX_JWT_ISSUER != '' && env.FIREFOX_JWT_SECRET != '' }}"
    );
    expect(workflow).toContain(
      "if: ${{ !inputs.upload_firefox || env.FIREFOX_ADDON_ID == '' || env.FIREFOX_JWT_ISSUER == '' || env.FIREFOX_JWT_SECRET == '' }}"
    );
    expect(workflow).toContain(
      'run: echo "Firefox Add-ons upload/submission was not requested or credentials are incomplete; uploaded the package artifacts only."'
    );
  });
});
