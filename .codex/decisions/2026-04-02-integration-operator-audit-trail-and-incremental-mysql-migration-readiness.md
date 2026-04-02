# Decision: integration operator audit trail and incremental mysql migration readiness
Date: 2026-04-02
Status: accepted

## Context
After request tracing, the remaining backend gap for Case Study 4 was persistence-level operator accountability. Retry/replay/recover requests needed durable auditability in the queue itself, and the current bootstrap-only migration flow needed one more capability check so environments do not pass readiness with missing audit columns.

## Decision
Persist operator audit fields on integration_events for retry/replay/recover actions, and treat the audit-column rollout as a required incremental MySQL migration enforced by readiness/status checks.

## Alternatives Considered
Leave operator evidence only in API responses; rely on logs without storing operator metadata in the queue table; or keep using a single baseline migration with no post-bootstrap schema capability checks.

## Reasoning
Operator APIs change system state, so response metadata alone is not durable evidence. Storing actor/request/action/time on integration_events gives the queue a self-contained audit trail, while incremental migration checks prevent environments from silently running new code against an outdated schema.

## Consequences
- `src/models/sql/IntegrationEvent.js` now carries durable operator audit columns so queue state changes can be explained from the database itself, not only from transient API responses or logs.
- `src/services/integrationOperatorService.js` and `src/services/integrationEventService.js` now stamp retry/replay/recover actions with operator actor/request/action/time metadata.
- `src/mysqlDatabase.js` and `scripts/migrate-mysql.js` now treat the audit-column rollout as a required migration capability, so readiness/status catches schema drift instead of assuming the baseline bootstrap is enough forever.
- Controller and recovery regression tests now assert operator audit propagation, reducing the risk of future refactors silently dropping accountability metadata.
