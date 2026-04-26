# Decision: 2026-04-22-overview-readiness-refresh-semantic-tightening
Date: 2026-04-22
Status: accepted

## Context
During live runtime audit after Priorities A-D, Overview showed a small but real operational UX gap: the Operational Readiness panel exposed a button labeled Refresh readiness, but the page handler called loadAllData and refreshed unrelated sections too. The same audit also surfaced mojibake in the readiness loading copy, so the refinement pass fixed both the action semantics and the UI string.

## Decision
Keep the Overview readiness refresh action scoped to readiness only, instead of reloading the full overview payload.

## Alternatives Considered
Reuse the existing full Overview refresh for simplicity; add a new backend endpoint; leave the current behavior unchanged.

## Reasoning
The UI label promises a readiness refresh, so triggering a full overview reload weakens operator trust and makes the product feel less honest. The existing frontend hook already exposes a dedicated readiness fetch, so tightening the action preserves the current architecture while making the control semantically correct and cheaper to run.

## Consequences
(to be filled after implementation)
