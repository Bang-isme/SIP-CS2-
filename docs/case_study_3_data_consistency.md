# Case Study 3 - Data Consistency

> Last Updated: 2026-04-15

## Positioning

Case Study 3 is now defended as `SA -> Payroll` integration between two separately running systems:

- `SA / HR Service` on `4000`
- `Payroll Service` on `4100`

This is no longer just one backend process with two databases.

## Source And Target

### Source system

- SA / HR Service
- MongoDB is the source-of-truth for employee records

### Target system

- Payroll Service
- MySQL stores `pay_rates` and `sync_log`
- Payroll exposes its own API and its own console UI
- Payroll now boots without MongoDB; runtime dependency is MySQL only

## Consistency Model

The repo implements `controlled eventual consistency`.

It does not implement:

- two-phase commit
- strong consistency across MongoDB and MySQL
- distributed transactions

This is the correct claim to make in demo.

## Runtime Flow

1. User creates, updates, or deletes an employee in SA.
2. SA saves the source record in MongoDB.
3. SA enqueues an `IntegrationEvent` into MongoDB outbox storage owned by SA.
4. The integration worker picks up the event.
5. `SyncService` calls the active adapter list.
6. Payroll adapter calls the Payroll internal API instead of writing payroll tables directly.
7. Payroll Service applies the MySQL transaction, records `SyncLog`, and exposes the result through its own API/UI.
8. Payroll now treats `correlationId` as a downstream idempotency key, so duplicate delivery of the same event does not append duplicate payroll history.
9. Read-only Payroll APIs validate SA-issued JWT claims statelessly, without querying MongoDB.
10. SA now boots without MySQL because queue state and operator audit history are no longer stored in Payroll-side tables.

## API Evidence

### SA-owned mutation feedback

Employee mutation responses include:

- `status`
- `mode`
- `consistency`
- `requiresAttention`
- `message`
- `correlationId`

Typical demo result:

- `status=QUEUED`
- `mode=OUTBOX`
- `consistency=EVENTUAL`

### Payroll-owned read evidence

Payroll Service exposes:

- `GET /api/payroll/pay-rates`
- `GET /api/payroll/pay-rates/:employeeId`
- `GET /api/payroll/sync-log`
- `GET /api/payroll/sync-log/:employeeId`

This is the strongest evidence that a downstream system exists separately.

## Failure Handling

### If outbox enqueue fails

- SA still keeps the source write
- controller falls back to direct sync when possible
- response clearly marks risk state

### If worker processing gets stuck

- stale processing recovery is available
- admins can run `recover-stuck`

### If downstream write fails

- queue can move to `FAILED` or `DEAD`
- retry and replay paths exist

### If the same event is delivered twice

- Payroll checks `correlationId` before mutating `pay_rates`
- duplicate `SUCCESS` or in-flight `PENDING` delivery is short-circuited
- a retried `FAILED` delivery reuses the same `sync_log` identity instead of appending drift

## What Changed In This Refactor

Before:

- one runtime
- easy to criticize as monolith with two databases

After:

- separate SA process
- separate Payroll process
- payroll console on its own port
- payroll writes owned by Payroll Service via internal API
- service-specific health endpoints
- verification script that exercises create -> update -> delete across systems

## Verification Result

The repo now includes:

```powershell
npm run verify:case3
```

This script:

1. starts SA, Payroll, and Dashboard
2. signs in through SA
3. creates an employee in SA
4. polls Payroll until the new pay-rate record exists
5. updates the employee and confirms Payroll history changes
6. deletes the employee and confirms terminated payroll evidence

Verified locally on `2026-04-14`.

## Safe Claim For Viva

Say:

- "Our system uses eventual consistency with explicit sync state, outbox dispatch, retry/recovery, and a visible downstream Payroll service."

Do not say:

- "We implemented ACID across MongoDB and MySQL."
