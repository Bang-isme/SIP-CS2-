# Decision: Operational Readiness Surface Unifies Health, Freshness, Parity, and Queue

Date: 2026-04-22
Status: accepted

## Context

By the end of Priorities A-C, the repo had strong operator evidence in pieces:

- queue recovery in Operations
- parity in reconciliation
- freshness semantics in the executive brief
- sync lifecycle evidence in Manage Employees

But the product still lacked one compact place that answered the practical question:

`Is this system currently safe to trust for demo or operator use?`

That gap still forced the operator to mentally combine:

- service health probes
- summary freshness notes
- reconciliation state
- queue state

which made the system look more script-driven than product-driven.

## Decision

Add a backend-owned operational readiness snapshot and render it as a compact Overview surface.

### Backend

- add `src/services/dashboardOperationalReadinessService.js`
- expose `GET /api/dashboard/operational-readiness`
- aggregate four operator checks:
  - runtime service health (`Dashboard`, `SA`, `Payroll`)
  - summary freshness/readiness
  - SA to Payroll parity
  - queue + delivery-path health

### Frontend

- add `dashboard/src/components/OperationalReadinessPanel.jsx`
- mount it in `dashboard/src/pages/OverviewPage.jsx`
- keep the copy compact:
  - one panel
  - four cards
  - one overall readiness badge
  - short actions only where the operator can actually do something

## Why this path

This is the smallest change that turns existing operational signals into a real product behavior.

It avoids fake architecture and stays inside the current three-runtime design, but it materially improves the system's credibility:

- health is no longer only in scripts
- freshness is no longer only in badges
- parity is no longer only in Operations
- queue risk is no longer only in one specialist page

## Consequences

Positive:

- Overview now has a truthful readiness surface
- Case 1-4 are easier to defend as one operational system instead of several separate demos
- operators can refresh readiness explicitly without implying that a summary rebuild happened

Trade-offs:

- the dashboard now owns one more backend aggregation service
- readiness still depends on bounded polling and summary snapshots, not true realtime streaming

## Verification

- `npm run verify:backend`
- `npm --prefix dashboard run verify:frontend`
- `npm run verify:case3`
