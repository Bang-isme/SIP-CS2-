# Solutions Overview

> Last Updated: 2026-04-15

## Summary

The repo now solves the coursework with three visible systems:

1. `SA / HR Service`
2. `Payroll Service`
3. `Dashboard Service`

They still live in one repository and share code where practical, but they are started, inspected, and defended as separate runtime systems. That is the key architectural improvement for Case Study 3.

---

## 1. System Map

### SA / HR Service

- Port: `4000`
- Owns:
  - `/api/auth`
  - `/api/users`
  - `/api/employee`
  - `/api/sync`
  - `/api/integrations`
  - `/api/contracts`
- Role in coursework:
  - Case 3 source-of-truth system
  - Case 4 integration control plane

### Payroll Service

- Port: `4100`
- Owns:
  - `/api/payroll/health`
  - `/api/payroll/pay-rates`
  - `/api/payroll/pay-rates/:employeeId`
  - `/api/payroll/sync-log`
  - `/api/payroll/sync-log/:employeeId`
  - minimal UI at `/`
  - internal mutation endpoints under `/api/payroll/internal/*`
- Role in coursework:
  - visible downstream target for Case 3
  - owner of payroll write path

### Dashboard Service

- Port: `4200`
- Owns:
  - `/api/dashboard/*`
  - `/api/alerts/*`
  - `/api/health/*`
  - built React dashboard UI at `/` when `dashboard/dist` exists
- Role in coursework:
  - Case 2 presentation-style integration and reporting system

---

## 2. Data Boundaries

### MongoDB

Owned or used by SA:

- employee source records
- users and roles
- alert configs and acknowledgement context
- departments
- `integration_events`
- `integration_event_audits`

### MySQL

Owned by Payroll or Dashboard reporting:

- payroll pay-rate history
- payroll sync evidence (`sync_log`)
- dashboard summary tables
- dashboard drilldown support tables

Important clarification:

- the active outbox is no longer in MySQL
- `integration_events` and `integration_event_audits` are MongoDB collections in the SA boundary

---

## 3. Cross-System Flow

The current Case 3 path is:

```text
SA write
-> MongoDB source record
-> MongoDB outbox event
-> SA worker
-> Payroll internal API
-> Payroll MySQL write path
-> Payroll sync evidence
```

This means:

- `SA` no longer writes payroll tables directly
- `Payroll` now owns writes to `pay_rates` and `sync_log`
- `Dashboard` is downstream reporting, not the integration middleware

---

## 4. Why This Is Better Than the Previous Runtime

Before the refactor, the codebase looked like one Express app talking to two databases. That shape was easy to criticize as "monolith with 2 DBs".

The current defense is stronger because:

- SA is a visible source system
- Payroll is a visible downstream system with its own port and console
- Dashboard is a visible reporting system with its own API and UI
- cross-system behavior is observable through health endpoints, queue APIs, correlation IDs, and payroll sync logs

This is still not claimed as enterprise microservices. It is a coursework-grade multi-service runtime with clearer ownership and better demo evidence.

---

## 5. Demo Entry Points

```powershell
npm run case3:stack:start
```

Then open:

- `http://127.0.0.1:4000/api`
- `http://127.0.0.1:4100/`
- `http://127.0.0.1:4200/`

What the startup flow now does:

- starts all three services
- warms dashboard summaries
- prepares current alert ownership so the executive brief is ready for memo review

---

## 6. Verification Entry Point

```powershell
npm run verify:case3
```

This verifies:

- three services boot independently
- shared JWT auth works across services according to each service auth mode
- employee create propagates from SA to Payroll
- employee update changes active pay rate in Payroll
- employee delete produces terminated payroll evidence
- Dashboard still accepts the same session token
- executive brief is `fresh`
- alert follow-up queue has no remaining categories needing attention

Expected demo posture after verification:

- action center is not `Action Required`
- executive brief is ready to defend as `Ready for Memo`
