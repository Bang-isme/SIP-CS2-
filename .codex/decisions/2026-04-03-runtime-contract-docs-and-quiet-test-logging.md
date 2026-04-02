# Decision: Runtime Contract Docs and Quiet Test Logging

Date: 2026-04-03
Status: accepted

## Context

Backend contract quality was already strong at the JSON/spec level, but two operator-facing gaps remained:

- FE/operator teammates still had to read raw OpenAPI JSON instead of a runtime-friendly docs surface.
- Backend tests still produced avoidable logger/access-log noise, which made real blockers harder to spot during verification.

Neither issue broke business logic, but both reduced clarity and reliability around the backend as the source of truth.

## Decision

1. Keep `GET /api/contracts/openapi.json` as the machine-readable source of truth.
2. Add `GET /api/contracts/docs/` as a local Swagger UI surface generated from the same backend-owned OpenAPI bundle.
3. Serve Swagger UI assets locally from `swagger-ui-dist`, not from an external CDN.
4. Avoid inline script/style in the docs HTML so the route remains compatible with stricter security headers.
5. Default structured logger to `SILENT` when `NODE_ENV=test`, unless `LOG_LEVEL` is explicitly set.
6. Disable `morgan` access logs in test by default, unless `HTTP_LOG_LEVEL=verbose` is explicitly set.

## Why

- This keeps BE truly self-describing for FE, operators, and viva/demo walkthroughs.
- It improves verification signal-to-noise without weakening runtime observability in dev/prod.
- The explicit env overrides preserve debuggability when a developer actually wants noisy logs during test troubleshooting.

## Consequences

Positive:
- Contract review is now possible through both JSON and interactive docs, from the same backend source.
- Test output is cleaner and more actionable.
- The docs route stays local-only and does not depend on third-party availability.

Trade-offs:
- One extra dependency (`swagger-ui-dist`) is now part of the backend runtime.
- The docs surface must stay aligned whenever OpenAPI source paths or naming change.

## Evidence

- `src/controllers/contracts.controller.js`
- `src/routes/contracts.routes.js`
- `src/contracts/openapi.contract.js`
- `src/utils/logger.js`
- `src/app.js`
- `src/__tests__/contracts.routes.test.js`
- `src/__tests__/logger.test.js`
