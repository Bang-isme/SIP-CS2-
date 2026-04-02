# Decision: end-to-end sync correlation tracing across request, outbox, worker, and adapter logs
Date: 2026-04-02
Status: accepted

## Context
Request tracing already existed at the HTTP/API envelope layer, and queue operator actions already had durable audit history. The remaining observability gap was the employee sync path itself: once work left the request thread and moved into the outbox worker or direct fallback path, there was no stable correlation token tying the original mutation response to `integration_events` rows and `sync_log` rows.

## Decision
Promote request-scoped correlation into a backend-wide sync workflow token by storing `correlation_id` on both `integration_events` and `sync_log`, propagating it from employee mutations into outbox/direct fallback execution, and preserving it across manual sync retry flows.

## Alternatives Considered
Keep correlation only in HTTP responses and server logs; create a separate tracing table just for sync workflows; or defer async traceability until a future broker-grade platform is introduced.

## Reasoning
The coursework architecture already uses a DB-backed outbox and MySQL sync logs, so the highest-signal improvement is to carry one stable token through the existing persistence points instead of inventing a second tracing subsystem. This keeps the BE contract simple for FE/demo evidence: one `sync.correlationId` from the employee response can now be matched against both queue state and downstream sync results.

## Consequences
- Employee create/update/delete responses now expose `sync.correlationId` so FE has a stable workflow token immediately.
- `integration_events` and `sync_log` now persist `correlation_id`, with migration/readiness guard `20260402_000004_integration_correlation_trace`.
- The outbox worker and direct fallback paths now preserve the same correlation token, so async processing no longer breaks the trace chain.
- Manual sync retry reuses the original failed log correlation when available, or falls back to the operator request correlation when replaying older rows.
