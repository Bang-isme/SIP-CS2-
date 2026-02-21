# Known Gaps - 2026-02-21

## Purpose
Single-page truth list for viva/demo defense. Distinguishes implemented scope vs roadmap.

## 1) Integration Depth
- Outbox + worker + replay/retry are implemented.
- Broker-grade architecture (Kafka/RabbitMQ), DLQ routing, and full observability stack are not implemented yet.

## 2) Consistency Model
- Eventual consistency is implemented and test-covered.
- Strong consistency/2PC across MongoDB + MySQL is not implemented.

## 3) Database Operations
- Runtime `sequelize.sync` is blocked in production mode.
- Bootstrap migration workflow exists (`npm run db:migrate:mysql`) but full incremental/versioned migration pipeline is still pending.

## 4) Security Posture
- No critical/high vulnerabilities in backend production dependencies (`npm audit --omit=dev`).
- One moderate advisory remains transitively via `sequelize -> lodash`.
- Security scan still reports warning-level findings (logging/http-local/demo artifacts).

## 5) UI/UX and A11y
- Critical WCAG AA static issues are resolved in current scan.
- UX static audit still reports advisory warnings (mostly interaction-state heuristics and polish issues).

## 6) Case Study Positioning (No Overclaim)
- Case 1: docs-level complete.
- Case 2: implemented and demoable.
- Case 3: partial-to-strong coursework level (eventual consistency path).
- Case 4: partial (middleware-lite implementation, not enterprise middleware stack).
- Case 5: docs/rehearsal level, not production infra rollout.
