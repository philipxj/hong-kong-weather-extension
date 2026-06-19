import { readFile } from "node:fs/promises";
import console from "node:console";
import { argv, env, exit } from "node:process";
import { setTimeout } from "node:timers/promises";
import path from "node:path";

const zipPath = argv[2];

if (!zipPath) {
  throw new Error("Usage: node scripts/upload-edge-draft.mjs <extension.zip>");
}

const edgeProductId = getEnv("EDGE_PRODUCT_ID");
const edgeClientId = getEnv("EDGE_CLIENT_ID");
const edgeApiKey = getEnv("EDGE_API_KEY");

const endpointRoot = env.EDGE_API_ENDPOINT ?? "https://api.addons.microsoftedge.microsoft.com";
const packageBytes = await readFile(zipPath);
const headers = {
  Authorization: `ApiKey ${edgeApiKey}`,
  "Content-Type": "application/zip",
  "X-ClientID": edgeClientId
};
const uploadUrl = `${endpointRoot}/v1/products/${edgeProductId}/submissions/draft/package`;

const uploadResponse = await globalThis.fetch(uploadUrl, {
  method: "POST",
  headers,
  body: packageBytes
});
const uploadPayload = await readResponse(uploadResponse);

if (uploadResponse.status !== 202) {
  throw new Error(
    `Edge draft upload failed (${uploadResponse.status}): ${formatPayload(uploadPayload)}`
  );
}

const operationId = uploadResponse.headers.get("location");

if (!operationId) {
  throw new Error("Edge draft upload did not return an operation ID in the Location header");
}

console.log(`Uploaded Edge draft package ${path.basename(zipPath)}.`);
console.log(`Edge upload operation: ${operationId}`);

const statusUrl = `${endpointRoot}/v1/products/${edgeProductId}/submissions/draft/package/operations/${operationId}`;
const retryLimit = Number.parseInt(env.EDGE_UPLOAD_POLL_ATTEMPTS ?? "10", 10);
const retryDelayMs = Number.parseInt(env.EDGE_UPLOAD_POLL_DELAY_MS ?? "5000", 10);

for (let attempt = 1; attempt <= retryLimit; attempt += 1) {
  await setTimeout(retryDelayMs);

  const statusResponse = await globalThis.fetch(statusUrl, { headers });
  const statusPayload = await readResponse(statusResponse);

  if (!statusResponse.ok) {
    throw new Error(
      `Edge upload status check failed (${statusResponse.status}): ${formatPayload(statusPayload)}`
    );
  }

  console.log(`Edge upload status attempt ${attempt}: ${formatPayload(statusPayload)}`);

  if (statusPayload.status === "Succeeded") {
    console.log("Edge publish endpoint was not called; submit review manually in Partner Center.");
    exit(0);
  }

  if (statusPayload.status === "Failed") {
    throw new Error(`Edge upload operation failed: ${formatPayload(statusPayload)}`);
  }
}

throw new Error(`Edge upload operation did not finish after ${retryLimit} status checks`);

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
