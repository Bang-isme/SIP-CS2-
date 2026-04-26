# Decision: 2026-04-22-admin-mutation-refreshes-readiness-surface
Date: 2026-04-22
Status: accepted

## Context
During the post-Priority-D live audit, the Manage Employees page still refreshed only executive/alert/summary slices after create-update-delete actions. That meant the source-write workflow could finish while Overview readiness and operations semantics lagged behind. The refinement updates the page-level mutation completion handler so the broader dashboard context stays aligned with the source-write path.

## Decision
After employee source mutations, prefer a dashboard-context refresh that includes operational readiness semantics instead of refreshing only a subset of summary widgets.

## Alternatives Considered
Keep the existing targeted refreshes for executive snapshot, alerts, and summaries only; rebuild summaries after every employee mutation; leave post-mutation dashboard state partially stale until the user manually revisits Overview or Operations.

## Reasoning
Employee mutation is the main source-write workflow in the product, so leaving readiness, parity, and queue semantics stale right after a mutation weakens the claim that the UI behaves like a real operating system. Reusing the existing dashboard load path with forceOperationalReadiness closes that loop without adding new architecture or fake realtime claims.

## Consequences
(to be filled after implementation)
