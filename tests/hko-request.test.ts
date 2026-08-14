import { describe, expect, test, vi } from "vitest";
import { fetchHko } from "../src/shared/hko-request";

const HKO_URL =
  "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc";

describe("HKO request policy", () => {
  test("rejects URLs outside approved HKO origins", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(fetchHko("https://example.com/track.xml", { fetchImpl })).rejects.toThrow(
      "Untrusted HKO URL"
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("requires HTTPS even for approved HKO hosts", async () => {
    await expect(fetchHko("http://www.weather.gov.hk/track.xml")).rejects.toThrow(
      "Untrusted HKO URL"
    );
  });

  test("retries transient HTTP responses", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));

    await expect(fetchHko(HKO_URL, { fetchImpl, retryDelaysMs: [0, 0] })).resolves.toMatchObject({
      ok: true
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("does not retry ordinary client errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(404));

    await expect(fetchHko(HKO_URL, { fetchImpl, retryDelaysMs: [0, 0] })).rejects.toThrow(
      "HKO request failed: 404"
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  test("aborts a request after the finite timeout", async () => {
    const fetchImpl = vi.fn<typeof fetch>((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("Mock fetch aborted"));
        });
      });
    });

    await expect(fetchHko(HKO_URL, { fetchImpl, retryDelaysMs: [], timeoutMs: 1 })).rejects.toThrow(
      "timed out"
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

function response(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status
  } as Response;
}
