const APPROVED_HKO_ORIGINS = new Set([
  "https://data.weather.gov.hk",
  "https://www.weather.gov.hk",
  "https://www.hko.gov.hk"
]);

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_DELAYS_MS = [250, 750] as const;

export interface HkoRequestOptions {
  clearTimeoutImpl?: typeof clearTimeout;
  fetchImpl?: typeof fetch;
  retryDelaysMs?: readonly number[];
  setTimeoutImpl?: typeof setTimeout;
  timeoutMs?: number;
}

class HkoHttpError extends Error {
  constructor(readonly status: number) {
    super(`HKO request failed: ${status}`);
    this.name = "HkoHttpError";
  }
}

export async function fetchHko(url: string, options: HkoRequestOptions = {}): Promise<Response> {
  validateHkoUrl(url);

  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetchHkoAttempt(url, options);
      if (response.ok) return response;
      throw new HkoHttpError(response.status);
    } catch (error) {
      if (!isRetryable(error) || attempt >= retryDelaysMs.length) throw error;
      await wait(retryDelaysMs[attempt] ?? 0, options.setTimeoutImpl ?? setTimeout);
    }
  }
}

export function validateHkoUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Untrusted HKO URL: ${url}`);
  }

  if (!APPROVED_HKO_ORIGINS.has(parsed.origin)) {
    throw new Error(`Untrusted HKO URL: ${url}`);
  }
  return parsed;
}

async function fetchHkoAttempt(url: string, options: HkoRequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const setTimer = options.setTimeoutImpl ?? setTimeout;
  const clearTimer = options.clearTimeoutImpl ?? clearTimeout;
  const timer = setTimer(() => {
    controller.abort(new Error(`HKO request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await (options.fetchImpl ?? fetch)(url, {
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw controller.signal.reason instanceof Error
        ? controller.signal.reason
        : new Error(`HKO request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimer(timer);
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HkoHttpError) {
    return error.status === 429 || error.status >= 500;
  }
  return (
    error instanceof TypeError || (error instanceof Error && error.message.includes("timed out"))
  );
}

function wait(milliseconds: number, setTimer: typeof setTimeout): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimer(resolve, milliseconds));
}
