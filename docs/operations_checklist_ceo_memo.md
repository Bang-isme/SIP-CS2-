# Operations Checklist - CEO Memo Alignment

> Last Updated: 2026-04-15
> Demo quick reference: `docs/demo_pass_checklist.md`

## 1. Objective

This checklist is the operator-facing reference for keeping the coursework demo stable and aligned with the CEO memo flow:

- summaries are available and fresh
- alerts follow the manage-by-exception model
- drilldown and export still work
- the integration recovery path is demonstrable

---

## 2. Preferred Demo Start Path

For the current architecture, prefer the split runtime stack:

```powershell
npm run case3:stack:start
```

What this gives you:

- local Mongo runtime
- `SA` on `4000`
- `Payroll` on `4100`
- `Dashboard` on `4200`
- dashboard build hosted by Dashboard Service if needed
- summary warm-up
- current alert ownership baseline via `prepare-dashboard-demo.js`

Stop it with:

```powershell
npm run case3:stack:stop
```

---

## 3. Daily Runbook

1. Start the split stack:
   - `npm run case3:stack:start`
2. Verify runtime health:
   - `GET http://127.0.0.1:4000/api/health/live`
   - `GET http://127.0.0.1:4100/api/health/live`
   - `GET http://127.0.0.1:4200/api/health/live`
   - or run `npm run doctor:local`
3. Verify SA APIs:
   - `GET /api/contracts/openapi.json`
   - `GET /api/contracts/docs/`
   - `GET /api/employee`
4. Verify Dashboard APIs:
   - `GET /api/dashboard/earnings`
   - `GET /api/dashboard/vacation`
   - `GET /api/dashboard/benefits`
   - `GET /api/dashboard/executive-brief`
   - `GET /api/alerts/triggered`
5. Verify Payroll APIs:
   - `GET /api/payroll/health`
   - `GET /api/payroll/pay-rates`
   - `GET /api/payroll/sync-log`
6. Verify drilldown and export:
   - `GET /api/dashboard/drilldown?minEarnings=100000`
   - `GET /api/dashboard/drilldown/export?...`

---

## 4. Local 500k Data Bootstrap

When rebuilding the large local demo dataset:

1. `node scripts/seed.js --profile enterprise --total 500000 --batch 5000`
2. `node scripts/aggregate-dashboard.js`
3. `node scripts/repair-cross-db-consistency.js`
4. Recheck main counts:
   - Mongo `employees=500000`
   - MySQL `vacation_records=500000`
   - MySQL `employee_benefits=500000`
   - MySQL `pay_rates=500000`
5. Only demo after repair reports `total_deleted_orphan_rows: 0`, or after you rerun aggregate if needed.

Mongo local runtime notes:

- Preferred for large local demo datasets over Atlas free-tier.
- Useful commands:
  - `npm run mongo:local:service:install`
  - `npm run mongo:local:service:status`
  - `npm run mongo:local:autostart:install`
  - `npm run mongo:local:autostart:status`
- Local backend wrappers still exist:
  - `npm run backend:local:start`
  - `npm run backend:local:status`
  - `npm run backend:local:stop`

---

## 5. UI Operational Checks

1. Header freshness badge is valid: `Fresh`, `Stale`, or `Unknown`.
2. Executive brief is not stuck in `Action Required`.
3. Expected memo-ready posture:
   - freshness global = `fresh`
   - action center = `Ready for Memo`
   - `needsAttentionCategories = 0`
4. Error states remain localized for:
   - summary/KPI
   - alerts
   - integration queue
5. Refresh and retry buttons show loading or disabled states while running.
6. Empty states are not confused with system failure.
7. Benefits drilldown stays in benefits context and does not reuse earnings wording.
8. `Alert Follow-up Queue` reflects current `Unassigned` or `Needs Re-review` state correctly.

---

## 6. Alert Configuration Checks

1. Sign in with:
   - `moderator`, `admin`, or `super_admin`
2. Open `Alert Settings`.
3. Save one rule.
4. Confirm alert summaries refresh in the current session.
5. If you disable a rule, confirm the old alert no longer stays visible after refresh.

---

## 7. Integration Queue Checks (Case 4)

Quick checks:

1. `GET /api/integrations/events`
2. If you need one event's full operator history:
   - `GET /api/integrations/events/:id/audit`
3. `GET /api/integrations/events/metrics`
4. If there are `FAILED` or `DEAD` rows:
   - retry one event: `POST /api/integrations/events/retry/:id`
   - retry all dead: `POST /api/integrations/events/retry-dead`
   - replay by filter: `POST /api/integrations/events/replay`
5. If there are stuck `PROCESSING` rows:
   - `POST /api/integrations/events/recover-stuck`
6. Confirm worker activity from startup logs or metrics.
7. If operator input is invalid, expect `422` with `errors[]`, not a silent ignore.
8. After retry/replay/recover, check response metadata such as `meta.actorId` and `meta.filters`.
9. For any demo issue, keep `x-request-id` or `meta.requestId`.
10. To prove an employee mutation traveled through the async path, compare:
   - response `sync.correlationId`
   - Mongo `integration_events.correlation_id`
   - Payroll `sync_log.correlation_id`
11. Before demo, use `GET /api/sync/logs?correlationId=<value>` to verify the trace remains continuous.
12. Before demo, run `npm run db:migrate:mysql:status` and confirm required migrations are present.

---

## 8. Quality Gate Before Demo

Recommended full gate:

```powershell
npm run verify:all
```

Case 3 architecture gate:

```powershell
npm run verify:case3
```

Backend-only gate:

```powershell
npm run verify:backend
```

Expected:

- all required checks pass
- `verify:case3` proves the split runtime and `SA -> Payroll` propagation
- production dependency audit is green with `npm audit --omit=dev`

Optional Case 5 posture snapshot:

```powershell
npm run case5:readiness:safe
```

Expected:

- writes a non-destructive readiness report under `Memory/DR`
- records service health if the split runtime is up
- records MySQL migration readiness and basic security posture flags

---

## 9. Incident Playbook

1. Identify the failing surface:
   - summary
   - drilldown
   - alerts
   - queue
   - payroll evidence
2. For summary mismatch:
   - rerun `node scripts/aggregate-dashboard.js`
3. If you just reseeded the local dataset:
   - always use `seed -> aggregate -> repair`
4. For alert mismatch after config change:
   - refresh the dashboard session
   - then recheck `GET /api/alerts/triggered`
5. If follow-up queue does not match the latest acknowledgement:
   - refresh alerts panel
   - if needed rerun `npm run demo:dashboard:prepare`
6. For integration issues:
   - open queue panel
   - inspect metrics
   - use retry, replay, or recover-stuck
7. For deeper investigation:
   - inspect `integration_events`
   - inspect `/api/integrations/events`
   - inspect `/api/integrations/events/:id/audit`
8. For payroll sync issues:
   - inspect `sync_log.correlation_id`
   - inspect `/api/payroll/sync-log/:employeeId`
9. Always capture:
   - command used
   - response
   - `requestId`
   - `correlationId` if available

---

## 10. Auth Quota Note

1. If sign-in appears to succeed but the FE returns to login immediately, inspect `POST /api/auth/signin`.
2. If you receive `503 AUTH_SESSION_STORAGE_UNAVAILABLE`, Mongo token persistence is the problem.
3. Two valid responses:
   - restore healthy Mongo persistence
   - or enable `ALLOW_STATELESS_JWT_FALLBACK=1` for read-only demo mode and restart
4. For the `500000` record demo, prefer local Mongo on disk instead of Atlas free-tier.
