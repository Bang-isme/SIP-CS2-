# Decision: integration event audit history as backend source of operator evidence
Date: 2026-04-02
Status: accepted

## Context
After adding last operator metadata and request tracing, the remaining backend gap was historical operator evidence. Multiple retry/replay/recover actions could overwrite the latest row metadata, so Case Study 4 still lacked a durable, queryable audit history standard for FE/admin consumers.

## Decision
Add a dedicated integration_event_audits history table and admin audit-read API so retry/replay/recover actions produce durable per-event evidence instead of relying only on last-action fields or transient API responses.

## Alternatives Considered
Keep only last_operator fields on integration_events; rely on logs plus request IDs without a queryable DB history; or defer durable operator evidence to a future broker/observability phase.

## Reasoning
The queue row can expose the latest operator touch, but it cannot preserve full history across repeated retries. A dedicated audit table gives FE/admin tooling and viva evidence a stable backend source for who retried what, when, and from which request, while staying compatible with the existing DB-backed outbox architecture.

## Consequences
- `src/models/sql/IntegrationEventAudit.js` and `src/services/integrationAuditService.js` now provide a durable backend source of operator history per integration event.
- Retry, retry-dead, replay, and recover-stuck flows now append audit rows instead of relying only on latest-row metadata in `integration_events`.
- Admin consumers can fetch history via `GET /api/integrations/events/:id/audit`, which makes FE/admin tooling follow a stable BE-first audit contract.
- MySQL migration/readiness now has a second incremental guard for audit history so environments do not silently miss the audit table.
