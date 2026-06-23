import { readFile } from "node:fs/promises";
import console from "node:console";
import { argv, env } from "node:process";
import { syncGitHubRelease } from "./github-release-api.mjs";

const zipPath = argv[2];

if (!zipPath) {
  throw new Error("Usage: node scripts/sync-github-release.mjs <extension.zip>");
}

const result = await syncGitHubRelease({
  zipPath,
  env,
  fetchImpl: globalThis.fetch,
  readFileImpl: readFile
});

console.log(`Synced GitHub Release ${result.tagName}.`);
console.log(`Release URL: ${result.releaseUrl}`);
console.log(`Release asset: ${result.assetName}`);
