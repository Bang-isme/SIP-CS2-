# Next Iteration Backlog

Last Updated: 2026-04-17

Priority is ordered for demo confidence, not feature novelty.

## P1

### Story: Final Demo Evidence Pack

Status:
- Done on `2026-04-16`

Owner:
- `qa-engineer` + `product-owner`

Goal:
- produce one folder of screenshots, terminal outputs, and proof artifacts that match the live runtime

Acceptance criteria:
- captures SA, Payroll, and Dashboard on separate ports
- captures `verify:backend`, `verify:frontend`, and `verify:case3` passing
- captures Dashboard `Ready for Memo`
- captures Payroll lookup evidence after SA create or update

## P2

### Story: One-Page Demo Runbook

Status:
- Done on `2026-04-16`

Owner:
- `scrum-master` + `qa-engineer`

Goal:
- reduce live demo variance to a short, deterministic operator flow

Acceptance criteria:
- startup commands are explicit
- recovery steps exist for the most likely local issues
- the runbook fits on one page
- sequence aligns with actual UI labels and URLs

## P3

### Story: One-Page Viva Defense Sheet

Status:
- Done on `2026-04-16`

Owner:
- `product-owner` + `solution-architect`

Goal:
- prepare short, technically correct answers for likely instructor challenges

Acceptance criteria:
- covers monolith-vs-integration challenge
- covers eventual consistency explanation
- covers Payroll write ownership
- covers why the architecture is reasonable for the academic scope

## P4

### Story: Low-Risk Demo UI Polish

Status:
- Done on `2026-04-16`

Owner:
- `frontend-developer` + `ux-researcher`

Goal:
- improve trust and readability without changing core runtime behavior

Acceptance criteria:
- only cosmetic or copy changes
- no auth/session regression
- no route ownership changes
- no new dependencies unless justified

## P5

### Story: Critical Regression Hardening

Status:
- Done on `2026-04-16`

Owner:
- `backend-developer` + `qa-engineer`

Goal:
- add tests around the most sensitive flows that recently changed

Acceptance criteria:
- session revoke edge cases are covered
- key demo path behavior is still exercised after future edits
- newly added tests fail on the old broken behavior

## P6

### Story: Demo Operator Contract Consolidation

Status:
- Done on `2026-04-16`

Owner:
- `scrum-master` + `product-owner`

Goal:
- make the human-facing demo contract say exactly one thing across README, runbook, checklist, and evidence pack

Acceptance criteria:
- one canonical set of manual demo URLs is documented
- `verify:case3` is clearly marked as a preflight gate that shuts its own stack down
- integration queue and recovery flow are documented as optional failure-path proof, not mandatory happy path
- evidence pack summary matches the current capture metadata and latest freeze gate output

## P7

### Story: Alerts UX Hardening

Status:
- Done on `2026-04-17`

Owner:
- `frontend-developer` + `qa-engineer`

Goal:
- make the Alerts tab fully operable for demo and review without changing backend boundaries

Acceptance criteria:
- every alert card can open detail review, including low-count cards
- Alert Settings preserves an explicit threshold of `0`
- healthy refresh controls say `Refresh`, not `Retry`
- follow-up queue copy matches the real `unassigned + re-review` logic
- targeted Alerts tests and frontend verification pass after the change

Evidence:
- `npm --prefix dashboard run test -- AlertSettingsModal AlertsPage AlertsPanel`
- `npm --prefix dashboard run verify:frontend`
- `npm test -- --runInBand src/__tests__/alerts.controller.behavior.test.js src/__tests__/alerts.routes.authz.test.js`

## P8

### Story: Alerts Visual Density Polish

Status:
- Done on `2026-04-17`

Owner:
- `frontend-developer` + `ux-researcher`

Goal:
- improve scan speed and visual balance in the Alerts experience without touching the data flow

Acceptance criteria:
- the left/right Alerts split gives more room to the detail workspace
- the summary dock reads as grouped signal blocks instead of one dense slab
- alert cards have clearer spacing and calmer acknowledgement treatment
- Alert Settings modal navigation feels lighter and gives more room to the editor
- frontend verification stays green after the polish

Evidence:
- `npm --prefix dashboard run test -- AlertSettingsModal AlertsPage AlertsPanel`
- `npm --prefix dashboard run verify:frontend`

## P9

### Story: Session Restore Semantics Hardening

Status:
- Done on `2026-04-18`

Owner:
- `backend-developer` + `frontend-developer` + `qa-engineer`

Goal:
- stop false "session restore unavailable" warnings when the real condition is only an invalid or stale refresh session

Problem statement:
- the login screen currently shows a warning toast and inline notice when `restoreSession()` fails with a non-`401/403` response
- runtime verification showed `/api/auth/refresh` behaves normally with `401` when no cookie is present
- the risky case is stale browser refresh state after reseed/reset, where backend paths like missing user or broken token rotation can escape the normal invalid-session semantics
- this creates a misleading UX: the operator sees "restore unavailable" even when the right interpretation is just "signed out"

Acceptance criteria:
- `POST /api/auth/refresh` treats stale or unusable refresh sessions as invalid auth and responds with `401`, not `404`
- frontend auth bootstrap only shows the "restore unavailable" warning for transport failures, `5xx`, or explicitly temporary server-side conditions
- stale cookies after DB reseed/reset fall back to a normal signed-out state without warning spam
- targeted backend and frontend auth tests cover the user-missing and stale-session paths
- full frontend verification stays green after the change

Recommended implementation order:
1. backend: normalize `refreshHandler` invalid-session branches to `AUTH_REFRESH_TOKEN_INVALID`
2. frontend: narrow the warning path in `AuthContext` so `401/403/404` do not raise the unavailable notice
3. qa: add regression tests for stale cookie + missing user semantics
4. run `verify:frontend` and targeted backend auth tests before merging

Evidence:
- `npm --prefix dashboard run test -- AuthContext`
- `npm run test -- --runInBand src/__tests__/auth.refresh.contract.test.js`
- `npm --prefix dashboard run verify:frontend`
- `npm run verify:backend`
- `npm run verify:all`

## Later / Not For Demo

### Stronger Downstream Idempotency

Status:
- Done on `2026-04-16`

Owner:
- `solution-architect` + `backend-developer`

Goal:
- harden Payroll consume logic against duplicate `correlationId` delivery

Acceptance criteria:
- duplicate update/delete events do not create history drift
- behavior is documented and tested

### Case 5 Safe Readiness Evidence

Status:
- Done on `2026-04-16`

Owner:
- `devops-engineer` + `security-engineer`

Goal:
- add a non-destructive Case 5 evidence artifact that proves current runtime readiness without pretending real HA or failover

Acceptance criteria:
- `npm run case5:readiness:safe` generates a report under `Memory/DR`
- the report captures split-service reachability for `SA`, `Payroll`, and `Dashboard`
- the report captures Mongo and MySQL readiness, including active migration posture
- the report records security posture checks without exposing secrets
- docs and runbooks explain that this is readiness evidence, not a real DR drill

Evidence:
- `node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js src/__tests__/case5.readiness.script.contract.test.js src/__tests__/local.stack.contract.test.js --runInBand`
- `npm run case5:readiness:safe`
- `npm run verify:case3`

### Production-Oriented Case 5 Expansion

Status:
- Recommended next story only after demo pressure is gone

Owner:
- `devops-engineer` + `security-engineer`

Goal:
- expand beyond the academic MVP only after demo pressure is gone

Acceptance criteria:
- real network topology
- real DR drill posture
- real rollback and secrets posture

## Current Watchouts

- `verify:case3` stops the stack after it finishes, so manual demo needs `case3:stack:start`
- Case Study 5 must stay honestly marked as partial
- architecture must be defended as `same repo, separate processes/services`, not microservice theater

## Scope-Out For Now

Do not prioritize these unless a real blocker appears:

- large architecture rewrites
- replacing the current stack
- new platform integrations unrelated to the coursework defense
- visual redesigns that touch many moving parts right before demo
