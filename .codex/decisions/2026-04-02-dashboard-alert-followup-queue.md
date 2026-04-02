# Decision: dashboard-alert-followup-queue
Date: 2026-04-02
Status: accepted

## Context
After adding alert acknowledgement, the next gap in Case Study 2 was that ownership state was still buried inside alert cards/modals. The dashboard needed a clearer operations cue showing which alerts still need assignment or re-review before presenting the memo snapshot.

## Decision
Add a dashboard-level follow-up queue that prioritizes unassigned and stale alert categories and quick-opens the matching alert modal instead of adding a separate task system.

## Alternatives Considered
Alternative 1: keep acknowledgement visible only inside the alert modal. Alternative 2: build a separate workflow/task board with its own API and persistence. Alternative 3: surface only aggregate ownership counts in the action center with no direct navigation.

## Reasoning
The project already stores category-level acknowledgement metadata, so a derived follow-up queue gives much better manage-by-exception visibility without widening the backend scope. Quick-open navigation keeps the operator flow inside the existing alert modal and is easier to defend in coursework than introducing a second workflow model.

## Consequences
- Dashboard now shows a dedicated operations cue for alert ownership without any new backend endpoint.
- `AlertsPanel` accepts a dashboard-originated quick-open request, so follow-up items jump directly into the existing modal flow.
- The scope remains intentionally lightweight: this is a prioritization layer over alert categories, not a full multi-step task/SLA system.
