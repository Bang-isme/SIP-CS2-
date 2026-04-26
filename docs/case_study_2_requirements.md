# Case Study 2 - Requirements

> Last Updated: 2026-04-14

## Functional Requirements

The Dashboard Service must provide:

1. an executive overview that summarizes current business state
2. breakdowns for earnings, vacation, and benefits
3. drilldown and CSV export for follow-up questions
4. alert review for manage-by-exception workflows
5. role-aware access to admin-only actions

## Integration Requirements

The dashboard frontend must:

- authenticate through `SA / HR Service`
- reuse the same JWT when calling `Dashboard Service`
- keep integration queue actions pointed at `SA / HR Service`

The reporting backend must:

- expose its own health endpoint
- be startable without starting the SA HTTP server in the same process
- present itself as a separate system during demo

## Non-Functional Requirements

- summary endpoints should stay fast by reading pre-aggregated tables
- drilldown should remain usable for follow-up questions
- stale data must be made visible instead of silently hidden
- API ownership should be obvious enough that route-by-route questioning is easy to answer

## Demo-Defense Requirements

The instructor should be able to see that:

- Dashboard is not the same runtime as SA
- Dashboard does not own auth
- Dashboard does own reporting and alert APIs
- the frontend intentionally talks to more than one backend service

## Evidence To Show

- `http://127.0.0.1:4200/api`
- `http://127.0.0.1:4200/api/health`
- a successful login via SA
- an executive brief load via Dashboard Service
- alert review page and drilldown flow
