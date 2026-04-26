# Decision: Authoritative session probe and two-way browser auth proof

- Date: 2026-04-23
- Scope: SA auth controller, browser auth verification, homework SSO proof quality

## Context

The homework SSO implementation was already strong, but two source-code gaps remained:

1. `GET /api/auth/session` only reported whether a refresh cookie was present, which made the probe advisory instead of authoritative.
2. Browser auth smoke only proved the Dashboard-first direction strongly enough. It did not lock the reverse `Payroll -> Dashboard` restore path with the same confidence.

These gaps did not break the runtime, but they kept the implementation closer to “safe and convincing” than “fully hardened for defense”.

## Decision

We hardened both gaps:

1. `sessionStatusHandler` now validates that the refresh token is structurally valid, belongs to a real user, and is still present in the persisted token store before returning `refreshAvailable: true`.
2. The browser auth smoke now proves both directions:
   - `Dashboard -> protected Dashboard reload/deep link -> Payroll evidence`
   - `Payroll sign-in -> protected Dashboard restore`

## Rationale

- A real SSO probe should answer “can this session actually be restored?” instead of “is there some cookie string present?”
- Homework/runtime proof is materially stronger when the reverse direction is automated, not just claimed in docs or video.
- We preserved the response shape so Dashboard and Payroll clients did not require a broader refactor.

## Consequences

- `GET /api/auth/session` remains a non-throwing probe, but it is now trustworthy enough for session bootstrap.
- Invalid or revoked refresh cookies are proactively cleared during the probe path.
- `verify:case3:browser-auth` is now a two-way SSO proof gate, and `verify:case3` inherits that improvement automatically.

## Verification

- `npm run lint`
- `node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js --runInBand --runTestsByPath src/__tests__/auth.refresh.contract.test.js src/__tests__/payrollConsole.sessionFlow.test.js`
- `npm --prefix dashboard run verify:frontend`
- `npm run verify:case3:browser-auth`
- `npm run verify:case3`
