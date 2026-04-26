# Decision: case1-4-operational-uplift-priority
Date: 2026-04-21
Status: accepted

## Context
The repo already scores strongly for coursework, especially in Case 2 and Case 3, but the goal has shifted from "safe enough to defend" toward "best possible within the current architecture." The risk is over-scoping into fake enterprise complexity instead of improving the loops that make a system feel real in operation.

## Decision
Prioritize operational uplift over architectural theater. The next iteration should focus on four closed loops, in this order:

1. reconciliation visibility between `SA` and `Payroll`
2. dashboard freshness semantics and refresh path clarity
3. end-to-end sync lifecycle evidence in admin workflows
4. consolidated in-app readiness semantics

Do not prioritize broker-grade middleware, extra service splits, or infrastructure mimicry unless those directly improve one of the loops above.

## Alternatives Considered
- Freeze at current coursework-safe level and only polish UI/docs
- Over-scope into Kafka/RabbitMQ or broader microservice decomposition
- Keep investing mainly in dashboard visual polish without tightening operational semantics

## Reasoning
The current repo already has outbox, worker, retry/replay/recover, verification scripts, and three separate runtimes. The highest remaining credibility gap is not missing pages but missing operator-visible loops for freshness, parity, and recovery. Strengthening those loops increases trust and viva defensibility without destroying local reproducibility.

## Consequences
- Future improvements should be judged by whether they improve operational trust, not whether they make the architecture diagram look more advanced.
- Dashboard work should now bias toward provenance, freshness, and reconciliation semantics.
- Case 4 should continue to be defended as middleware-lite unless the repo materially adds broker-backed integration and new proof paths.

## Implementation Update
- Priority A is now implemented as a real operator-visible reconciliation loop.
- Added:
  - `src/services/integrationReconciliationService.js`
  - `GET /api/integrations/events/reconciliation`
  - reconciliation UI inside `dashboard/src/components/IntegrationEventsPanel.jsx`
- The current reconciliation contract compares:
  - Mongo `Employee.employeeId` / `payRate`
  - against active MySQL `pay_rates.employee_id` / `pay_rate`
- The current loop reports:
  - source employee count
  - downstream covered employee count
  - missing-in-payroll count
  - extra-in-payroll count
  - duplicate active payroll rows
  - pay-rate mismatch count
  - bounded sample entities for operator follow-up
- Manual refresh explicitly bypasses the cache via `fresh=true`; background refresh keeps the cached snapshot to avoid expensive parity reads on every queue poll tick.
