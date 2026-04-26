# Case Study 3 - Test Plan

> Last Updated: 2026-04-15

## Objective

Prove that `SA`, `Payroll`, and `Dashboard` now behave as separate runtime systems, while the consistency story remains honest and observable.

---

## 1. Startup Tests

Run:

```powershell
npm run case3:stack:start
```

Verify:

- `http://127.0.0.1:4000/api/health/live`
- `http://127.0.0.1:4100/api/health/live`
- `http://127.0.0.1:4200/api/health/live`

Expected:

- all three services answer independently
- service names and ports are distinct
- Payroll can boot without Mongo
- SA can boot without MySQL

---

## 2. Boundary Tests

### SA Service

Should expose:

- `/api/auth/*`
- `/api/users/*`
- `/api/employee/*`
- `/api/sync/*`
- `/api/integrations/*`

Should not expose:

- dashboard routes
- payroll read APIs

### Payroll Service

Should expose:

- `/api/payroll/health`
- `/api/payroll/pay-rates`
- `/api/payroll/pay-rates/:employeeId`
- `/api/payroll/sync-log`
- `/api/payroll/sync-log/:employeeId`
- `/api/payroll/internal/*`

Should not expose:

- employee mutation routes
- auth management routes
- dashboard routes

### Dashboard Service

Should expose:

- `/api/dashboard/*`
- `/api/alerts/*`
- `/api/health/*`

Should not expose:

- auth mutation routes
- payroll mutation routes
- employee CRUD routes

---

## 3. End-to-End Flow

Recommended:

```powershell
npm run verify:case3
```

This check must prove:

- sign-in works through SA
- create employee in SA returns sync evidence
- SA queue/event flow reaches Payroll
- Payroll shows the new pay-rate record
- update employee in SA produces a new active pay-rate row in Payroll
- delete employee in SA produces `TERMINATED` evidence in Payroll
- Dashboard executive brief is `fresh`
- Dashboard alert ownership has already been baselined
- executive brief is not in `Action Required`
- `needsAttentionCategories = 0`

Manual version:

1. Sign in through SA.
2. Create employee in SA.
3. Observe `sync.status = QUEUED` and `sync.mode = OUTBOX`.
4. Open queue/operator evidence from SA if needed.
5. Open Payroll console.
6. Search the same employee ID and confirm pay-rate evidence appears.
7. Update pay rate in SA.
8. Reload Payroll and confirm active pay-rate row changed.
9. Delete employee in SA.
10. Confirm Payroll history now contains terminated evidence.
11. Open Dashboard and confirm executive brief remains `fresh` and `Ready for Memo`.

---

## 4. Failure-Path Checks

Check at least one unhappy path:

- stop or break downstream processing and confirm queue state moves to `FAILED` or `DEAD`
- run retry or replay from SA
- run recover-stuck when events exceed the processing timeout
- verify the same `correlationId` appears in queue and Payroll evidence

What to defend:

- this is controlled eventual consistency
- this is not ACID across MongoDB and MySQL
- operator recovery exists and is visible

---

## 5. Regression Checks

- Dashboard login still works through SA auth
- Dashboard reporting still loads from Dashboard Service
- Payroll public APIs remain read-only
- SA no longer writes payroll tables directly
- Payroll remains the owner of `pay_rates` and `sync_log`
- active outbox remains in MongoDB, not MySQL

---

## 6. Pass Criteria

Case Study 3 is considered demo-ready when:

- three processes are visible
- source mutation happens in SA only
- outbox state is visible from SA only
- downstream payroll evidence is readable from Payroll only
- same JWT is accepted across services according to each service auth mode
- narrative matches implementation:
  - `SA -> Mongo outbox -> Payroll internal API -> Payroll MySQL`
- `verify:case3` passes without manual patch-up
- dashboard executive brief lands in `Ready for Memo`
