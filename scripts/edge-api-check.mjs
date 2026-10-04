/**
 * Read one historical publish operation without modifying a submission.
 * @param {{env: Record<string, string | undefined>, operationId: string, fetchImpl: typeof fetch}} options
 */
export async function checkEdgeApi({ env, operationId, fetchImpl }) {
  for (const name of ["EDGE_PRODUCT_ID", "EDGE_CLIENT_ID", "EDGE_API_KEY"]) {
    if (!env[name]?.trim()) throw new Error(`Missing ${name}`);
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(operationId)) throw new Error("Expected a valid Edge operation ID");
  if (!uuid.test(env.EDGE_PRODUCT_ID)) throw new Error("Expected a valid EDGE_PRODUCT_ID");

  const url = `https://api.addons.microsoftedge.microsoft.com/v1/products/${env.EDGE_PRODUCT_ID}/submissions/operations/${operationId}`;
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: `ApiKey ${env.EDGE_API_KEY}`,
        "X-ClientID": env.EDGE_CLIENT_ID
      }
    });
  } catch {
    throw new Error("Edge API check request failed; verify connectivity and retry");
  }
  if (response.status !== 200) {
    const hint =
      response.status === 401 || response.status === 403
        ? "; verify Client ID and renew EDGE_API_KEY in Partner Center"
        : "; verify the historical operation ID and API availability";
    throw new Error(`Edge API check failed (${response.status})${hint}`);
  }
  /** @type {unknown} */
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Edge API did not return a valid operation status");
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    !("status" in payload) ||
    typeof payload.status !== "string" ||
    !["Succeeded", "Failed", "InProgress"].includes(payload.status)
  ) {
    throw new Error("Edge API did not return a valid operation status");
  }
  return { httpStatus: response.status, operationStatus: payload.status };
}
