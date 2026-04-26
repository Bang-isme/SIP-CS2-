# Decision: dashboard-freshness-readiness-and-manual-summary-rebuild
Date: 2026-04-22
Status: accepted

## Context
Priority A added reconciliation visibility, but dashboard freshness still had an operational gap: the UI could say `stale` without explaining whether the problem was missing summary coverage, delayed aggregation, or a simple FE refetch. The previous `Refresh` action also risked misleading operators because it only reloaded API responses and did not rebuild the underlying pre-aggregated summaries.

## Decision
Treat dashboard freshness as an operator workflow, not just a badge.

- Backend executive brief now returns structured `freshness.readiness` metadata.
- Freshness states distinguish:
  - `current`
  - `refresh_lag`
  - `coverage_gap`
- Admins get a real manual control path: `POST /api/dashboard/refresh-summaries`.
- Non-admins still see the same readiness semantics, but the UI does not pretend they can rebuild summaries when they cannot.
- FE uses readiness metadata to:
  - show a compact freshness note in the header
  - explain `Data` status in the executive brief
  - switch the global refresh action to `Rebuild summaries` for admins when summaries are stale or incomplete

## Alternatives Considered
- Keep only `Fresh/Stale/Unknown` badges and rely on tooltip text
- Add more explanatory copy without adding a true rebuild control
- Trigger aggregation automatically on every refresh click for every user

## Reasoning
This keeps the repo close to a real operating surface:

- status is concise
- action is truthful
- rebuild remains privileged
- summary freshness is no longer conflated with FE refetch

It also avoids architectural overreach. The system still uses pre-aggregated tables and a background worker, but operators now have a bounded, explicit recovery path when freshness debt appears.

## Consequences
- Dashboard can now be defended more credibly as a controlled, pre-aggregated executive workspace rather than a fake realtime surface.
- `Refresh` and `Rebuild summaries` are distinct behaviors.
- Freshness semantics are reusable for later work on lifecycle evidence and readiness semantics.

## Verification
- `npm run verify:backend`
- `npm --prefix dashboard run verify:frontend`
- `npm run verify:case3`
