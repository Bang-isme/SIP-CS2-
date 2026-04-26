# Decision: 2026-04-22-demo-evidence-pack-builder-adds-repeatable-and-resumable-proof
Date: 2026-04-22
Status: accepted

## Context
After strengthening Case 2-4 with readiness, reconciliation, lifecycle evidence, and operator audit trail, the remaining gap was proof collection. The repo had good gates, but evidence was still scattered across terminal output, ad hoc screenshots, and separate demo scripts. A real demo-ready system needs a repeatable bundle that captures those proofs in one place.

The first implementation attempt also exposed two runtime realities:

- on this Windows environment, `spawn('npm.cmd', ...)` can fail with `EINVAL`
- a long-running proof build can be interrupted after expensive verification steps, so restarting from zero is wasteful

## Decision
Add a one-command demo evidence pack builder with resume-safe controls.

## Alternatives Considered
Keep collecting logs manually; rely only on `verify:case3`; create a docs-only checklist without artifacts; build a browser-only capture workflow first.

## Reasoning
The highest-ROI improvement was not more UI polish. It was making proof reproducible. A dated evidence pack gives the team a concrete artifact for demo/viva defense, while resume controls prevent wasted time after an interrupted long-running build. The Windows-safe spawn path is necessary so the builder is actually usable on the local runtime that the team demos from.

## Consequences
- `npm run demo:evidence:build` now generates a dated proof pack under `docs/demo/evidence/<date-stamp>/`
- the pack includes:
  - backend verification log
  - frontend verification log
  - Case 3 stack verification log
  - Case 4 operations smoke log
  - dashboard demo preparation report
  - summary JSON and README
  - optional screenshots when browser capture prerequisites are available
- the builder now:
  - uses `cmd.exe /d /s /c npm ...` on Windows instead of spawning `npm.cmd` directly
  - supports resume-oriented flags for reusing existing verification logs and an already-running stack
  - can soft-skip screenshot capture without invalidating the rest of the proof pack
- a live smoke bundle was created at:
  - `docs/demo/evidence/2026-04-22-smoke/README.md`
