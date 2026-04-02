# Decision: dashboard executive brief backend snapshot
Date: 2026-04-02
Status: accepted

## Context
Case Study 2 dashboard is the strongest deliverable and is used as CEO Memo evidence. The frontend already had an Executive Action Center and Alert Follow-up Queue, but both were computing operational priority locally. The project direction for this phase is FE-follow-BE, so backend needs to own the executive snapshot contract.

## Decision
Centralize executive action-center and alert follow-up state behind GET /api/dashboard/executive-brief, with FE consuming the backend snapshot instead of recomputing priority from multiple endpoints.

## Alternatives Considered
Keep Executive Action Center and Alert Follow-up Queue fully derived in Dashboard.jsx from summary, alerts, and integration endpoints; or add separate smaller endpoints for follow-up and queue health without a unified executive snapshot.

## Reasoning
A unified executive snapshot gives the dashboard one authoritative backend contract for freshness, follow-up priority, and queue risk. That reduces FE drift, keeps alert acknowledgement semantics consistent across views, and lets contract tests lock down the decision-support layer independently of chart/drilldown endpoints.

## Consequences
- `src/services/dashboardExecutiveService.js` now owns executive-level synthesis for freshness, alert follow-up priority, and integration risk.
- `src/utils/alertDashboard.js` is the shared logic boundary for alert acknowledgement/follow-up semantics so `alerts/triggered` and `dashboard/executive-brief` do not diverge.
- `GET /api/dashboard/executive-brief` becomes the preferred contract for `Executive Action Center` and `Alert Follow-up Queue`, while chart/drilldown endpoints stay separate for domain detail.
- `dashboard/src/pages/Dashboard.jsx` now prefers the backend snapshot and refreshes it after alert acknowledgement or alert-settings changes to keep FE aligned with backend truth.
