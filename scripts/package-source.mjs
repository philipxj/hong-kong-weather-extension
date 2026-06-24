import { mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import console from "node:console";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const release = path.join(root, "release");
const packageJson = parseJsonObject(await readFile(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;

if (typeof version !== "string" || version.length === 0) {
  throw new Error("Missing package version in package.json");
}

await mkdir(release, { recursive: true });

const zipPath = path.join(release, `hong-kong-weather-extension-${version}-source.zip`);
await rm(zipPath, { force: true });

const archiveResult = spawnSync("git", ["archive", "--format=zip", "--output", zipPath, "HEAD"], {
  cwd: root,
  encoding: "utf8"
});

if (archiveResult.status !== 0) {
  throw new Error(`git archive failed: ${archiveResult.stderr || archiveResult.stdout}`);
}

const listingResult = spawnSync("unzip", ["-Z1", zipPath], {
  encoding: "utf8"
});

if (listingResult.status !== 0) {
  throw new Error(`source zip validation failed: ${listingResult.stderr || listingResult.stdout}`);
}

const zipEntries = listingResult.stdout.trim().split("\n");

if (!zipEntries.includes("package.json") || !zipEntries.includes("package-lock.json")) {
  throw new Error("Source zip must include package.json and package-lock.json");
}

console.log(zipPath);

/**
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
function parseJsonObject(text) {
  const parsed = /** @type {unknown} */ (JSON.parse(text));

  if (isRecord(parsed)) {
    return parsed;
  }

  throw new Error("Expected a JSON object");
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
