# Decision: harden `/api/sync` into the same canonical operator contract as dashboard and integration APIs
Date: 2026-04-02
Status: accepted

## Context
After dashboard, alerts, integration, and employee sync tracing were standardized, the `/api/sync` routes remained the main legacy operator surface. They still mixed inline route logic, ad-hoc validation, and inconsistent response shapes, which made FE/operator tooling treat sync status differently from the rest of the backend.

## Decision
Extract `/api/sync` behavior into a dedicated controller and shared contract utility, then standardize the endpoints on canonical `{ success, data, meta }` envelopes with `422 + errors[]` validation and correlation-aware log filters.

## Alternatives Considered
Leave `/api/sync` as a small internal-only legacy surface; deprecate it in favor of direct SQL inspection; or jump straight to full OpenAPI generation without normalizing the route behavior first.

## Reasoning
The most useful next step for FE-follow-BE was to make the sync operator APIs behave like the already-hardened dashboard and integration APIs. That gives one predictable contract style across operational surfaces, while the new `correlationId` filter makes the end-to-end tracing work practically usable instead of only theoretically present in DB rows.

## Consequences
- `/api/sync/status`, `/api/sync/logs`, `/api/sync/retry`, and `/api/sync/entity/:type/:id` now return canonical envelopes with `meta.dataset`, `meta.actorId`, and `meta.requestId`.
- Boundary validation now rejects malformed sync filters and entity params with `422 + errors[]` instead of silently coercing them.
- Operators and FE can now query sync logs by `correlationId`, which closes the loop between employee mutation responses and backend sync evidence.
- The sync surface now matches the same BE-first contract pattern already used by dashboard and integration APIs, reducing special-case FE handling.
