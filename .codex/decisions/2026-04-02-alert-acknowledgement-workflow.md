# Decision: alert-acknowledgement-workflow
Date: 2026-04-02
Status: accepted

## Context
Case Study 2 dashboard improvement after adding action center and drilldown presets. Needed a lightweight but stateful action workflow so alerts can move from observation to explicit ownership without changing the broader data model.

## Decision
Implement alert acknowledgement as a manager-only workflow on active alert categories, storing owner, note, timestamp, and snapshot metadata on the Alert config document.

## Alternatives Considered
Alternative 1: track acknowledgement per employee row in SQL. Alternative 2: rely on external task tools without storing any acknowledgement inside the dashboard. Alternative 3: make acknowledgements view-only with no stale review state.

## Reasoning
The current dashboard aggregates alerts by category, so category-level ownership aligns with the existing manage-by-exception model and avoids introducing a new task table or cross-store workflow. Persisting summary count and computed_at lets the UI mark acknowledgements stale when the alert snapshot changes, which is defensible for coursework and materially improves operational evidence in demos.

## Consequences
(to be filled after implementation)
