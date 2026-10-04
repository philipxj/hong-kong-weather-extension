import { describe, expect, test, vi } from "vitest";

// @ts-expect-error Node ESM helper is verified through runtime import.
const helper = (await import("../scripts/edge-api-check.mjs")) as {
  checkEdgeApi: (options: {
    env: Record<string, string>;
    operationId: string;
    fetchImpl: typeof fetch;
  }) => Promise<{ httpStatus: number; operationStatus: string }>;
};
const env = {
  EDGE_PRODUCT_ID: "80b31516-8d7c-4ef6-b188-19837c93c9be",
  EDGE_CLIENT_ID: "client-id",
  EDGE_API_KEY: "test-secret-never-log"
};
const operationId = "5c63e606-5844-48af-a145-3b81b195ca9a";

describe("read-only Edge API credential check", () => {
  test("classifies an invalid Client ID without exposing the server response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(env.EDGE_API_KEY, {
      status: 403, statusText: "Client ID is Invalid"
    }));
    await expect(helper.checkEdgeApi({ env, operationId, fetchImpl })).rejects.toThrow(
      "Microsoft rejected the Client ID"
    );
  });
  test("checks one existing operation with GET and does not submit", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ status: "Succeeded" }));
    await expect(helper.checkEdgeApi({ env, operationId, fetchImpl })).resolves.toEqual({
      httpStatus: 200,
      operationStatus: "Succeeded"
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://api.addons.microsoftedge.microsoft.com/v1/products/${env.EDGE_PRODUCT_ID}/submissions/operations/${operationId}`,
      expect.objectContaining({
        method: "GET",
        redirect: "error",
        headers: {
          Authorization: `ApiKey ${env.EDGE_API_KEY}`,
          "X-ClientID": env.EDGE_CLIENT_ID
        }
      })
    );
  });

  test("a historical failed operation still proves authenticated API access", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ status: "Failed" }));
    await expect(helper.checkEdgeApi({ env, operationId, fetchImpl })).resolves.toEqual({
      httpStatus: 200,
      operationStatus: "Failed"
    });
  });

  test.each(["EDGE_PRODUCT_ID", "EDGE_CLIENT_ID", "EDGE_API_KEY"])(
    "rejects missing %s before making a request",
    async (name) => {
      const fetchImpl = vi.fn();
      await expect(
        helper.checkEdgeApi({ env: { ...env, [name]: "" }, operationId, fetchImpl })
      ).rejects.toThrow(name);
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  );

  test("rejects path injection before making a request", async () => {
    const fetchImpl = vi.fn();
    await expect(
      helper.checkEdgeApi({ env, operationId: "../submissions", fetchImpl })
    ).rejects.toThrow("operation ID");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test.each([401, 403, 404, 500])(
    "reports HTTP %s without printing response data",
    async (status) => {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(env.EDGE_API_KEY, { status }));
      await expect(helper.checkEdgeApi({ env, operationId, fetchImpl })).rejects.toThrow(
        `Edge API check failed (${status})`
      );
      try {
        await helper.checkEdgeApi({ env, operationId, fetchImpl });
      } catch (error) {
        expect(String(error)).not.toContain(env.EDGE_API_KEY);
      }
    }
  );

  test.each([{}, { status: "Unknown" }])(
    "rejects unexpected operation payload %j",
    async (payload) => {
      const fetchImpl = vi.fn().mockResolvedValue(Response.json(payload));
      await expect(helper.checkEdgeApi({ env, operationId, fetchImpl })).rejects.toThrow(
        "valid operation status"
      );
    }
  );
});
