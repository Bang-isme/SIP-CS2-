# Decision: dashboard-backend-contract-hardening
Date: 2026-04-02
Status: accepted

## Context
After stabilizing dashboard UX, the next priority was making backend endpoints the authoritative contract for FE. The main gaps were inconsistent response shapes, permissive query parsing, unsafe search handling, and year drift between drilldown filters and summary totals.

## Decision
Introduce a shared dashboard contract utility that validates dashboard and alert inputs at the controller boundary, standardizes metadata envelopes, and keeps backward-compatible legacy fields only where the frontend still depends on them.

## Alternatives Considered
Alternative 1: leave validation scattered inside each controller and keep mixed response shapes. Alternative 2: do a breaking API cleanup that removes legacy top-level fields immediately. Alternative 3: push normalization into the frontend and keep backend permissive.

## Reasoning
The dashboard is the coursework's main deliverable, so backend behavior must be predictable enough for the frontend to follow. A shared utility gives one place to define year/context/pagination/search rules and response metadata, while backward-compatible legacy fields avoid breaking the current UI during the transition. This also fixed a real correctness issue where drilldown summary aggregation could use the wrong year.

## Consequences
- Dashboard and alerts controllers now share one normalization layer for year, context, pagination, boolean filters, and search.
- Invalid filters fail fast with `422` plus structured `errors[]`, which gives FE a clearer contract and avoids silent coercion.
- `GET /api/alerts/:type/employees` now exposes a canonical `{ success, data, meta }` shape while preserving legacy top-level fields until FE fully migrates.
- Drilldown aggregate summaries respect the requested `year`, removing a mismatch between filtered rows and summary totals.
