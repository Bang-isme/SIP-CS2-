# Decision: request tracing for dashboard and integration contracts
Date: 2026-04-02
Status: accepted

## Context
After hardening dashboard and integration contracts, the remaining backend gap was operator/debug traceability. Auth failures, validation failures, and metadata envelopes needed one correlation token so FE, logs, and manual demo evidence all refer to the same request.

## Decision
Adopt a shared request-context middleware that assigns or echoes x-request-id, injects requestId into JSON/meta error contracts, and exposes request-scoped tracing across dashboard, alerts, auth-guard, and integration APIs.

## Alternatives Considered
Keep tracing as documentation-only guidance; add requestId manually in each controller response; or postpone tracing until a future broker/observability phase.

## Reasoning
Middleware-level tracing keeps the backend contract authoritative without duplicating requestId logic across cached dashboard responses, auth guards, and operator APIs. It also gives FE and demo troubleshooting a stable correlation token now, while remaining compatible with a future broker-grade observability stack.

## Consequences
- `src/middlewares/requestContext.js` is now the shared API-layer tracing boundary: it assigns or echoes `x-request-id` and injects request IDs into JSON/send responses without forcing controller-local duplication.
- `src/utils/requestTracking.js` centralizes request ID normalization and response injection rules, so auth failures, validation failures, and canonical `meta` envelopes all behave consistently.
- Dashboard, alerts, and integration contracts now expose a stable correlation token that FE and operators can capture during demo/recovery flows.
- Current tracing scope stops at the HTTP/API layer; future broker/worker observability can extend this request ID pattern into outbox processing rather than replacing it.
