# Decision: Employee Sync Lifecycle Evidence In Admin Workflow

Date: 2026-04-22

## Context

Case 3 and Case 4 already had strong backend mutation provenance:

- source write in MongoDB
- outbox event in SA
- worker delivery to Payroll
- correlation-aware sync logs in MySQL

But the operator-facing `Manage Employees` workflow still surfaced only the immediate mutation acknowledgement.

That left a real operational gap:

- accepted write
- queued event
- delivered payroll mutation
- payroll drift or missing evidence

all still had to be inferred manually.

## Decision

Add a canonical sync evidence snapshot by `employeeId` and surface it directly inside `Manage Employees`.

### Backend contract

- add `src/services/employeeSyncEvidenceService.js`
- expose `GET /api/employee/:employeeId/sync-evidence`
- guard the route as `super-admin` because it includes downstream payroll evidence

### Snapshot shape

The snapshot must answer four operator questions:

1. Did the source write land?
2. Was a queue event recorded?
3. Did Payroll receive and apply it?
4. If not, where is the drift or blockage?

The response therefore normalizes four sections:

- `overall`
- `source`
- `queue`
- `payroll`

It derives these from:

- Mongo `Employee`
- Mongo `integration_events`
- MySQL `pay_rates`
- MySQL `sync_log`

### Frontend contract

- keep the immediate `syncFeedback` acknowledgement
- add a separate `Delivery evidence` block
- show three lifecycle stages:
  - `Source`
  - `Queue`
  - `Payroll`
- allow manual refresh
- auto-poll while queue state is still pending/processing

## Why this path

This keeps the current architecture intact while making it feel far more like a real operating system.

It avoids fake complexity such as adding more services or pseudo-realtime infrastructure, but still closes the operator loop where it matters most: right after a source mutation.

## Consequences

Positive:

- stronger Case 3 and Case 4 defense
- operators can explain delivery state without DB inspection
- payroll drift becomes visible at the point of change

Trade-offs:

- the employee evidence endpoint is an SA-owned cross-store view, so it slightly increases controller/service surface area
- delete lifecycle is still primarily acknowledged via immediate sync feedback in the UI because the record no longer stays editable after removal

## Verification

- `npm run verify:backend`
- `npm --prefix dashboard run verify:frontend`
- `npm run verify:case3`
