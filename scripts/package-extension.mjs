import { mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import console from "node:console";
import { argv } from "node:process";
import path from "node:path";

const target = argv[2] ?? "chromium";
const supportedTargets = new Set(["chromium"]);

if (!supportedTargets.has(target)) {
  throw new Error(`Unsupported package target: ${target}`);
}

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist", target);
const release = path.join(root, "release");
const manifestPath = path.join(dist, "manifest.json");
const manifest = parseJsonObject(await readFile(manifestPath, "utf8"));
const version = manifest.version;

if (typeof version !== "string" || version.length === 0) {
  throw new Error(`Missing manifest version in ${manifestPath}`);
}

await mkdir(release, { recursive: true });

const zipPath = path.join(release, `hong-kong-weather-extension-${version}-${target}.zip`);
await rm(zipPath, { force: true });

const zipResult = spawnSync("zip", ["-r", "-q", zipPath, ".", "-x", "*.DS_Store", "__MACOSX/*"], {
  cwd: dist,
  encoding: "utf8"
});

if (zipResult.status !== 0) {
  throw new Error(`zip failed: ${zipResult.stderr || zipResult.stdout}`);
}

const listingResult = spawnSync("unzip", ["-Z1", zipPath], {
  encoding: "utf8"
});

if (listingResult.status !== 0) {
  throw new Error(`zip validation failed: ${listingResult.stderr || listingResult.stdout}`);
}

const zipEntries = listingResult.stdout.trim().split("\n");

if (!zipEntries.includes("manifest.json")) {
  throw new Error("Packaged extension zip must contain manifest.json at the archive root");
}

if (zipEntries.some((entry) => entry.startsWith("dist/") || entry.startsWith(`${target}/`))) {
  throw new Error("Packaged extension zip must not wrap the extension in an extra directory");
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
