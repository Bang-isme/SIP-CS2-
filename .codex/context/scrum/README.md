# CEO Memo Scrum Project Layer

Last Updated: 2026-04-16

This folder is the canonical project-specific context layer for the installed Scrum agent kit in `SIP_CS`.

## Load Order

Every future agent working on this repo should load context in this order:

1. [Project genome](</D:/SIP_CS 2/SIP_CS/.codex/context/genome.md>)
2. [Project context](</D:/SIP_CS 2/SIP_CS/.codex/context/scrum/PROJECT_CONTEXT.md>)
3. Relevant role brief from [`.agent/agents/`](</D:/SIP_CS 2/SIP_CS/.agent/agents>)
4. [Working agreement](</D:/SIP_CS 2/SIP_CS/.codex/context/scrum/WORKING_AGREEMENT.md>)
5. [Next iteration backlog](</D:/SIP_CS 2/SIP_CS/.codex/context/scrum/NEXT_ITERATION_BACKLOG.md>)

## Installed Native Agents

- `scrum-orchestrator`
- `scrum-product-owner`
- `scrum-master`
- `scrum-solution-architect`
- `scrum-frontend-developer`
- `scrum-backend-developer`
- `scrum-qa-engineer`
- `scrum-security-engineer`
- `scrum-devops-engineer`
- `scrum-ux-researcher`

## Default Team Shape

1. `scrum-orchestrator` owns end-to-end flow, sequencing, and role handoffs.
2. `product-owner` owns coursework value, acceptance criteria, and anti-overclaiming discipline.
3. `scrum-master` owns flow, blockers, rehearsal cadence, and release readiness.
4. `solution-architect` owns runtime truth, service seams, and tradeoffs.
5. `frontend-developer` plus `ux-researcher` own Dashboard, Payroll console, service landing clarity, and demo readability.
6. `backend-developer` plus `security-engineer` own auth, contracts, sync flow, and data integrity.
7. `qa-engineer` plus `devops-engineer` own verification, evidence capture, environment predictability, and rollback posture.

## Current Reality

This project is no longer in "design the architecture from scratch" mode.

It is already in a defensible three-service shape and must now be treated as:

- a repo that needs disciplined finishing
- a live demo that must be repeatable
- a source tree that the instructor may open and question directly

Do not start from generic assumptions or the historical monolith narrative. Judge everything against the current `SA / Payroll / Dashboard` runtime.
