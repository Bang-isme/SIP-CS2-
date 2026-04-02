# Decision: integration operator contract hardening
Date: 2026-04-02
Status: accepted

## Context
Case Study 4 already had DB-backed outbox, worker, and monitor UI, but the operator endpoints still normalized input loosely and returned ad-hoc responses. The current phase focuses on backend as the authoritative contract that frontend and demo scripts should follow.

## Decision
Treat integration monitor endpoints as first-class operator APIs with explicit validation, canonical metadata, and service-layer mutation handling instead of permissive controller-local parsing.

## Alternatives Considered
Keep current controller-local parsing with silent fallback for invalid filters; or only patch the frontend integration panel without changing backend contracts.

## Reasoning
Integration retry/replay/recover endpoints affect system state and demo evidence, so they need the same contract rigor as dashboard and alerts. Explicit validation prevents accidental broad replays, metadata improves operator traceability, and moving mutation logic into a service keeps controller behavior testable and stable.

## Consequences
- `src/utils/integrationContracts.js` is now the trust-boundary layer for integration list/replay/id validation and `422 + errors[]` responses.
- `src/services/integrationOperatorService.js` owns requeue/replay mutations so controllers remain thin and testable.
- `src/controllers/integration.controller.js` now returns operator metadata (`dataset`, `actorId`, `filters`, pagination metadata) that FE/admin flows can use as evidence after retry/replay/recover actions.
- Integration admin paths now have dedicated controller and route authz regression coverage to prevent silent contract drift.
