# Known Gaps - 2026-02-21

## Purpose
Single-page truth list for viva/demo defense. Distinguishes implemented scope vs roadmap.

## 1) Integration Depth
- Outbox + worker + replay/retry are implemented.
- Stale `PROCESSING` recovery now has timeout-based hardening, but this is still MongoDB-backed outbox middleware-lite rather than broker-grade operations.
- Broker-grade architecture (Kafka/RabbitMQ), DLQ routing, and full observability stack are not implemented yet.
- Runtime is split clearly for demo defense, but deployment is still same-repo and not a full enterprise service platform.

## 2) Consistency Model
- Eventual consistency is implemented and test-covered.
- Strong consistency/2PC across MongoDB + MySQL is not implemented.

## 3) Database Operations
- Runtime `sequelize.sync` is blocked in production mode.
- Bootstrap migration workflow exists (`npm run db:migrate:mysql`) but full incremental/versioned migration pipeline is still pending.
- Dashboard still reads MongoDB + MySQL directly for reporting; it is a reporting boundary, not a pure API-only read layer.

## 4) Security Posture
- Backend production dependencies are clean as of 2026-03-19 (`npm audit --omit=dev` -> 0 vulnerabilities after dependency refresh).
- Full workspace `npm audit` still reports advisories in legacy dev tooling; this is a cleanup backlog, not a current production-dependency blocker.
- Security scan still reports warning-level findings (logging/http-local/demo artifacts).
- Case 5 now has a runnable readiness-safe snapshot, but it is still posture evidence, not production failover evidence.

## 5) UI/UX and A11y
- Critical WCAG AA static issues are resolved in current scan.
- UX static audit still reports advisory warnings (mostly interaction-state heuristics and polish issues).

## 6) Case Study Positioning (No Overclaim)
- Case 1: docs-level complete.
- Case 2: implemented and demoable.
- Case 3: partial-to-strong coursework level (eventual consistency path).
- Case 4: partial (middleware-lite implementation, not enterprise middleware stack).
- Case 5: readiness-evidence level, not production infra rollout.
