# Case Study 4 - Architecture

> Last Updated: 2026-04-15

## Goal

Case Study 4 is about the integration architecture around the source system, not about turning the coursework into a broker-heavy enterprise platform.

The correct description of this repo is:

- modular same-repo architecture
- MongoDB-backed outbox
- worker-based dispatch
- adapter registry
- operator recovery controls

## Core Components

### SA / HR Service

- owns employee mutation
- owns queue APIs
- owns retry/replay/recover controls
- starts the integration worker

### ServiceRegistry

- loads active adapters from configuration
- default demo profile is now `payroll`
- optional adapters such as `securityMock` can still be enabled via env

### SyncService

- broadcasts sync work to active adapters
- preserves correlation context

### PayrollAdapter

- calls the internal Payroll sync API
- preserves correlation context across service boundary
- acts as the visible downstream adapter for demo

### Payroll Service internal sync

- owns the MySQL transaction for `pay_rates`
- owns `SyncLog` writes
- uses `correlationId` as a downstream idempotency key for duplicate delivery
- is protected by an internal service secret rather than end-user JWTs
- exposes read-only downstream APIs using stateless JWT claim verification

### IntegrationEvent worker

- polls the outbox collection
- claims work
- retries failures
- marks exhausted work as `DEAD`

### Operations surface

- shows queue health and recovery controls
- shows SA-to-Payroll parity snapshot
- shows operator audit trail per event directly in the same workspace

## Why This Is "Middleware-Lite"

The architecture is strong enough for coursework because it has:

- a separate integration layer
- retry and replay
- recovery for stuck processing
- operator auditability
- operator-facing audit visibility in the dashboard workspace
- correlation IDs

It is not a full enterprise event backbone because it does not have:

- Kafka or RabbitMQ
- external DLQ infrastructure
- distributed tracing platform
- independent broker cluster operations

## Relationship To The New Runtime Split

The new three-process runtime improves the architecture story:

- SA is clearly the source/integration control plane
- Payroll is clearly a downstream target
- Dashboard is clearly a reporting consumer

That separation makes Case 4 easier to explain because middleware responsibilities now sit visibly in SA instead of being mixed with every other route in one runtime.

Active readiness checks now focus only on Payroll/reporting schema plus `sync_log`, not the retired SQL outbox path.

Current repo verification now also includes a dedicated operator-console smoke path:

- `npm run verify:case4:operations-demo`
- seeded warning queue
- parity snapshot read
- operator retry
- audit trail verification

## Safe Claim For Demo

Say:

- "We implemented a middleware-lite integration layer using an outbox, worker, adapter registry, and operator controls."
- "We can verify the operator console path with a repeatable queue/parity/audit smoke check."

Do not say:

- "We implemented a full enterprise ESB or production-grade event mesh."
