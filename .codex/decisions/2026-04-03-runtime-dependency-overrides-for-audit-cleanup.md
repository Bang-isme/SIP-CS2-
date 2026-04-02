# Decision: Runtime Dependency Overrides for Audit Cleanup

Date: 2026-04-03
Status: accepted

## Context

After adding local Swagger UI and rerunning backend verification, `npm audit --omit=dev` still reported two runtime advisories:

- `express -> path-to-regexp@0.1.12`
- `sequelize -> lodash@4.17.23`

These were not direct business-logic bugs in the app, but they weakened the claim that the backend was in a clean, reliable state for coursework demo and review.

## Decision

Use npm `overrides` in `package.json` to lock the transitive tree to safe patch-compatible versions:

- `path-to-regexp@0.1.13`
- `lodash@4.18.1`

Then regenerate `package-lock.json` and rerun audit plus backend gate.

## Why

- The issue sits in transitive dependencies, not in our top-level API design.
- Patch-level overrides are a lower-risk move than replacing major framework dependencies late in the cycle.
- This keeps the runtime dependency story aligned with the contract/security hardening already done elsewhere in the backend.

## Consequences

Positive:
- `npm audit --omit=dev` now passes with `0 vulnerabilities`.
- No controller/service code changes were required.

Trade-off:
- The repo now relies on explicit override policy in `package.json`, so future dependency refreshes should preserve or revisit that intent deliberately.

## Evidence

- `package.json`
- `package-lock.json`
- `npm audit --omit=dev`
- `npm test`
- `npm run test:advanced`
