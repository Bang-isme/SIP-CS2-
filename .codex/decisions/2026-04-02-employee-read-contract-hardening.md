# Decision: align employee read APIs with their route intent while preserving legacy callers
Date: 2026-04-02
Status: accepted

## Context
The employee write path was already hardened, but the read surface still had a contract mismatch: `GET /api/employee/:employeeId` was implemented with `findById`, so the route name implied business employee IDs while the code actually expected Mongo document IDs. That inconsistency was a backend correctness problem and made FE or operator consumers guess which identifier the API really wanted.

## Decision
Make `GET /api/employee/:employeeId` resolve by business `employeeId` first, then fall back to Mongo `_id` only for legacy compatibility, and standardize employee list/detail responses with explicit metadata and validation.

## Alternatives Considered
Keep the old Mongo-id-only behavior and merely document it; break compatibility by forcing a new route name immediately; or leave the employee APIs as a legacy exception while hardening only sync/integration surfaces.

## Reasoning
The route name already promised business-identifier semantics, so the safest fix was to make the implementation match that promise without breaking existing callers that still pass Mongo IDs. Adding canonical metadata at the same time keeps employee APIs from remaining the one obvious backend contract outlier.

## Consequences
- `GET /api/employee/:employeeId` now matches its route intent for FE and operator consumers.
- Legacy Mongo-id lookups still work as a fallback, reducing migration risk.
- Employee list/detail endpoints now return more consistent metadata alongside their payloads.
- Regression coverage now locks the route semantics so the old mismatch does not quietly return.
