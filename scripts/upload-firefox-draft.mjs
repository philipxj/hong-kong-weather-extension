import { readFile } from "node:fs/promises";
import console from "node:console";
import { argv, env } from "node:process";
import path from "node:path";
import { formatPayload, uploadFirefoxDraft } from "./firefox-addons-api.mjs";

const zipPath = argv[2];
const sourceZipPath = argv[3];

if (!zipPath || !sourceZipPath) {
  throw new Error("Usage: node scripts/upload-firefox-draft.mjs <firefox.zip> <source.zip>");
}

const effectiveEnv = await createEffectiveEnv(env);
const result = await uploadFirefoxDraft({
  zipPath,
  sourceZipPath,
  env: effectiveEnv,
  fetchImpl: globalThis.fetch,
  readFileImpl: readFile
});

console.log(`Uploaded Firefox package ${path.basename(zipPath)} to AMO.`);
console.log(`Firefox upload UUID: ${result.uploadUuid}`);
console.log(`Firefox upload response: ${formatPayload(result.uploadPayload)}`);
console.log(`Submitted Firefox version ${result.version} for review.`);
console.log(`Firefox version response: ${formatPayload(result.versionPayload)}`);
console.log(`Firefox metadata response: ${formatPayload(result.metadataPayload ?? {})}`);

/**
 * @param {NodeJS.ProcessEnv} processEnv
 * @returns {Promise<Record<string, string | undefined>>}
 */
async function createEffectiveEnv(processEnv) {
  const root = path.resolve(import.meta.dirname, "..");
  const packageJson = await readJsonObject(path.join(root, "package.json"));
  const version = typeof packageJson.version === "string" ? packageJson.version : undefined;
  const releaseNotes =
    processEnv.FIREFOX_RELEASE_NOTES ??
    (version
      ? await readReleaseNotes(path.join(root, "docs", "store-listing.md"), version)
      : undefined);
  const submissionNotes =
    processEnv.FIREFOX_SUBMISSION_NOTES ??
    (await readReviewerNotes(path.join(root, "docs", "amo-source-build.md")));

  return {
    ...processEnv,
    FIREFOX_RELEASE_NOTES: releaseNotes,
    FIREFOX_SUBMISSION_NOTES: submissionNotes
  };
}

/**
 * @param {string} filePath
 * @returns {Promise<Record<string, unknown>>}
 */
async function readJsonObject(filePath) {
  const parsed = /** @type {unknown} */ (JSON.parse(await readFile(filePath, "utf8")));

  if (isRecord(parsed)) {
    return parsed;
  }

  throw new Error(`Expected ${filePath} to contain a JSON object`);
}

/**
 * @param {string} filePath
 * @param {string} version
 * @returns {Promise<string | undefined>}
 */
async function readReleaseNotes(filePath, version) {
  const markdown = await readFile(filePath, "utf8");
  const escapedVersion = escapeRegExp(version);
  const headingMatch = new RegExp(`^#### ${escapedVersion}\\s*$`, "m").exec(markdown);

  if (!headingMatch) {
    return undefined;
  }

  const bodyStart = headingMatch.index + headingMatch[0].length;
  const body = markdown.slice(bodyStart).replace(/^\n+/, "");
  const nextHeadingIndex = body.search(/\n(?:#### |## )/);
  const section = nextHeadingIndex === -1 ? body : body.slice(0, nextHeadingIndex);

  return section.trim();
}

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function readReviewerNotes(filePath) {
  const markdown = await readFile(filePath, "utf8");

  return `Submitted by release workflow. Reproducible source build instructions:\n\n${markdown}`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
