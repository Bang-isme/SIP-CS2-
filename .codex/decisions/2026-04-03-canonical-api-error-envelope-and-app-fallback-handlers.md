# Decision: Canonical API Error Envelope and App Fallback Handlers

Date: 2026-04-03

## Context

The backend had improved auth guard errors and request tracing, but many controller paths still returned ad-hoc error JSON. That left FE/operator logic dependent on per-controller `message` text and created a hole where unknown routes could still fall back to Express defaults instead of a backend-owned JSON contract.

## Decision

Introduce a shared backend helper for API errors and route all main controller families through it:
- `src/utils/apiErrors.js`
- `src/middlewares/errorHandler.js`

Shared envelope:
- `success`
- `message`
- `code`
- `requestId`
- optional `errors[]`

Apply this contract to:
- auth
- users
- employee
- dashboard
- alerts
- integrations
- sync

Also add app-level fallback handlers so:
- unknown routes return JSON `404` with `API_ROUTE_NOT_FOUND`
- uncaught app errors return JSON `500` with `INTERNAL_SERVER_ERROR`

## Why

- FE can branch on stable `code` values instead of parsing free-text `message`.
- Operator/demo evidence stays consistent across normal controller failures and route/misconfiguration mistakes.
- Request tracing remains useful because `requestId` is always present in the same place.
- Controller unit tests can keep direct invocation style because controllers still return responses directly; this avoids a large refactor to `next(err)` + async wrappers everywhere.

## Consequences

Positive:
- Error contracts are more consistent across backend surfaces.
- Unknown routes no longer fall back to Express HTML.
- Validation/not-found/conflict/server failures are easier to document and test.

Tradeoff:
- Some legacy controllers still have custom success envelopes, so the error contract is now more unified than the success contract in a few older paths.
- Test output still shows structured logger noise for intentional error-path regression tests.

## Evidence

- `src/utils/apiErrors.js`
- `src/middlewares/errorHandler.js`
- `src/app.js`
- `src/__tests__/app.error-contract.test.js`
- `src/__tests__/alerts.controller.behavior.test.js`
- `src/__tests__/employee.controller.behavior.test.js`
