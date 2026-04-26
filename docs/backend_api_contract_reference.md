# Backend API Contract Reference

> Last Updated: 2026-04-15

## Objective

This document identifies the canonical backend contract source for FE and operator workflows, so the team does not have to guess behavior by reading controllers alone.

---

## Canonical Source

- Machine-readable spec: `GET /api/contracts/openapi.json`
- Interactive docs: `GET /api/contracts/docs/`
- Owner: backend runtime

Current scope includes:

- auth signup/signin/refresh/logout/profile
- admin users list/detail/role mutation
- health live/ready/integration probes
- employee list/detail/mutation
- dashboard summary/executive brief/drilldown/departments
- alerts triggered/config/acknowledge/type employees
- integration operator APIs
- sync operator APIs
- legacy products compatibility module

---

## How FE and Operators Should Use It

1. Use OpenAPI as the source of truth for route paths, query params, auth requirements, and response envelopes.
2. For quick inspection during demo, viva, or onboarding:
   - open `GET /api/contracts/docs/`
   - inspect route, query, schema, and auth details from Swagger UI
3. Prioritize these sections:
   - `paths`
   - `components.schemas`
   - `components.securitySchemes`

For eventual-consistency workflows, also cross-check:

- `EmployeeMutationResponse.sync`
- `/sync/logs` with `correlationId`
- `/integrations/events`
- `/integrations/events/{id}/audit`

---

## Auth and Compatibility Notes

- `POST /auth/logout` is the canonical logout route.
- `GET /auth/logout` still exists only as a deprecated compatibility alias.
- The deprecated alias now returns deprecation headers:
  - `Deprecation`
  - `Sunset`
  - `Link`
- Auth guard failures expose machine-readable codes such as:
  - `AUTH_TOKEN_MISSING`
  - `AUTH_UNAUTHORIZED`
  - `AUTH_FORBIDDEN`
  - `AUTH_TOKEN_REVOKED`

Important nuance:

- `SA` runs with persistent session checks against `User.tokens[]`
- `Payroll` and `Dashboard` can verify JWTs in stateless service mode

---

## Canonical Error Envelope

All FE/operator-facing API errors should be read in this order:

- `code`: machine-readable branch key
- `message`: human-readable explanation
- `requestId`: trace token for logs and evidence
- `errors[]`: field-level validation details when present

Representative codes in active use:

- `VALIDATION_ERROR`
- `API_ROUTE_NOT_FOUND`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_TOKEN_MISSING`
- `ALERT_NOT_FOUND`
- `EMPLOYEE_NOT_FOUND`
- `INTEGRATION_EVENT_NOT_FOUND`
- `USER_NOT_FOUND`

---

## Things To Understand Correctly

- This spec is a contract bundle for the FE/operator surfaces actually used by the repo. It is not a public API platform spec.
- Auth signin remains backward-compatible:
  - `identifier`
  - legacy `email`
  - explicit `username`
- Error handling should not rely on `message` alone; UI and operator logic should branch on `code`.
- Unknown API routes now return JSON contract errors instead of Express HTML.
- Some legacy routes still exist for compatibility:
  - `GET /api/employee/{employeeLookup}` prefers business `employeeId`
  - `PUT/DELETE /api/employee/{id}` still use Mongo document id for mutation
- CSV export is still a special file response and is not the main JSON contract focus.

---

## Contract Implications For Current Architecture

- `SA` is the owner of auth, employee mutation, integration control, and OpenAPI publishing.
- `Payroll` is the owner of payroll evidence and internal payroll mutation handling.
- `Dashboard` is the owner of reporting and alerts APIs.
- The active Case 3 outbox lives in MongoDB under the SA boundary.
- A single `correlationId` can now be traced across:
  - employee mutation response
  - Mongo outbox event
  - Payroll `sync_log`

---

## When To Update The Spec

Update `GET /api/contracts/openapi.json` together with code when:

- adding new dashboard/alerts/integrations/sync/employee routes
- changing auth/user/health routes used by FE or operators
- changing query params or response envelopes
- changing auth or role requirements
- changing auth failure codes or deprecation headers
- changing the meaning of `sync`, `meta`, or `correlationId`

---

## Current Verdict

For coursework and demo scope, backend is functionally complete enough to act as the source of truth for FE/operator contracts.

The remaining work is polish, not a blocker:

- keep docs aligned with the service split
- expand static analysis further if stricter enforcement is desired
- only beyond coursework scope, replace DB-backed polling with broker-grade middleware and deeper observability

---

## Evidence Path

- Route: `src/routes/contracts.routes.js`
- Controller: `src/controllers/contracts.controller.js`
- Spec source: `src/contracts/openapi.contract.js`
- Regression: `src/__tests__/contracts.routes.test.js`
- Error helpers: `src/utils/apiErrors.js`
- Fallback handlers: `src/middlewares/errorHandler.js`
- Logger boundary: `src/utils/logger.js`

---

## Logging Notes For Tests

- `NODE_ENV=test` uses low-noise logging defaults so gate output stays readable.
- If local debugging needs more visibility:
  - set `LOG_LEVEL=DEBUG|INFO|WARN|ERROR`
  - set `HTTP_LOG_LEVEL=verbose`

---

## Lint Gate Notes

- `npm run lint` runs:
  - `lint:syntax`
  - `lint:static`
- Current static rules focus on runtime safety rather than style churn.
