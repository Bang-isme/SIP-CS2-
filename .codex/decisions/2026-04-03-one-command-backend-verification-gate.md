# Decision: One-command backend verification gate

- Date: 2026-04-03
- Scope: local backend operations

## Context

Backend readiness was already spread across several commands:

- `npm run doctor:local`
- `npm run lint`
- `npm test`
- `npm run test:advanced`
- `npm run db:migrate:mysql:status`
- `npm audit --omit=dev`

That was thorough, but still easy to forget during demo preparation or final pre-submit checks.

## Decision

- Add a single command: `npm run verify:backend`
- Make it execute the existing gates in sequence without introducing a new orchestration framework

## Rationale

- This reduces operator error during demo/viva.
- It keeps the workflow clear without adding new scripts or abstractions.
- It matches the current repo maturity better than building a custom verification runner.

## Consequences

- Backend verification is now easier to communicate and repeat.
- The existing individual commands remain available for targeted debugging.
