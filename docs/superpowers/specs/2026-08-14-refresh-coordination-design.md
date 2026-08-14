# Refresh Coordination and HKO API Usage Design

## Goal

Make background refreshes the authoritative cache writer, prevent concurrent
refreshes from overwriting newer data, avoid unnecessary HKO requests, and keep
each weather-data slice usable when another slice fails.

This design implements GitHub issue #45 without changing the visible popup
layout or adding browser-specific behavior.

## Current Problems

- Full, current-weather, forecast, and warning refreshes each read and later
  replace the complete `weatherCache` object. Two refreshes that overlap can
  therefore restore stale values from the refresh that finishes last.
- The popup displays a valid cache but immediately performs another full
  refresh whenever it opens.
- A single `fetchedAt`, `stale`, and `error` describes data with different
  refresh cadences.
- Tropical-cyclone requests are best effort, but failure currently replaces a
  valid prior list with an empty list.
- HKO fetches have no finite timeout, retry policy, or shared URL validation.
- Warning summary and detail are fetched together even when the summary has not
  changed.
- Stored settings accept malformed runtime values and only partially protect
  alarm periods at the call site.

## Chosen Architecture

Use one stored `WeatherData` document for compatibility, but attach independent
metadata to four slices: `current`, `forecast`, `warnings`, and
`tropicalCyclones`. Background code remains responsible for deciding which
slices need refresh. Cache writes use a serialized atomic-update helper that
re-reads the latest stored value immediately before merging only the updated
slice.

This keeps popup rendering simple, avoids additional extension storage keys,
and removes lost updates without forcing unrelated network work to wait for a
single long full-refresh request.

## Data Model

Add a `WeatherSliceState` value with:

- `fetchedAt: string | null`: time of the last successful fetch for the slice.
- `stale: boolean`: whether the last requested refresh failed or no successful
  timestamp exists.
- `error: WeatherError | null`: the latest error for this slice.

Add `sliceStates` to `WeatherData` with keys `current`, `forecast`, `warnings`,
and `tropicalCyclones`.

The existing top-level `fetchedAt`, `stale`, and `error` remain during this
change as a compatibility summary for popup rendering and older tests:

- `fetchedAt` is the newest successful slice timestamp.
- `stale` is true when any slice is stale.
- `error` is the most recent non-null slice error, or null.

An old cache without `sliceStates` remains displayable. Its slices are treated
as expired, so background refreshes all of them once and writes the new format.
A cache in another language is not reused for network-error fallback.

## Refresh Ownership and Data Flow

The background script exposes two message modes:

- Popup open: `refreshWeather` with `force: false`. It refreshes only expired
  slices and returns the resulting cache. If every slice is fresh, it performs
  no HKO weather request.
- Manual refresh: `refreshWeather` with `force: true`. It attempts every slice
  regardless of freshness.

The popup first reads and renders a matching cache immediately. It then asks
the background to refresh. It does not call `refreshWeather` directly if
runtime messaging is unavailable; it retains the cache and displays the error.
This makes the background the authoritative cache writer in extension runtime.

Install and startup request a forced refresh. Alarms request their relevant
slice. Existing in-flight coalescing remains, while the cache-update helper
serializes only the short read-merge-write operation. A refresh that finishes
later can replace only its own slice and cannot restore older values in other
slices.

## Freshness Rules

- Current weather: `currentRefreshMinutes`, normalized to 10 through 120
  minutes; default 15.
- Warnings: `warningCheckMinutes`, normalized to 5 through 60 minutes; default 5.
- Forecast: fixed 120 minutes.
- Tropical cyclones: fixed 60 minutes.

TTL comparison uses the slice's last successful `fetchedAt`. Missing, invalid,
or future timestamps are expired. Manual refresh bypasses all TTL checks.

## Slice Behavior

### Current weather

Fetch `rhrread` and the latest UV CSV. UV remains best effort and falls back to
the UV value from `rhrread`. On failure, preserve the previous current-weather
data and mark only the current slice stale.

### Forecast

Fetch `fnd`. On failure, preserve the previous forecast and mark only the
forecast slice stale.

### Warnings

Fetch `warnsum` first and derive a stable fingerprint from its normalized
active-warning identity and timestamps. If the fingerprint matches the prior
successful warning slice, reuse cached `warningInfo`; otherwise fetch
`warningInfo` and normalize both datasets. Notification reconciliation happens
after the atomic warning merge and compares the prior complete cache with the
merged result.

If warning detail fails after a changed summary, preserve the prior warning
slice rather than mixing a new summary with old detail, and mark the slice
stale.

### Tropical cyclones

Fetch the active-cyclone list and tracks independently of current weather. An
empty successful list replaces prior data. A request or parse failure preserves
the last successful cyclone list and marks only this slice stale.

## HKO Request Helper

All runtime HKO JSON, CSV, and XML requests use one helper with these rules:

- Only HTTPS URLs on `data.weather.gov.hk`, `www.weather.gov.hk`, or
  `www.hko.gov.hk` are accepted.
- Generated tropical-cyclone track URLs are validated before fetching.
- Each attempt uses an abort timeout of 10 seconds.
- Retry at most two times after the initial attempt, with bounded delays of
  250 ms and 750 ms.
- Retry network errors, timeout/abort failures, HTTP 429, and HTTP 5xx.
- Do not retry schema/parse failures or other HTTP 4xx responses.
- Test hooks inject fetch, timers, and current time through function options;
  production behavior continues to use platform globals.

## Settings Validation

`normalizeSettings` validates values loaded from sync storage:

- language and badge mode must be recognized enum members;
- notification booleans must be actual booleans;
- warning-category arrays retain only recognized string values and preserve the
  existing legacy `rain` migration;
- `currentRefreshMinutes` is finite and clamped to 10 through 120;
- `warningCheckMinutes` is finite and clamped to 5 through 60.

Saving settings uses the same normalization, so invalid values cannot be
written back by extension code.

## Documentation and Repository Hygiene

Update `docs/api.md` to list the actual full and partial refresh paths, TTLs,
warning-detail shortcut, cyclone resources, and request timeout/retry policy.

Add `.env`, `.env.*`, and `.DS_Store` to `.gitignore`, followed by
`!.env.example` so a documented example may be committed later.

## Testing

Follow red-green-refactor cycles and add focused unit coverage for:

- two partial refreshes completing in reverse order without losing either
  slice;
- popup-open refresh with a fully fresh cache making no HKO requests;
- each stale slice refreshing independently and manual refresh forcing all
  slices;
- old cache migration to per-slice state;
- unchanged warning summary skipping `warningInfo`;
- changed warning summary requiring `warningInfo`;
- transient cyclone failure preserving prior data and recording stale/error;
- timeout and bounded retry behavior, including non-retryable failures;
- rejection of malformed or unexpected-origin URLs;
- malformed synced settings falling back or clamping to safe values;
- popup no longer writing cache through a direct-refresh fallback.

Run the complete required validation with Node 20.19 or later:

```bash
npm test
```

The popup layout is unchanged, so existing Playwright layout scenarios remain
the browser-level regression suite.

## Non-Goals

- Changing popup layout, copy, imagery behavior, or store packaging.
- Adding new user-facing refresh interval controls.
- Persisting request queues across service-worker suspension.
- Changing supported browsers or adding Chrome-only APIs.
