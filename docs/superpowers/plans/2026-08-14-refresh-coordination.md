# Refresh Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement GitHub issue #45 so weather slices refresh safely, use bounded HKO requests, retain useful stale data, and avoid unnecessary popup-open traffic.

**Architecture:** Keep one compatibility `WeatherData` cache but add per-slice metadata. Fetch slices independently, then serialize only each read-merge-write operation so concurrent completions cannot overwrite unrelated newer slices. The background service worker decides freshness and is the only runtime cache writer; a shared request helper enforces trusted origins, timeout, and retry policy.

**Tech Stack:** TypeScript 6, Chromium MV3 WebExtensions wrapper, Vitest 4, Playwright 1.62, Vite 8.

## Global Constraints

- Preserve WebExtension compatibility for Edge and future Firefox support.
- Do not change popup layout or introduce Chrome-only behavior.
- Use red-green-refactor for every behavior change.
- Current TTL is the normalized `currentRefreshMinutes` setting, 10-120 minutes.
- Warning TTL is the normalized `warningCheckMinutes` setting, 5-60 minutes.
- Forecast TTL is 120 minutes and tropical-cyclone TTL is 60 minutes.
- Run all commands with `PATH=/opt/homebrew/opt/node@22/bin:$PATH` in this worktree.
- Final validation is `npm test`.

---

### Task 1: Shared HKO request policy

**Files:**

- Create: `src/shared/hko-request.ts`
- Create: `tests/hko-request.test.ts`
- Modify: `src/shared/weather-service.ts`

**Interfaces:**

- Produces: `fetchHko(url, options?) => Promise<Response>` with trusted-origin validation, a 10-second timeout, and two retries for network/timeout, HTTP 429, and HTTP 5xx failures.
- Consumes: platform `fetch`, `AbortController`, and timers; tests inject `fetchImpl`, `setTimeoutImpl`, and `clearTimeoutImpl` through options.

- [ ] **Step 1: Write failing request-policy tests**

```ts
test("rejects generated URLs outside approved HKO origins", async () => {
  await expect(fetchHko("https://example.com/track.xml")).rejects.toThrow("Untrusted HKO URL");
});

test("retries transient responses but not ordinary 4xx responses", async () => {
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(response(503))
    .mockResolvedValueOnce(response(200));
  await expect(fetchHko(HKO_URL, { fetchImpl, retryDelaysMs: [0, 0] })).resolves.toMatchObject({
    ok: true
  });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/hko-request.test.ts`

Expected: FAIL because `src/shared/hko-request.ts` does not exist.

- [ ] **Step 3: Implement the minimal request helper**

```ts
const APPROVED_ORIGINS = new Set([
  "https://data.weather.gov.hk",
  "https://www.weather.gov.hk",
  "https://www.hko.gov.hk"
]);

export async function fetchHko(url: string, options: HkoRequestOptions = {}): Promise<Response> {
  validateHkoUrl(url);
  const delays = options.retryDelaysMs ?? [250, 750];
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetchAttempt(url, options);
      if (response.ok) return response;
      if (!isRetryableStatus(response.status) || attempt >= delays.length) {
        throw new HkoHttpError(response.status);
      }
    } catch (error) {
      if (!isRetryableError(error) || attempt >= delays.length) throw error;
    }
    await delay(delays[attempt] ?? 0, options);
  }
}
```

- [ ] **Step 4: Route JSON, CSV, cyclone-list, and cyclone-track fetches through `fetchHko`**

Replace direct `fetch(url, { cache: "no-store" })` calls in `fetchHkoJson`,
`fetchLatestUv`, and `fetchHkoText`. Keep schema parsing outside retry handling so
malformed payloads are not retried.

- [ ] **Step 5: Run request and weather API tests and verify GREEN**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/hko-request.test.ts tests/weather-refresh-api.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/hko-request.ts src/shared/weather-service.ts tests/hko-request.test.ts
git commit -m "feat: bound HKO requests"
```

### Task 2: Per-slice cache state and atomic merge

**Files:**

- Modify: `src/shared/types.ts`
- Create: `src/shared/weather-cache.ts`
- Create: `tests/weather-cache.test.ts`
- Modify: `tests/weather-refresh-api.test.ts`

**Interfaces:**

- Produces: `WeatherSliceName`, `WeatherSliceState`, `WeatherSliceStates`, `createEmptyWeatherData(language)`, `cacheSliceIsFresh(data, slice, ttlMs, now)`, and `updateWeatherCache(mutator)`.
- `updateWeatherCache` returns `{ previous, next }` and serializes storage read-merge-write operations within the service-worker lifetime.

- [ ] **Step 1: Write failing cache tests**

```ts
test("treats old caches without slice metadata as expired", () => {
  expect(cacheSliceIsFresh(oldCache, "current", 15 * 60_000, now)).toBe(false);
});

test("serializes read-merge-write updates", async () => {
  const current = updateWeatherCache((cache) => ({ ...cache!, current: newerCurrent }));
  const forecast = updateWeatherCache((cache) => ({ ...cache!, forecast: newerForecast }));
  await Promise.all([current, forecast]);
  expect(stored.current).toEqual(newerCurrent);
  expect(stored.forecast).toEqual(newerForecast);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/weather-cache.test.ts`

Expected: FAIL because cache helpers and slice types do not exist.

- [ ] **Step 3: Add slice types and cache helpers**

```ts
export type WeatherSliceName = "current" | "forecast" | "warnings" | "tropicalCyclones";
export interface WeatherSliceState {
  fetchedAt: string | null;
  stale: boolean;
  error: WeatherError | null;
}
export type WeatherSliceStates = Record<WeatherSliceName, WeatherSliceState>;
```

Build compatibility summary fields from `sliceStates`; missing or invalid state
is stale. Reject future timestamps as fresh.

- [ ] **Step 4: Add reverse-completion regression coverage to weather refresh tests**

Control the current and forecast response promises, resolve forecast first and
current second, then assert that final storage contains both updated slices.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/weather-cache.test.ts tests/weather-refresh-api.test.ts`

Expected: PASS after Task 3 wires partial refreshes to the helper; keep the new
reverse-completion test RED until that wiring is complete.

- [ ] **Step 6: Commit the independently passing cache helper portion**

```bash
git add src/shared/types.ts src/shared/weather-cache.ts tests/weather-cache.test.ts
git commit -m "feat: track weather cache slices"
```

### Task 3: Independent slice refreshes and freshness orchestration

**Files:**

- Modify: `src/shared/weather-service.ts`
- Modify: `tests/weather-refresh-api.test.ts`

**Interfaces:**

- Produces: `refreshTropicalCyclones(settings?)` and
  `refreshWeather(settings?, { force?: boolean; now?: number }?)`.
- Existing `refreshCurrentWeather`, `refreshForecast`, and
  `refreshWeatherWarnings` retain their public names but atomically merge only
  their owned data and slice state.

- [ ] **Step 1: Write failing freshness and force-refresh tests**

```ts
test("fresh popup cache performs no HKO request", async () => {
  mockState.local.weatherCache = cachedWeatherWithFreshSlices();
  await refreshWeather(DEFAULT_SETTINGS, { force: false, now: NOW });
  expect(fetch).not.toHaveBeenCalled();
});

test("manual refresh forces every slice", async () => {
  mockState.local.weatherCache = cachedWeatherWithFreshSlices();
  await refreshWeather(DEFAULT_SETTINGS, { force: true, now: NOW });
  expect(fetchDataTypes()).toEqual(["rhrread", "fnd", "warnsum", "warningInfo"]);
  expect(fetchUrls()).toContain(TROPICAL_CYCLONE_LIST_URL);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/weather-refresh-api.test.ts`

Expected: FAIL because `refreshWeather` ignores freshness and slice writes can
still overwrite each other.

- [ ] **Step 3: Refactor partial refreshes to fetch outside and merge inside `updateWeatherCache`**

For success, update only the owned data and set that slice to
`{ fetchedAt: nowIso, stale: false, error: null }`. For failure, preserve owned
data and set only that slice to stale/error. Use `createEmptyWeatherData` when
no same-language cache exists.

- [ ] **Step 4: Implement orchestration and cyclone fallback**

```ts
export async function refreshWeather(settings = null, options = {}): Promise<WeatherData> {
  const activeSettings = settings ?? (await getSettings());
  const cache = await getCachedWeather();
  const tasks = staleOrForcedSlices(cache, activeSettings, options).map(refreshSlice);
  await Promise.all(tasks);
  return (await getCachedWeather()) ?? createEmptyWeatherData(activeSettings.language);
}
```

An empty successful cyclone response replaces prior data. A thrown request or
parse error preserves prior cyclone data and records the slice error.

- [ ] **Step 5: Verify reverse completion, TTL, force, migration, and cyclone tests GREEN**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/weather-cache.test.ts tests/weather-refresh-api.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/weather-service.ts tests/weather-refresh-api.test.ts
git commit -m "feat: coordinate weather slice refreshes"
```

### Task 4: Warning-detail shortcut and runtime settings validation

**Files:**

- Modify: `src/shared/weather-service.ts`
- Modify: `tests/weather-refresh-api.test.ts`
- Modify: `tests/weather-service.test.ts`

**Interfaces:**

- Produces: deterministic internal `warningSummaryFingerprint(warnsum)`.
- `getSettings` and `saveSettings` return fully validated `Settings` with safe
  interval bounds.

- [ ] **Step 1: Write failing warning fingerprint tests**

```ts
test("unchanged warning summary reuses cached detail", async () => {
  mockState.local.weatherCache = cachedWeatherWithMatchingWarningFingerprint();
  await refreshWeatherWarnings(DEFAULT_SETTINGS);
  expect(fetchDataTypes()).toEqual(["warnsum"]);
});

test("changed warning summary requests detail", async () => {
  mockState.local.weatherCache = cachedWeatherWithDifferentWarningFingerprint();
  await refreshWeatherWarnings(DEFAULT_SETTINGS);
  expect(fetchDataTypes()).toEqual(["warnsum", "warningInfo"]);
});
```

- [ ] **Step 2: Write failing malformed-settings tests**

Store invalid enum/boolean/array values plus `currentRefreshMinutes: -1` and
`warningCheckMinutes: 999`, then expect defaults for invalid values and clamped
intervals of 10 and 60.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/weather-refresh-api.test.ts tests/weather-service.test.ts`

Expected: FAIL because warning details are unconditional and scalar settings
are not runtime validated.

- [ ] **Step 4: Implement fingerprint reuse and complete settings normalization**

Fingerprint only active warning identity, action-independent code, name,
issue/update/expire timestamps in sorted key order. Validate language, badge
mode, booleans, category arrays, and finite numeric intervals before returning
settings.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/weather-refresh-api.test.ts tests/weather-service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/weather-service.ts tests/weather-refresh-api.test.ts tests/weather-service.test.ts
git commit -m "feat: reduce warning refresh traffic"
```

### Task 5: Background-only cache ownership and popup behavior

**Files:**

- Modify: `src/background.ts`
- Modify: `src/popup/main.ts`
- Modify: `tests/background-refresh.test.ts`
- Create: `tests/popup-refresh.test.ts`

**Interfaces:**

- Runtime message accepts `{ type: "refreshWeather", force?: boolean }`.
- Popup sends `force: false` on open and `force: true` on manual refresh.

- [ ] **Step 1: Write failing background tests**

Capture installed/startup/alarm/message handlers. Assert popup-open messages
call `refreshWeather(settings, { force: false })`, manual messages call force
true, and current/forecast/warning alarms still target only their own refresh.

- [ ] **Step 2: Write failing popup source regression test**

```ts
test("popup delegates every cache refresh to background", async () => {
  const source = await readFile(new URL("../src/popup/main.ts", import.meta.url), "utf8");
  expect(source).not.toContain("refreshWeather(state.settings)");
  expect(source).not.toContain("updateBadge(data, state.settings)");
  expect(source).toContain("force\n    });");
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/background-refresh.test.ts tests/popup-refresh.test.ts`

Expected: FAIL because the message has no force mode and popup falls back to a
direct writer.

- [ ] **Step 4: Implement background and popup message flow**

Pass `force` through `load`, remove popup imports of `refreshWeather` and
`updateBadge`, and surface runtime errors while retaining matching cached data.
Install/startup explicitly force; popup open does not.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npx vitest run tests/background-refresh.test.ts tests/popup-refresh.test.ts tests/browser-api.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/background.ts src/popup/main.ts tests/background-refresh.test.ts tests/popup-refresh.test.ts
git commit -m "feat: make background refresh authoritative"
```

### Task 6: Documentation, hygiene, and full validation

**Files:**

- Modify: `.gitignore`
- Modify: `docs/api.md`
- Modify: `docs/superpowers/plans/2026-08-14-refresh-coordination.md`

**Interfaces:** None.

- [ ] **Step 1: Update repository hygiene rules**

Append:

```gitignore
.DS_Store
.env
.env.*
!.env.example
```

- [ ] **Step 2: Update API documentation**

Document per-slice TTLs and metadata, background ownership, popup fresh-cache
behavior, forced manual refresh, conditional `warningInfo`, cyclone endpoints,
approved origins, 10-second timeout, and two bounded transient retries.

- [ ] **Step 3: Run formatting and focused static checks**

Run:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx prettier --write \
  src/shared/hko-request.ts src/shared/weather-cache.ts src/shared/types.ts \
  src/shared/weather-service.ts src/background.ts src/popup/main.ts \
  tests/hko-request.test.ts tests/weather-cache.test.ts \
  tests/weather-refresh-api.test.ts tests/weather-service.test.ts \
  tests/background-refresh.test.ts tests/popup-refresh.test.ts \
  docs/api.md docs/superpowers/plans/2026-08-14-refresh-coordination.md
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run typecheck
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 4: Run complete project verification**

Run: `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test`

Expected: typecheck, lint, all unit tests, all 27 layout tests, and Chromium
build pass.

- [ ] **Step 5: Review diff against every #45 acceptance criterion**

Run: `git diff origin/main...HEAD --check && git status --short --branch` and
confirm no unrelated files, generated build output, environment files, or
dependency changes are included.

- [ ] **Step 6: Commit**

```bash
git add .gitignore docs/api.md docs/superpowers/plans/2026-08-14-refresh-coordination.md
git commit -m "docs: describe coordinated refresh behavior"
```
