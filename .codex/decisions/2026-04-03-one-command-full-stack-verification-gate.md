# Decision: One-command full-stack verification gate

- Date: 2026-04-03
- Scope: repo-level verification workflow

## Context

Backend already had a useful one-command gate via `npm run verify:backend`, but final demo/submission still required remembering separate dashboard commands for lint, tests, build, and dependency audit.

## Decision

- Add `dashboard` script `verify:frontend`
- Add root scripts:
  - `verify:frontend`
  - `verify:all`

## Rationale

- This keeps the final verification workflow short and repeatable.
- It avoids inventing a new orchestrator or CI abstraction.
- It is a practical submission/demo improvement, not an architectural expansion.

## Consequences

- One command can now validate the full project locally before demo or submission.
- Backend and frontend can still be verified separately when debugging.
