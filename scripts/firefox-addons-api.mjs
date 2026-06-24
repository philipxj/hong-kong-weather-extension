import { Buffer } from "node:buffer";
import { createHmac, randomUUID } from "node:crypto";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULT_ENDPOINT_ROOT = "https://addons.mozilla.org/api/v5";
const DEFAULT_REVIEWER_NOTES =
  "Submitted by release workflow. See docs/amo-source-build.md for reproducible build instructions.";

/**
 * @param {{
 *   zipPath: string;
 *   sourceZipPath: string;
 *   env: Record<string, string | undefined>;
 *   fetchImpl: typeof fetch;
 *   readFileImpl: (path: string) => Promise<BodyInit>;
 *   setTimeoutImpl?: (delay: number) => Promise<void>;
 *   nowImpl?: () => number;
 *   nonceImpl?: () => string;
 * }} options
 * @returns {Promise<{
 *   metadataPayload?: Record<string, unknown>;
 *   uploadPayload: Record<string, unknown>;
 *   uploadUuid: string;
 *   version: string;
 *   versionPayload: Record<string, unknown>;
 * }>}
 */
export async function uploadFirefoxDraft({
  zipPath,
  sourceZipPath,
  env,
  fetchImpl,
  readFileImpl,
  setTimeoutImpl = defaultSetTimeout,
  nowImpl = Date.now,
  nonceImpl = defaultNonce
}) {
  const addonId = getEnv(env, "FIREFOX_ADDON_ID");
  const jwtIssuer = getEnv(env, "FIREFOX_JWT_ISSUER");
  const jwtSecret = getEnv(env, "FIREFOX_JWT_SECRET");
  const endpointRoot = stripTrailingSlash(env.FIREFOX_API_ENDPOINT ?? DEFAULT_ENDPOINT_ROOT);
  const authOptions = { jwtIssuer, jwtSecret, nonceImpl, nowImpl };
  const packageBytes = await readFileImpl(zipPath);
  const sourceBytes = await readFileImpl(sourceZipPath);
  const uploadPayload = await uploadPackage({
    authOptions,
    channel: env.FIREFOX_CHANNEL ?? "listed",
    endpointRoot,
    fetchImpl,
    packageBytes,
    zipPath
  });
  const uploadUuid = getStringField(uploadPayload, "uuid", "Firefox upload response");
  const validationPayload = await pollUploadValidation({
    authOptions,
    endpointRoot,
    fetchImpl,
    initialPayload: uploadPayload,
    retryDelayMs: Number.parseInt(env.FIREFOX_UPLOAD_POLL_DELAY_MS ?? "5000", 10),
    retryLimit: Number.parseInt(env.FIREFOX_UPLOAD_POLL_ATTEMPTS ?? "20", 10),
    setTimeoutImpl,
    uploadUuid
  });
  const version =
    getOptionalStringField(validationPayload, "version") ??
    getOptionalStringField(uploadPayload, "version") ??
    getOptionalStringField(validationPayload, "version_number");
  const versionPayload = await createVersion({
    addonId,
    authOptions,
    endpointRoot,
    fetchImpl,
    license: env.FIREFOX_LICENSE ?? "MIT",
    sourceBytes,
    sourceZipPath,
    uploadUuid
  });
  const versionNumber = version ?? getOptionalStringField(versionPayload, "version");

  if (!versionNumber) {
    throw new Error("Firefox version creation response did not include a version number");
  }

  const metadataPayload = await patchVersionMetadata({
    addonId,
    approvalNotes: env.FIREFOX_SUBMISSION_NOTES ?? DEFAULT_REVIEWER_NOTES,
    authOptions,
    endpointRoot,
    fetchImpl,
    releaseNotes: env.FIREFOX_RELEASE_NOTES ?? "Submitted by release workflow.",
    version: versionNumber
  });

  return {
    metadataPayload,
    uploadPayload: validationPayload,
    uploadUuid,
    version: versionNumber,
    versionPayload
  };
}

/**
 * @param {{
 *   authOptions: AuthOptions;
 *   channel: string;
 *   endpointRoot: string;
 *   fetchImpl: typeof fetch;
 *   packageBytes: BodyInit;
 *   zipPath: string;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
async function uploadPackage({
  authOptions,
  channel,
  endpointRoot,
  fetchImpl,
  packageBytes,
  zipPath
}) {
  const formData = new FormData();
  formData.append("upload", new Blob([packageBytes]), path.basename(zipPath));
  formData.append("channel", channel);

  const uploadResponse = await fetchImpl(`${endpointRoot}/addons/upload/`, {
    method: "POST",
    headers: authorizationHeaders(authOptions),
    body: formData
  });
  const uploadPayload = await readResponse(uploadResponse);

  if (!uploadResponse.ok) {
    throw new Error(
      `Firefox package upload failed (${uploadResponse.status}): ${formatPayload(uploadPayload)}`
    );
  }

  return uploadPayload;
}

/**
 * @param {{
 *   authOptions: AuthOptions;
 *   endpointRoot: string;
 *   fetchImpl: typeof fetch;
 *   initialPayload: Record<string, unknown>;
 *   retryDelayMs: number;
 *   retryLimit: number;
 *   setTimeoutImpl: (delay: number) => Promise<void>;
 *   uploadUuid: string;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
async function pollUploadValidation({
  authOptions,
  endpointRoot,
  fetchImpl,
  initialPayload,
  retryDelayMs,
  retryLimit,
  setTimeoutImpl,
  uploadUuid
}) {
  let statusPayload = initialPayload;

  for (let attempt = 1; attempt <= retryLimit; attempt += 1) {
    if (statusPayload.processed === true) {
      if (statusPayload.valid === true) {
        return statusPayload;
      }

      throw new Error(`Firefox package validation failed: ${formatPayload(statusPayload)}`);
    }

    await setTimeoutImpl(retryDelayMs);

    const statusResponse = await fetchImpl(`${endpointRoot}/addons/upload/${uploadUuid}/`, {
      headers: authorizationHeaders(authOptions)
    });
    statusPayload = await readResponse(statusResponse);

    if (!statusResponse.ok) {
      throw new Error(
        `Firefox package validation check failed (${statusResponse.status}): ${formatPayload(
          statusPayload
        )}`
      );
    }
  }

  throw new Error(`Firefox package validation did not finish after ${retryLimit} status checks`);
}

/**
 * @param {{
 *   addonId: string;
 *   authOptions: AuthOptions;
 *   endpointRoot: string;
 *   fetchImpl: typeof fetch;
 *   license: string;
 *   sourceBytes: BodyInit;
 *   sourceZipPath: string;
 *   uploadUuid: string;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
async function createVersion({
  addonId,
  authOptions,
  endpointRoot,
  fetchImpl,
  license,
  sourceBytes,
  sourceZipPath,
  uploadUuid
}) {
  const formData = new FormData();
  formData.append("upload", uploadUuid);
  formData.append("source", new Blob([sourceBytes]), path.basename(sourceZipPath));
  formData.append("license", license);

  const versionResponse = await fetchImpl(`${endpointRoot}/addons/addon/${addonId}/versions/`, {
    method: "POST",
    headers: authorizationHeaders(authOptions),
    body: formData
  });
  const versionPayload = await readResponse(versionResponse);

  if (!versionResponse.ok) {
    throw new Error(
      `Firefox version creation failed (${versionResponse.status}): ${formatPayload(
        versionPayload
      )}`
    );
  }

  return versionPayload;
}

/**
 * @param {{
 *   addonId: string;
 *   approvalNotes: string;
 *   authOptions: AuthOptions;
 *   endpointRoot: string;
 *   fetchImpl: typeof fetch;
 *   releaseNotes: string;
 *   version: string;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
async function patchVersionMetadata({
  addonId,
  approvalNotes,
  authOptions,
  endpointRoot,
  fetchImpl,
  releaseNotes,
  version
}) {
  const metadataResponse = await fetchImpl(
    `${endpointRoot}/addons/addon/${addonId}/versions/v${version}/`,
    {
      method: "PATCH",
      headers: {
        ...authorizationHeaders(authOptions),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        approval_notes: approvalNotes,
        release_notes: {
          "en-US": releaseNotes
        }
      })
    }
  );
  const metadataPayload = await readResponse(metadataResponse);

  if (!metadataResponse.ok) {
    throw new Error(
      `Firefox version metadata update failed (${metadataResponse.status}): ${formatPayload(
        metadataPayload
      )}`
    );
  }

  return metadataPayload;
}

/**
 * @param {AuthOptions} authOptions
 * @returns {{ Authorization: string }}
 */
function authorizationHeaders(authOptions) {
  return { Authorization: `JWT ${createJwt(authOptions)}` };
}

/**
 * @param {AuthOptions} options
 * @returns {string}
 */
function createJwt({ jwtIssuer, jwtSecret, nonceImpl, nowImpl }) {
  const iat = Math.floor(nowImpl() / 1000);
  const header = encodeBase64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = encodeBase64UrlJson({
    iss: jwtIssuer,
    jti: nonceImpl(),
    iat,
    exp: iat + 60
  });
  const signature = createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function encodeBase64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

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
export function formatPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @returns {string}
 */
function getEnv(env, name) {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} name
 * @param {string} label
 * @returns {string}
 */
function getStringField(value, name, label) {
  const fieldValue = getOptionalStringField(value, name);

  if (!fieldValue) {
    throw new Error(`${label} did not include ${name}`);
  }

  return fieldValue;
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} name
 * @returns {string | undefined}
 */
function getOptionalStringField(value, name) {
  return typeof value[name] === "string" ? value[name] : undefined;
}

/**
 * @param {number} delay
 * @returns {Promise<void>}
 */
function defaultSetTimeout(delay) {
  return sleep(delay);
}

/**
 * @returns {string}
 */
function defaultNonce() {
  return randomUUID();
}

/**
 * @param {string} value
 * @returns {string}
 */
function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @typedef {{
 *   jwtIssuer: string;
 *   jwtSecret: string;
 *   nonceImpl: () => string;
 *   nowImpl: () => number;
 * }} AuthOptions
 */
