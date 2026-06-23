import { setTimeout as sleep } from "node:timers/promises";

/**
 * @param {{
 *   zipPath: string;
 *   env: Record<string, string | undefined>;
 *   fetchImpl: typeof fetch;
 *   readFileImpl: (path: string) => Promise<BodyInit>;
 *   setTimeoutImpl?: (delay: number) => Promise<void>;
 *   submitReview?: boolean;
 * }} options
 * @returns {Promise<{
 *   publishOperationId?: string;
 *   publishPayload?: Record<string, unknown>;
 *   uploadOperationId: string;
 *   uploadPayload: Record<string, unknown>;
 * }>}
 */
export async function uploadEdgeDraft({
  zipPath,
  env,
  fetchImpl,
  readFileImpl,
  setTimeoutImpl = defaultSetTimeout,
  submitReview = false
}) {
  const edgeProductId = getEnv(env, "EDGE_PRODUCT_ID");
  const edgeClientId = getEnv(env, "EDGE_CLIENT_ID");
  const edgeApiKey = getEnv(env, "EDGE_API_KEY");
  const endpointRoot = env.EDGE_API_ENDPOINT ?? "https://api.addons.microsoftedge.microsoft.com";
  const headers = {
    Authorization: `ApiKey ${edgeApiKey}`,
    "X-ClientID": edgeClientId
  };
  const uploadHeaders = {
    ...headers,
    "Content-Type": "application/zip"
  };
  const packageBytes = await readFileImpl(zipPath);
  const uploadResponse = await fetchImpl(
    `${endpointRoot}/v1/products/${edgeProductId}/submissions/draft/package`,
    {
      method: "POST",
      headers: uploadHeaders,
      body: packageBytes
    }
  );
  const uploadPayload = await readResponse(uploadResponse);

  if (uploadResponse.status !== 202) {
    throw new Error(
      `Edge draft upload failed (${uploadResponse.status}): ${formatPayload(uploadPayload)}`
    );
  }

  const uploadOperationId = uploadResponse.headers.get("location");

  if (!uploadOperationId) {
    throw new Error("Edge draft upload did not return an operation ID in the Location header");
  }

  await pollOperation({
    endpointRoot,
    edgeProductId,
    fetchImpl,
    headers,
    operationId: uploadOperationId,
    operationPath: "submissions/draft/package/operations",
    retryDelayMs: Number.parseInt(env.EDGE_UPLOAD_POLL_DELAY_MS ?? "5000", 10),
    retryLimit: Number.parseInt(env.EDGE_UPLOAD_POLL_ATTEMPTS ?? "10", 10),
    setTimeoutImpl,
    statusLabel: "Edge upload"
  });

  if (!submitReview) {
    return { uploadOperationId, uploadPayload };
  }

  const publishResponse = await fetchImpl(
    `${endpointRoot}/v1/products/${edgeProductId}/submissions`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ notes: env.EDGE_SUBMISSION_NOTES ?? "Submitted by release workflow." })
    }
  );
  const publishPayload = await readResponse(publishResponse);

  if (publishResponse.status !== 202) {
    throw new Error(
      `Edge review submission failed (${publishResponse.status}): ${formatPayload(publishPayload)}`
    );
  }

  const publishOperationId = publishResponse.headers.get("location");

  if (!publishOperationId) {
    throw new Error("Edge review submission did not return an operation ID in the Location header");
  }

  await pollOperation({
    endpointRoot,
    edgeProductId,
    fetchImpl,
    headers,
    operationId: publishOperationId,
    operationPath: "submissions/operations",
    retryDelayMs: Number.parseInt(env.EDGE_PUBLISH_POLL_DELAY_MS ?? "5000", 10),
    retryLimit: Number.parseInt(env.EDGE_PUBLISH_POLL_ATTEMPTS ?? "10", 10),
    setTimeoutImpl,
    statusLabel: "Edge publish"
  });

  return { publishOperationId, publishPayload, uploadOperationId, uploadPayload };
}

/**
 * @param {{
 *   edgeProductId: string;
 *   endpointRoot: string;
 *   fetchImpl: typeof fetch;
 *   headers: Record<string, string>;
 *   operationId: string;
 *   operationPath: string;
 *   retryDelayMs: number;
 *   retryLimit: number;
 *   setTimeoutImpl: (delay: number) => Promise<void>;
 *   statusLabel: string;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
async function pollOperation({
  edgeProductId,
  endpointRoot,
  fetchImpl,
  headers,
  operationId,
  operationPath,
  retryDelayMs,
  retryLimit,
  setTimeoutImpl,
  statusLabel
}) {
  const statusUrl = `${endpointRoot}/v1/products/${edgeProductId}/${operationPath}/${operationId}`;

  for (let attempt = 1; attempt <= retryLimit; attempt += 1) {
    await setTimeoutImpl(retryDelayMs);

    const statusResponse = await fetchImpl(statusUrl, { headers });
    const statusPayload = await readResponse(statusResponse);

    if (!statusResponse.ok) {
      throw new Error(
        `${statusLabel} status check failed (${statusResponse.status}): ${formatPayload(
          statusPayload
        )}`
      );
    }

    if (statusPayload.status === "Succeeded") {
      return statusPayload;
    }

    if (statusPayload.status === "Failed") {
      throw new Error(`${statusLabel} operation failed: ${formatPayload(statusPayload)}`);
    }
  }

  throw new Error(`${statusLabel} operation did not finish after ${retryLimit} status checks`);
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
 * @param {number} delay
 * @returns {Promise<void>}
 */
function defaultSetTimeout(delay) {
  return sleep(delay);
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
