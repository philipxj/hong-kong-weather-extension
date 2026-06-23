import path from "node:path";

const githubApiVersion = "2022-11-28";

/**
 * @param {{
 *   zipPath: string;
 *   env: Record<string, string | undefined>;
 *   fetchImpl: typeof fetch;
 *   readFileImpl: (path: string) => Promise<BodyInit | string>;
 * }} options
 * @returns {Promise<{
 *   assetName: string;
 *   releaseUrl: string;
 *   tagName: string;
 * }>}
 */
export async function syncGitHubRelease({ zipPath, env, fetchImpl, readFileImpl }) {
  const repository = getEnv(env, "GITHUB_REPOSITORY");
  const token = env.GITHUB_TOKEN ?? env.GH_TOKEN;

  if (!token) {
    throw new Error("Missing required environment variable: GITHUB_TOKEN or GH_TOKEN");
  }

  const packageJson = await readJson(readFileImpl, "package.json");
  const version = typeof packageJson.version === "string" ? packageJson.version : "";

  if (!version) {
    throw new Error("package.json does not contain a version string");
  }

  const tagName = `v${version}`;
  const assetName = path.basename(zipPath);
  const releaseBody = await buildReleaseBody({ readFileImpl, version });
  const headers = githubHeaders(token);
  const release = await upsertRelease({
    env,
    fetchImpl,
    headers,
    releaseBody,
    repository,
    tagName
  });

  await deleteMatchingAsset({ assetName, fetchImpl, headers, release });
  await uploadAsset({ assetName, fetchImpl, headers, readFileImpl, release, zipPath });

  return {
    assetName,
    releaseUrl: release.html_url,
    tagName
  };
}

/**
 * @param {{
 *   env: Record<string, string | undefined>;
 *   fetchImpl: typeof fetch;
 *   headers: Record<string, string>;
 *   releaseBody: string;
 *   repository: string;
 *   tagName: string;
 * }} options
 * @returns {Promise<GitHubRelease>}
 */
async function upsertRelease({ env, fetchImpl, headers, releaseBody, repository, tagName }) {
  const existingResponse = await fetchImpl(
    `https://api.github.com/repos/${repository}/releases/tags/${tagName}`,
    { headers }
  );
  const existingPayload = await readResponse(existingResponse);
  const releasePayload = {
    body: releaseBody,
    make_latest: "true",
    name: `香港天氣警報 ${tagName}`,
    tag_name: tagName,
    target_commitish: env.GITHUB_REF_NAME ?? env.GITHUB_SHA ?? "main"
  };

  if (existingResponse.ok) {
    const release = requireRelease(existingPayload);
    const updateResponse = await fetchImpl(`https://api.github.com/repos/${repository}/releases/${release.id}`, {
      body: JSON.stringify(releasePayload),
      headers,
      method: "PATCH"
    });
    const updatePayload = await readResponse(updateResponse);

    if (!updateResponse.ok) {
      throw new Error(
        `GitHub Release update failed (${updateResponse.status}): ${formatPayload(updatePayload)}`
      );
    }

    return requireRelease(updatePayload);
  }

  if (existingResponse.status !== 404) {
    throw new Error(
      `GitHub Release lookup failed (${existingResponse.status}): ${formatPayload(existingPayload)}`
    );
  }

  const createResponse = await fetchImpl(`https://api.github.com/repos/${repository}/releases`, {
    body: JSON.stringify(releasePayload),
    headers,
    method: "POST"
  });
  const createPayload = await readResponse(createResponse);

  if (!createResponse.ok) {
    throw new Error(
      `GitHub Release creation failed (${createResponse.status}): ${formatPayload(createPayload)}`
    );
  }

  return requireRelease(createPayload);
}

/**
 * @param {{
 *   assetName: string;
 *   fetchImpl: typeof fetch;
 *   headers: Record<string, string>;
 *   release: GitHubRelease;
 * }} options
 * @returns {Promise<void>}
 */
async function deleteMatchingAsset({ assetName, fetchImpl, headers, release }) {
  const matchingAsset = release.assets.find((asset) => asset.name === assetName);

  if (!matchingAsset) {
    return;
  }

  const deleteResponse = await fetchImpl(matchingAsset.url, {
    headers,
    method: "DELETE"
  });
  const deletePayload = await readResponse(deleteResponse);

  if (!deleteResponse.ok) {
    throw new Error(
      `GitHub Release asset deletion failed (${deleteResponse.status}): ${formatPayload(
        deletePayload
      )}`
    );
  }
}

/**
 * @param {{
 *   assetName: string;
 *   fetchImpl: typeof fetch;
 *   headers: Record<string, string>;
 *   readFileImpl: (path: string) => Promise<BodyInit | string>;
 *   release: GitHubRelease;
 *   zipPath: string;
 * }} options
 * @returns {Promise<void>}
 */
async function uploadAsset({ assetName, fetchImpl, headers, readFileImpl, release, zipPath }) {
  const packageBytes = await readFileImpl(zipPath);
  const uploadUrl = `${release.upload_url.replace(/\{.*$/, "")}?name=${encodeURIComponent(
    assetName
  )}`;
  const uploadResponse = await fetchImpl(uploadUrl, {
    body: packageBytes,
    headers: {
      ...headers,
      "Content-Type": "application/zip"
    },
    method: "POST"
  });
  const uploadPayload = await readResponse(uploadResponse);

  if (!uploadResponse.ok) {
    throw new Error(
      `GitHub Release asset upload failed (${uploadResponse.status}): ${formatPayload(
        uploadPayload
      )}`
    );
  }
}

/**
 * @param {{
 *   readFileImpl: (path: string) => Promise<BodyInit | string>;
 *   version: string;
 * }} options
 * @returns {Promise<string>}
 */
async function buildReleaseBody({ readFileImpl, version }) {
  const releaseNotes = await readReleaseNotes({ readFileImpl, version });

  return `## Changes

${releaseNotes}

## Store Submission

- Chrome Web Store: use this package for the matching store submission.
- Microsoft Edge Add-ons: use this package for the matching store submission.

## Validation

- npm test
- npm run package:chromium`;
}

/**
 * @param {{
 *   readFileImpl: (path: string) => Promise<BodyInit | string>;
 *   version: string;
 * }} options
 * @returns {Promise<string>}
 */
async function readReleaseNotes({ readFileImpl, version }) {
  try {
    const storeListing = await readText(readFileImpl, "docs/store-listing.md");
    const escapedVersion = escapeRegExp(version);
    const sectionMatch = new RegExp(
      `#### ${escapedVersion}\\n\\n([\\s\\S]*?)(?=\\n#### |\\n## |$)`
    ).exec(storeListing);

    if (sectionMatch?.[1]) {
      return sectionMatch[1].trim();
    }
  } catch {
    // Store-listing notes are helpful but should not block release creation.
  }

  return `- Release ${version}.`;
}

/**
 * @param {(path: string) => Promise<BodyInit | string>} readFileImpl
 * @param {string} filePath
 * @returns {Promise<Record<string, unknown>>}
 */
async function readJson(readFileImpl, filePath) {
  const text = await readText(readFileImpl, filePath);
  const parsed = /** @type {unknown} */ (JSON.parse(text));

  if (!isRecord(parsed)) {
    throw new Error(`${filePath} does not contain a JSON object`);
  }

  return parsed;
}

/**
 * @param {(path: string) => Promise<BodyInit | string>} readFileImpl
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function readText(readFileImpl, filePath) {
  const contents = await readFileImpl(filePath);

  if (typeof contents === "string") {
    return contents;
  }

  if (contents instanceof Uint8Array) {
    return new TextDecoder().decode(contents);
  }

  throw new Error(`${filePath} must be readable as text`);
}

/**
 * @param {string} token
 * @returns {Record<string, string>}
 */
function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": githubApiVersion
  };
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
function formatPayload(payload) {
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

/**
 * @param {Record<string, unknown>} payload
 * @returns {GitHubRelease}
 */
function requireRelease(payload) {
  const assets = Array.isArray(payload.assets)
    ? payload.assets.filter(isReleaseAsset)
    : [];
  const htmlUrl = typeof payload.html_url === "string" ? payload.html_url : "";
  const id = typeof payload.id === "number" ? payload.id : 0;
  const uploadUrl = typeof payload.upload_url === "string" ? payload.upload_url : "";

  if (!htmlUrl || !id || !uploadUrl) {
    throw new Error(`GitHub Release response is incomplete: ${formatPayload(payload)}`);
  }

  return {
    assets,
    html_url: htmlUrl,
    id,
    upload_url: uploadUrl
  };
}

/**
 * @param {unknown} value
 * @returns {value is GitHubReleaseAsset}
 */
function isReleaseAsset(value) {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.name === "string" && typeof value.url === "string";
}

/**
 * @typedef {{
 *   name: string;
 *   url: string;
 * }} GitHubReleaseAsset
 *
 * @typedef {{
 *   assets: GitHubReleaseAsset[];
 *   html_url: string;
 *   id: number;
 *   upload_url: string;
 * }} GitHubRelease
 */
