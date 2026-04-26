# Project Context

Last Updated: 2026-04-16

## Mission

This repository is a student coursework delivery for **System Integration Practice**, built around the **CEO Memo** scenario and **Case Study 1-5**.

The real problem is broader than "make the app run". The repo must survive instructor scrutiny when they inspect:

- whether this is real `System Integration` instead of one app with two databases
- whether `Case Study 2` and `Case Study 3` are defended by the implemented runtime, not just the slides
- whether the team can explain tradeoffs, risks, and why each integration choice is academically reasonable

## Current Runtime Shape

As of 2026-04-16, the implemented architecture is:

- `SA / HR Service`
  - source-of-truth for auth, employee CRUD, and integration dispatch
  - MongoDB-backed source records and outbox ownership
- `Payroll Service`
  - separate service and UI
  - MySQL-backed payroll read model and sync evidence
  - owns Payroll write path through its internal API
- `Dashboard Service`
  - separate reporting service and React frontend
  - executive brief, alerts, drilldown, and integration operations views

Primary evidence in code:

- [SA entrypoint](</D:/SIP_CS 2/SIP_CS/src/sa-server.js>)
- [Payroll entrypoint](</D:/SIP_CS 2/SIP_CS/src/payroll-server.js>)
- [Dashboard entrypoint](</D:/SIP_CS 2/SIP_CS/src/dashboard-server.js>)
- [Shared runtime bootstrap](</D:/SIP_CS 2/SIP_CS/src/runtime/serviceRuntime.js>)
- [SA app](</D:/SIP_CS 2/SIP_CS/src/apps/saApp.js>)
- [Payroll app](</D:/SIP_CS 2/SIP_CS/src/apps/payrollApp.js>)
- [Dashboard app](</D:/SIP_CS 2/SIP_CS/src/apps/dashboardApp.js>)

## Integration Story That Must Be Preserved

The current `Case Study 3` defense is:

`SA source write -> Mongo outbox / dispatch -> Payroll internal API -> Payroll MySQL`

This is the most important architecture fact to preserve. Any future change that reintroduces direct SA writes into Payroll tables weakens the defense immediately.

Key references:

- [Employee mutation controller](</D:/SIP_CS 2/SIP_CS/src/controllers/employee.controller.js>)
- [Payroll internal mutation endpoint](</D:/SIP_CS 2/SIP_CS/src/controllers/payroll.controller.js>)
- [Payroll mutation service](</D:/SIP_CS 2/SIP_CS/src/services/payrollMutationService.js>)
- [Payroll adapter](</D:/SIP_CS 2/SIP_CS/src/adapters/payroll.adapter.js>)
- [Case Study 3 documentation](</D:/SIP_CS 2/SIP_CS/docs/case_study_3_data_consistency.md>)

## Coursework Status

### Case Study 1

- defensible if presented as `same repo, separate systems/processes`

### Case Study 2

- implemented as a separate reporting system with executive brief, drilldown, alerts, and dashboard UI

### Case Study 3

- implemented as visibly separate source and downstream systems
- current correctness claim is controlled `eventual consistency`, not strong consistency
- `verify:case3` is the main proof command

### Case Study 4

- implemented as `middleware-lite`
- queue, retry, replay, recover, and operator visibility exist

### Case Study 5

- partial only
- must never be described as a full production DR/network rollout

## Verified State

The repo was re-verified on 2026-04-16 with:

- `npm run verify:backend`
- `npm --prefix dashboard run verify:frontend`
- `npm run verify:case3`

Meaning:

- backend unit, integration, advanced, migration, and dependency gates are green
- frontend lint, tests, production build, and production dependency audit are green
- the Case 3 smoke path is green for create -> sync -> update -> executive brief -> delete

## Current Definition Of Done

This project is only "done" when all of the following stay true together:

1. Runtime split remains credible.
2. `verify:backend`, `verify:frontend`, and `verify:case3` stay green.
3. Dashboard is `Ready for Memo`.
4. Demo surfaces are understandable without defensive explanation.
5. Docs and runtime tell the same story.
6. The team does not over-claim beyond what is implemented.

## Non-Negotiable Constraints

- Do not regress from 3 services back to a one-app narrative.
- Do not reintroduce `localStorage` bearer-token handling.
- Do not weaken employee contract hardening for convenience.
- Do not claim strong consistency if the implementation is eventual consistency with controlled recovery.
- Do not claim full production-grade DR for Case Study 5.
- Do not add risky refactors right before demo unless they remove a real blocker.

## Current Watchouts

- `verify:case3` stops the stack after it finishes, so manual demo needs `npm run case3:stack:start`.
- Dashboard demo readiness is partly shaped by prep scripts, so evidence capture should always use the current runtime state, not old screenshots.
- Payroll sync is still worth hardening later for stronger idempotency around repeated `correlationId` delivery, but that is a post-demo improvement unless it becomes a live blocker.

## What Is Still Worth Improving

The highest-value remaining work is now operational and presentation-focused:

- final demo runbooks and evidence pack
- viva / Q&A preparation
- low-risk UI polish only
- regression-proofing for sensitive session, verification, and proof-path behavior

Use the backlog in [NEXT_ITERATION_BACKLOG.md](</D:/SIP_CS 2/SIP_CS/.codex/context/scrum/NEXT_ITERATION_BACKLOG.md>) as the default continuation point.
