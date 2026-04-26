# Case Study 2 - Design

> Last Updated: 2026-04-14

## Goal

Case Study 2 is the executive reporting layer for the CEO memo. The design target is not to replace operational systems, but to present integrated information in a form that helps management decide quickly.

## Design Position

The Dashboard remains a `presentation-style integration` solution, but it is now exposed as its own `Dashboard Service` instead of living inside the same runtime as SA.

That means:

- auth and employee maintenance stay in `SA / HR Service`
- executive reporting and alert review stay in `Dashboard Service`
- the React dashboard frontend signs in through SA, then reads summaries from Dashboard Service

## Runtime Shape

- `SA / HR Service` on `4000`
- `Dashboard Service` on `4200`

Frontend routing:

- login, current-user, admin users, employee CRUD, integration queue -> `SA`
- executive brief, summaries, drilldown, alerts -> `Dashboard`

## Data Design

### MongoDB

- `Employee`
- `Department`
- `Alert`
- `User`
- `Role`
- `IntegrationEvent`
- `IntegrationEventAudit`

### MySQL

Operational/support tables:

- `pay_rates`
- `sync_log`

Dashboard summary tables:

- `earnings_summary`
- `vacation_summary`
- `benefits_summary`
- `alerts_summary`
- `alert_employees`
- `earnings_employee_year`

## API Ownership

### Dashboard Service owns

- `GET /api/dashboard/executive-brief`
- `GET /api/dashboard/earnings`
- `GET /api/dashboard/vacation`
- `GET /api/dashboard/benefits`
- `GET /api/dashboard/drilldown`
- `GET /api/dashboard/drilldown/export`
- `GET /api/dashboard/departments`
- `GET /api/alerts/triggered`
- `GET /api/alerts/:type/employees`
- alert configuration CRUD

### SA Service still owns

- `POST /api/auth/signin`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/employee`
- integration operator APIs

## Design Rationale

This split matches the coursework better:

- the dashboard is clearly a reporting system, not just another route group
- case 2 stays independent from case 3 source-system behavior
- the instructor can see a separate reporting process on its own port

## Freshness Model

The dashboard still reads pre-aggregated summary tables. That tradeoff is intentional:

- summaries return quickly
- drilldown can still provide detail
- the team can explain freshness explicitly instead of pretending everything is real-time

Current caveat:

- if aggregation is not refreshed, the executive brief can become stale
- this is surfaced in API metadata and in the UI

Demo/runtime mitigation now in place:

- `case3:stack:start` warms stale or missing summary tables before opening the dashboard port
- the demo prep step also refreshes current alert ownership notes so the executive brief is not left in `Action Required` only because of old acknowledgement data
- this keeps the dashboard evidence aligned with the latest snapshot while preserving the real manage-by-exception model

## UI Design Consequences

The frontend was rewired without changing its visual design direction:

- login remains the entry gate
- overview/analytics/alerts/integration pages remain intact
- API calls are now routed by service ownership

This preserves prior Case 2 work while making the system boundary cleaner for defense.
