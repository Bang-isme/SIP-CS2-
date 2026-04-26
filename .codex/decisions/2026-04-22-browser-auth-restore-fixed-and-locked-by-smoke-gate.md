# Browser Auth Restore Fixed And Locked By Smoke Gate

- Date: 2026-04-22
- Scope: Dashboard auth restore, protected-route reload, browser regression verification

## Context

Live browser audit found a production-grade gap that repo-level API and unit gates were not catching:

- login succeeded
- protected routes worked during SPA navigation
- reloading `/dashboard/admin/employees` or opening a protected deep link could drop the user back to `/login`
- browser console showed `POST /api/auth/refresh` failing during restore

This was a real operational gap because the workspace did not survive reload and deep links like a normal internal app.

## Root Cause

The failure was not the refresh cookie itself. Browser-level verification proved:

- `GET /api/auth/session` saw the refresh cookie
- a manual browser `fetch('/api/auth/refresh', { body: '{}' })` succeeded
- the app-driven refresh path failed

The actual breakage was the frontend API client sending `axios.post(..., null)` while still advertising `Content-Type: application/json`. That created a request shape that Express rejected with `400` before the refresh handler restored the session.

## Decision

Use a consistent no-body JSON post contract in the dashboard frontend:

- send `{}` instead of `null` for POST requests that have no semantic payload but still go through the JSON API surface
- apply the rule to session restore first, and to similar actions such as logout revocation and manual summary rebuild

Then add a browser smoke gate so this class of regression does not slip past API-only verification again.

## Implementation

- Updated `dashboard/src/services/api.js`
  - refresh rotation now posts `{}` to `/auth/refresh`
  - logout revoke now posts `{}` to `/auth/logout`
  - manual summary rebuild now posts `{}` to `/dashboard/refresh-summaries`
- Added regression coverage in `dashboard/src/services/api.test.js`
- Added `autocomplete` attributes to the login form for cleaner browser audit output
- Added `scripts/verify-case3-browser-auth.ps1`
  - signs in through the real browser
  - reloads a protected route
  - opens a protected deep link in a fresh page context
  - fails if refresh restoration returns `400/401/403`
- Wired the browser smoke into `scripts/verify-case3-stack.ps1`
- Added `npm run verify:case3:browser-auth`

## Consequences

- `verify:case3` now checks the most important browser auth lifecycle, not just API propagation
- protected-route reload and deep-link restore are treated as first-class operational contracts
- future regressions in refresh restore should fail in the repo gate, not only during manual demo rehearsal
