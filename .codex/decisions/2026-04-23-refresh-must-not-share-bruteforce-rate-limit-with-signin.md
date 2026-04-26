# Decision: refresh must not share brute-force rate limiting with sign-in

- Date: 2026-04-23
- Scope: auth routes, rate limiter semantics, homework SSO runtime reliability

## Context

The auth stack originally applied the same `authRateLimiter` to:

- `POST /api/auth/signin`
- `POST /api/auth/signup`
- `POST /api/auth/refresh`

This looked safe at first, but a deeper audit exposed a real operational problem: browser-level SSO restore can legitimately trigger multiple refresh calls across reloads, protected-route deep links, and cross-app restore scenarios. Using the brute-force sign-in limiter for refresh meant session maintenance could be throttled by behavior that is not a credential attack.

The issue surfaced during `verify:case3`, where the new two-way browser auth smoke and the operations demo smoke could collectively trip `AUTH_RATE_LIMITED`.

## Decision

Split refresh traffic onto its own limiter:

- `signin` / `signup` keep `authRateLimiter` (`max=10`, 60s)
- `refresh` now uses `authRefreshRateLimiter` (`max=30`, 60s)

## Rationale

- Sign-in / sign-up are credential-entry surfaces and should stay tightly rate limited.
- Refresh is a session-maintenance surface and must tolerate normal multi-page SSO restore patterns.
- A system that claims “shared session restore” but blocks its own restore path under ordinary navigation is not operationally strong enough.

## Consequences

- Browser restore flows are materially more robust.
- The homework SSO proof no longer depends on lucky request ordering across multiple smoke gates.
- Auth hardening remains intact because credential-entry routes are still protected by the stricter limiter.

## Verification

- `npm run lint`
- `node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js --runInBand --runTestsByPath src/__tests__/rateLimit.middleware.test.js src/__tests__/auth.refresh.contract.test.js src/__tests__/payrollConsole.sessionFlow.test.js`
- `npm run verify:case3`
