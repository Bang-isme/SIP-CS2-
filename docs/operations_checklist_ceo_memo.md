# Operations Checklist - CEO Memo Alignment

> Last Updated: 2026-02-16
> Demo quick reference: `docs/demo_pass_checklist.md`

## 1) Objective

Checklist nay dung de van hanh dashboard on dinh theo CEO flow:
- Summary ro rang
- Alerts theo exception
- Drilldown chinh xac
- Integration recovery co the thao tac

## 2) Daily Runbook

1. Run aggregate batch:
   - `node scripts/aggregate-dashboard.js`
2. Verify service health:
   - `GET /api/health/live`
   - `GET /api/health`
3. Verify summary APIs:
   - `GET /api/dashboard/earnings`
   - `GET /api/dashboard/vacation`
   - `GET /api/dashboard/benefits`
4. Verify alerts API:
   - `GET /api/alerts/triggered`
5. Verify drilldown and export:
   - `GET /api/dashboard/drilldown?minEarnings=100000`
   - `GET /api/dashboard/drilldown/export?...`

## 3) UI Operational Checks

1. Header freshness badge shows one of: `Fresh`, `Stale`, `Unknown`.
2. Localized error states exist for:
   - KPI/Summary cards
   - Alerts panel
   - Integration queue panel
3. Refresh and retry buttons show disabled/loading behavior when in-flight.
4. Empty-state does not look like system-error state.

## 4) Integration Queue (Case 4)

Quick checks:
1. `GET /api/integrations/events` (admin)
2. If `FAILED/DEAD` exists:
   - retry one event: `POST /api/integrations/events/retry/:id`
   - retry all dead: `POST /api/integrations/events/retry-dead`
   - replay filtered: `POST /api/integrations/events/replay`
3. Confirm worker is running from startup logs.

## 5) Quality Gate Before Demo

- Backend: `npm test`
- Frontend lint: `cd dashboard && npm run lint`
- Frontend build: `cd dashboard && npm run build`

Expected:
- tests/lint/build all pass
- build has no >500 kB chunk warning

## 6) Incident Playbook (Dashboard mismatch)

1. Scope issue: summary only, drilldown only, or both.
2. Re-run `aggregate-dashboard.js`.
3. Re-check health and dashboard APIs.
4. If integration issue: inspect queue panel and retry path.
5. Record what failed and what command fixed it.
