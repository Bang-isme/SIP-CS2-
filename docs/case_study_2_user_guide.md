# Case Study 2 - User Guide

> Last Updated: 2026-04-15

## Start The Dashboard

Recommended:

```powershell
npm run case3:stack:start
```

If you only need the reporting system after services are already prepared:

```powershell
npm run dashboard:start
```

## Open The System

- Dashboard UI: `http://127.0.0.1:4200/`
- SA sign-in API: `http://127.0.0.1:4000/api/auth/signin`

## Sign In Flow

1. Open Dashboard UI.
2. Use the demo account:
   - email: `admin@localhost`
   - password: `admin_dev`
3. The frontend signs in against `SA / HR Service`.
4. After login, the frontend calls `Dashboard Service` for reporting data.

## Main Pages

### Overview

- executive brief
- quick KPI review
- manage-by-exception summary

### Analytics

- earnings, vacation, benefits charts
- drilldown entry point
- filters by year and department

### Alerts

- triggered alert categories
- alert follow-up queue
- acknowledgement notes and detail modal

### Integration

- queue monitoring and retry/replay/recover controls
- this page still talks to `SA / HR Service`

## Notes For Demo

- Preferred demo state:
  - executive brief is `Ready for Memo`
  - freshness is `fresh`
  - alert follow-up queue has `needsAttentionCategories = 0`
- If the dashboard still says data is stale, explain that Case 2 uses summary tables and freshness is intentionally surfaced.
- If asked why auth is not in Dashboard Service, answer that auth belongs to SA and the dashboard is a reporting system, not a source system.
- If the React bundle is missing on `4200`, run:

```powershell
npm --prefix dashboard run build
```

Then restart `dashboard:start` or `case3:stack:start`.
