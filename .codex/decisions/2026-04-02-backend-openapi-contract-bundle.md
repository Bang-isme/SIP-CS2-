# Decision: expose a backend-owned OpenAPI contract bundle for FE and operator consumers
Date: 2026-04-02
Status: accepted

## Context
After hardening dashboard, alerts, integrations, sync, and employee contracts, the backend behavior was much cleaner, but FE and operator tooling still had to infer many details from code and tests. The next improvement was to turn those stabilized contracts into one machine-readable backend source of truth.

## Decision
Expose `GET /api/contracts/openapi.json` from the backend and back it with a curated OpenAPI 3.1 bundle covering the FE/operator surfaces that are actually used in this project.

## Alternatives Considered
Keep relying on prose docs and tests only; add a Swagger UI dependency immediately; or wait until every single route in the repo was perfectly normalized before documenting any machine-readable contract.

## Reasoning
The BE-first value here is not flashy docs UI, but giving FE a stable artifact that encodes route paths, auth requirements, request params, and shared envelope patterns in one place. Serving JSON directly from the backend keeps the source of truth close to the implementation and lets contract tests guard it.

## Consequences
- FE and operator tooling now have a machine-readable contract source at `/api/contracts/openapi.json`.
- The current bundle covers auth, employee, dashboard, alerts, integrations, sync, and the contract route itself.
- Contract regression is now testable through `src/__tests__/contracts.routes.test.js` instead of depending only on human memory.
- The backend still avoids extra Swagger UI/runtime dependencies while gaining a standard contract artifact.
