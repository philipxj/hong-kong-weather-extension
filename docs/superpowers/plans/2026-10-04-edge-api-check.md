# Edge API Credential Check Implementation Plan

> **For agentic workers:** Use executing-plans to implement these steps sequentially.

**Goal:** Verify refreshed Edge credentials without changing a store submission.

**Architecture:** A Node helper makes one GET to the existing publish-operation
status endpoint. A manual Actions workflow supplies repository credentials and
a known operation ID. Only HTTP acceptance and the historical operation state
are reported; this does not prove current certification or publish a package.

**Tech Stack:** Node 24, Vitest, GitHub Actions.

## Global Constraints

- Fixed Microsoft API origin; no redirects or secret-bearing response output.
- GET only; no upload, publication, release sync, or version bump.
- Secret values remain in Actions; user enters/updates credentials directly.
- Keep the current in-review 0.1.11 submission intact.

## Task 1: Read-only verification

- [ ] Add failing tests in `tests/check-edge-api.test.ts` for GET success,
      missing credentials, invalid operation IDs, 401/403, and malformed responses.
- [ ] Implement `scripts/edge-api-check.mjs` and `scripts/check-edge-api.mjs`.
- [ ] Add `.github/workflows/edge-api-check.yml` with manual operation ID input,
      `contents: read`, and no publishing steps.
- [ ] Document CLI use and the 72-day key renewal requirement in
      `docs/release-upload.md`.
- [ ] Run targeted tests and full `npm test`; inspect the diff.
- [ ] Push and review a PR. Run the checker on the branch with the existing
      successful publish operation `5c63e606-5844-48af-a145-3b81b195ca9a`.
- [ ] Report the live API result separately from unit checks and store review.
