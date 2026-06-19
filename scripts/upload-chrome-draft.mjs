import { readFile } from "node:fs/promises";
import console from "node:console";
import { argv, env } from "node:process";
import path from "node:path";

const zipPath = argv[2];

if (!zipPath) {
  throw new Error("Usage: node scripts/upload-chrome-draft.mjs <extension.zip>");
}

const chromeExtensionId = getEnv("CHROME_EXTENSION_ID");
const chromePublisherId = getEnv("CHROME_PUBLISHER_ID");
const chromeClientId = getEnv("CHROME_CLIENT_ID");
const chromeClientSecret = getEnv("CHROME_CLIENT_SECRET");
const chromeRefreshToken = getEnv("CHROME_REFRESH_TOKEN");

const tokenBody = new URLSearchParams({
  client_id: chromeClientId,
  client_secret: chromeClientSecret,
  grant_type: "refresh_token",
  refresh_token: chromeRefreshToken
});

const tokenResponse = await globalThis.fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  body: tokenBody
});
const tokenPayload = await readResponse(tokenResponse);

if (!tokenResponse.ok) {
  throw new Error(
    `Chrome token request failed (${tokenResponse.status}): ${formatPayload(tokenPayload)}`
  );
}

const accessToken = typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : "";

if (!accessToken) {
  throw new Error("Chrome token response did not include an access token");
}

const packageBytes = await readFile(zipPath);
const uploadUrl = new URL(
  `https://chromewebstore.googleapis.com/upload/v2/publishers/${chromePublisherId}/items/${chromeExtensionId}:upload`
);

const uploadResponse = await globalThis.fetch(uploadUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/zip"
  },
  body: packageBytes
});
const uploadPayload = await readResponse(uploadResponse);

if (!uploadResponse.ok) {
  throw new Error(
    `Chrome draft upload failed (${uploadResponse.status}): ${formatPayload(uploadPayload)}`
  );
}

console.log(`Uploaded Chrome draft package ${path.basename(zipPath)}.`);
console.log(formatPayload(uploadPayload));
console.log("Chrome publish endpoint was not called; submit review manually in the dashboard.");

/**
 * @param {Response} response
 * @returns {Promise<Record<string, unknown>>}
 */
async function readResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    const parsed = /** @type {unknown} */ (JSON.parse(text));
    return isRecord(parsed) ? parsed : { value: parsed };
  } catch {
    return { text };
  }
}

/**
 * @param {unknown} payload
 * @returns {string}
 */
function formatPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

/**
 * @param {string} name
 * @returns {string}
 */
function getEnv(name) {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
