/**
 * @param {{
 *   zipPath: string;
 *   env: Record<string, string | undefined>;
 *   fetchImpl: typeof fetch;
 *   readFileImpl: (path: string) => Promise<BodyInit>;
 *   submitReview?: boolean;
 * }} options
 * @returns {Promise<{ uploadPayload: Record<string, unknown>; publishPayload?: Record<string, unknown> }>}
 */
export async function uploadChromeDraft({
  zipPath,
  env,
  fetchImpl,
  readFileImpl,
  submitReview = false
}) {
  const chromeExtensionId = getEnv(env, "CHROME_EXTENSION_ID");
  const chromePublisherId = getEnv(env, "CHROME_PUBLISHER_ID");
  const chromeClientId = getEnv(env, "CHROME_CLIENT_ID");
  const chromeClientSecret = getEnv(env, "CHROME_CLIENT_SECRET");
  const chromeRefreshToken = getEnv(env, "CHROME_REFRESH_TOKEN");

  const accessToken = await requestAccessToken({
    fetchImpl,
    chromeClientId,
    chromeClientSecret,
    chromeRefreshToken
  });
  const packageBytes = await readFileImpl(zipPath);
  const uploadItemUrl = `https://chromewebstore.googleapis.com/upload/v2/publishers/${chromePublisherId}/items/${chromeExtensionId}`;
  const publishItemUrl = `https://chromewebstore.googleapis.com/v2/publishers/${chromePublisherId}/items/${chromeExtensionId}`;
  const uploadPayload = await postZip({
    fetchImpl,
    url: `${uploadItemUrl}:upload`,
    accessToken,
    packageBytes
  });

  if (!submitReview) {
    return { uploadPayload };
  }

  const publishPayload = await postPublish({
    fetchImpl,
    url: `${publishItemUrl}:publish`,
    accessToken
  });

  return { uploadPayload, publishPayload };
}

/**
 * @param {unknown} payload
 * @returns {string}
 */
export function formatPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

/**
 * @param {{
 *   fetchImpl: typeof fetch;
 *   chromeClientId: string;
 *   chromeClientSecret: string;
 *   chromeRefreshToken: string;
 * }} options
 * @returns {Promise<string>}
 */
async function requestAccessToken({
  fetchImpl,
  chromeClientId,
  chromeClientSecret,
  chromeRefreshToken
}) {
  const tokenBody = new URLSearchParams({
    client_id: chromeClientId,
    client_secret: chromeClientSecret,
    grant_type: "refresh_token",
    refresh_token: chromeRefreshToken
  });
  const tokenResponse = await fetchImpl("https://oauth2.googleapis.com/token", {
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

  return accessToken;
}

/**
 * @param {{
 *   fetchImpl: typeof fetch;
 *   url: string;
 *   accessToken: string;
 *   packageBytes: BodyInit;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
async function postZip({ fetchImpl, url, accessToken, packageBytes }) {
  const uploadResponse = await fetchImpl(url, {
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

  return uploadPayload;
}

/**
 * @param {{
 *   fetchImpl: typeof fetch;
 *   url: string;
 *   accessToken: string;
 * }} options
 * @returns {Promise<Record<string, unknown>>}
 */
async function postPublish({ fetchImpl, url, accessToken }) {
  const publishResponse = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const publishPayload = await readResponse(publishResponse);

  if (!publishResponse.ok) {
    throw new Error(
      `Chrome review submission failed (${publishResponse.status}): ${formatPayload(
        publishPayload
      )}`
    );
  }

  return publishPayload;
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
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
