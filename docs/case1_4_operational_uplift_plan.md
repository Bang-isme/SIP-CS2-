# Case 1-4 Operational Uplift Plan

> Updated: 2026-04-24
> Intent: move the current repo from `coursework-strong` to `as close to real operations as this codebase can credibly support`

## 1. Goal

The goal is not to make the repo look more "enterprise" on slides.

The goal is to improve the parts that make a system feel real in operation:

- trustworthy source-of-truth boundaries
- visible data freshness and propagation state
- operator recovery and reconciliation loops
- strong contracts and repeatable verification

This means avoiding fake complexity.

We should not add Kafka, RabbitMQ, or more service folders just to sound advanced if the resulting system is harder to explain, harder to verify, and not materially more reliable in this repo.

## 2. Task Contract

- `goal`: improve Case 1-4 quality toward a more production-like operating system while keeping the current repo verifiable and honest
- `constraints`: keep the current three-runtime shape (`SA`, `Payroll`, `Dashboard`), preserve existing demo flow, avoid fake enterprise complexity, do not weaken the current verification gates
- `non_goals`: full Case 5 production infrastructure, broker-grade event mesh, ACID across MongoDB and MySQL, full microservice decomposition
- `evidence_required`: code paths, current verification commands, live runtime behavior, and existing docs/scripts in the repo
- `quality_bar`: every recommendation must be tied to a concrete repo boundary, health signal, and next implementation move

## 3. Decision Surface

### Option A: Freeze at "safe coursework" level

Keep the current shape, polish UI/UX and docs only, and avoid deeper system changes.

Why it could work:

- low blast radius
- current gates already pass
- strong enough for a standard classroom demo

Why it is not enough:

- leaves real operational gaps visible under questioning
- keeps the dashboard freshness story weaker than it should be
- does not close the loop between source mutation, downstream propagation, and executive trust

### Option B: Over-scope into "enterprise-looking" architecture

Add heavier middleware patterns, more services, or pseudo-production infrastructure.

Why it could work:

- sounds impressive at a high level
- appears closer to industry architecture diagrams

Why it is the wrong path here:

- large blast radius
- harder to test locally
- higher chance of breaking a repo that is already demo-capable
- easy to over-claim and then fail under viva questioning

### Option C: Production-near within current repo constraints

Keep the current three-service architecture, but strengthen the operating loops that real systems need.

Why this is the right path:

- highest value per unit of complexity
- increases trustworthiness without destroying reproducibility
- makes the repo easier to defend because the team can show concrete controls instead of abstract architecture claims

Chosen path: `Option C`

## 4. Current State: What Is Already Good

### Case 1

- Proposal quality is now backed by the real runtime split:
  - `SA` on `4000`
  - `Payroll` on `4100`
  - `Dashboard` on `4200`
- Evidence:
  - `docs/case_study_1_proposal.md`
  - `src/sa-server.js`
  - `src/payroll-server.js`
  - `src/dashboard-server.js`

### Case 2

- Dashboard is the strongest subsystem in the repo:
  - executive brief
  - alerts
  - drilldown
  - CSV export
  - route-level workflows
- Evidence:
  - `dashboard/src/pages/*`
  - `dashboard/src/components/*`
  - `src/controllers/dashboard.controller.js`
  - `src/controllers/alerts.controller.js`
  - `npm --prefix dashboard run verify:frontend`

### Case 3

- The source/downstream story is now credible:
  - source write in `SA`
  - propagation via outbox + worker
  - downstream ownership in `Payroll`
  - end-to-end verification in `npm run verify:case3`
- Evidence:
  - `src/controllers/employee.controller.js`
  - `src/services/integrationEventService.js`
  - `src/services/syncService.js`
  - `src/services/payrollMutationService.js`
  - `docs/case_study_3_data_consistency.md`

### Case 4

- The repo already has real middleware-lite behavior:
  - outbox
  - worker
  - retry
  - replay
  - recover-stuck
  - audit history
  - operator queue UI
- Evidence:
  - `src/workers/integrationEventWorker.js`
  - `src/routes/integration.routes.js`
  - `src/services/integrationOperatorService.js`
  - `dashboard/src/components/IntegrationEventsPanel.jsx`

## 5. The Real Gaps Between "Good Coursework" and "Good Operations"

The biggest remaining gaps are not missing pages.

They are missing closed loops.

### Gap 1: Freshness Loop Is Not Tight Enough

Current behavior:

- Dashboard executive and analytics data is pre-aggregated.
- Dashboard refresh is manual for most surfaces.
- Direct upstream changes do not automatically produce a visible "summary recalculated" moment.

Repo evidence:

- `src/controllers/dashboard.controller.js`
- `src/services/dashboardExecutiveService.js`
- `dashboard/src/hooks/useDashboardData.js`
- `src/workers/dashboardAggregationWorker.js`

Why this matters:

- a real operator needs to know whether the current number is stale because data has not changed, or stale because aggregation has not rerun yet
- this is the biggest trust gap in the current system

### Gap 2: Reconciliation Loop Is Mostly Script-Level, Not Operator-Level

Current behavior:

- there are repair and verification scripts
- there is queue monitoring
- but there is no first-class in-app reconciliation surface that says:
  - source count vs downstream count
  - mismatch count
  - last parity check time
  - whether payroll evidence is currently aligned with source

Repo evidence:

- `scripts/repair-cross-db-consistency.js`
- `scripts/verify-case3-stack.ps1`
- `scripts/local-runtime-doctor.js`
- `dashboard/src/components/IntegrationEventsPanel.jsx`

Why this matters:

- real systems need a visible parity signal, not only logs and scripts
- this is the biggest realism gap in Case 3 + Case 4

### Gap 3: Mutation Provenance Is Strong In Backend, But Not Yet Surfaced End-To-End

Current behavior:

- correlation IDs are preserved through sync paths
- sync metadata exists
- but the UX still stops too early in several places

Repo evidence:

- `src/services/syncService.js`
- `src/services/integrationEventService.js`
- `src/services/payrollMutationService.js`
- `dashboard/src/components/AdminEmployeesModal.jsx`

Why this matters:

- a source write should let an operator answer:
  - was it accepted?
  - was it queued?
  - was it delivered?
  - did Payroll mutate?
  - if not, where is it stuck?

### Gap 4: The System Has Verification Gates, But Not Enough Runtime Health Semantics In The UI

Current behavior:

- strong CLI verification exists
- health/readiness and queue metrics exist
- but the UI does not yet communicate a single operational readiness picture beyond the current executive brief and queue cards

Repo evidence:

- `npm run verify:backend`
- `npm --prefix dashboard run verify:frontend`
- `npm run verify:case3`
- `src/controllers/health.controller.js`
- `scripts/local-runtime-doctor.js`

Why this matters:

- a real operating system needs in-app health semantics, not only offline scripts

## 6. Best-Next-Step Uplift Roadmap

### Priority A: Add a Reconciliation Surface

Target outcome:

- a dedicated operator summary that compares `SA` and `Payroll`
- expose:
  - source employee count
  - downstream pay-rate count
  - active mismatch count
  - latest successful parity check
  - mismatched sample entities

Why this is the best first move:

- strongest realism gain for Case 3 and Case 4
- high defense value in viva
- uses existing repair/verification ideas already present in scripts

Healthy signal:

- reconciliation status `healthy`
- mismatch count `0`
- last parity check within an accepted freshness window

Failure signal:

- non-zero mismatch count
- parity check too old
- queue backlog growing while parity drifts

Implementation contract for this priority:

- canonical comparison:
  - `source` = Mongo `Employee.employeeId`
  - `downstream` = active Payroll rows from MySQL `pay_rates`
- active downstream coverage means:
  - `is_active = true`
  - `pay_type != TERMINATED`
- required outputs:
  - source employee count
  - downstream covered employee count
  - missing-in-payroll count
  - extra-in-payroll count
  - total mismatch count
  - sampled mismatched employee ids
  - last parity check timestamp
- performance rule:
  - do not recompute a full 500k-record parity diff on every UI poll tick
  - use snapshot caching and bounded sample output
- UI placement:
  - the reconciliation surface belongs with operator/integration controls, not executive overview
- verification rule:
  - add backend coverage for healthy and drifted parity states
  - add frontend coverage that shows healthy vs mismatched status clearly

Delivered in current iteration:

- backend snapshot service:
  - `src/services/integrationReconciliationService.js`
- backend operator route:
  - `GET /api/integrations/events/reconciliation`
- operator UI surface:
  - `dashboard/src/components/IntegrationEventsPanel.jsx`
- current snapshot semantics:
  - compares Mongo `Employee.employeeId` + `payRate`
  - against active MySQL `pay_rates.employee_id` + `pay_rate`
  - reports `missing`, `extra`, `duplicate active`, and `pay-rate mismatch`
  - returns bounded sample entities for operator follow-up
- refresh behavior:
  - background reads use a cached snapshot
  - manual refresh uses `fresh=true` to bypass cache and force a new parity read
  - operator recovery actions (`retry`, `retry dead`, `recover stuck`, `replay`) now force a parity refresh alongside queue metrics so the Operations surface stays internally consistent after deliberate interventions
- proof collected:
  - backend tests for controller, route authz, and reconciliation algorithm
  - frontend tests for operator rendering
  - `verify:backend` pass
  - `verify:frontend` pass
  - `verify:case3` pass
  - live smoke call confirmed `healthy` parity against the current local dataset

### Priority B: Tighten the Dashboard Freshness Loop

Target outcome:

- distinguish `data changed`, `summary stale`, and `summary refreshed`
- expose the last recomputation event more explicitly
- optionally allow an operator-triggered summary refresh path with bounded scope

Why this is second:

- it directly strengthens Case 2 trustworthiness
- it prevents the dashboard from looking "wrong" after valid source changes

Healthy signal:

- freshness badge is recent
- summary recompute latency is visible and bounded

Failure signal:

- source mutation succeeds but executive figures remain stale without explanation

Delivered in current iteration:

- backend freshness semantics:
  - `src/services/dashboardExecutiveService.js`
  - adds structured `freshness.readiness` with `current`, `refresh_lag`, and `coverage_gap`
- real operator rebuild path:
  - `POST /api/dashboard/refresh-summaries`
  - backed by `src/workers/dashboardAggregationWorker.js`
  - exposed through `src/controllers/dashboard.controller.js`
- FE semantics:
  - compact readiness note in `dashboard/src/components/DashboardHeader.jsx`
  - operator-facing rebuild / refresh behavior in `dashboard/src/layouts/DashboardLayout.jsx`
  - overview action wiring in `dashboard/src/pages/OverviewPage.jsx`
- current behavior:
  - admins can trigger a bounded summary rebuild from the dashboard
  - non-admins still see freshness debt clearly, but the UI does not pretend they can rebuild it
  - dashboard refresh and summary rebuild are now distinct actions
- proof collected:
  - backend tests for executive brief semantics, controller contract, and route authz
  - frontend tests for header, layout, and overview rebuild semantics
  - `verify:backend` pass
  - `verify:frontend` pass
  - `verify:case3` pass

### Priority C: Surface Sync Lifecycle End-To-End In Admin Workflows

Target outcome:

- after create/update/delete in `Manage Employees`, show:
  - source saved
  - queue accepted
  - downstream delivered or still pending
  - link to queue/event evidence

Why this matters:

- it turns a hidden consistency model into an operator-usable one
- makes the current backend work visible where the user needs it most

Healthy signal:

- operators can trace one business change from source to downstream without leaving the app blind

Failure signal:

- operators still need logs or manual DB inspection to explain state

Delivered in current iteration:

- backend evidence snapshot:
  - `src/services/employeeSyncEvidenceService.js`
- backend employee route:
  - `GET /api/employee/:employeeId/sync-evidence`
  - super-admin only because it exposes payroll-side delivery evidence
- current snapshot semantics:
  - `source` stage from Mongo employee presence + pay rate
  - `queue` stage from latest outbox event for that employee id
  - `payroll` stage from MySQL `pay_rates` + latest `sync_log`
  - `overall` stage classifies `healthy`, `pending`, or `attention`
- FE operator surface:
  - `dashboard/src/components/AdminEmployeesModal.jsx`
  - replaces the old one-line sync card with a delivery evidence block
  - shows `Source / Queue / Payroll` stages
  - supports manual evidence refresh
  - auto-polls while queue delivery is still pending/processing
- current behavior:
  - update/create flows now show both immediate write acknowledgement and post-write delivery evidence
  - operators can see payroll drift vs source pay rate without leaving the employee editor
  - delete flow keeps the old immediate sync acknowledgement, while the evidence endpoint also supports source-removed states by `employeeId`
  - page-level employee mutations now refresh the broader dashboard context with `forceOperationalReadiness`, so readiness/parity semantics stay closer to the actual source-write path instead of only updating a few summary widgets
- proof collected:
  - backend tests for service logic, controller behavior, and route authz
  - frontend test for evidence rendering in `AdminEmployeesModal`
  - `verify:backend` pass
  - `verify:frontend` pass
  - `verify:case3` pass

### Priority D: Promote Runtime Readiness From Script To Product Behavior

Target outcome:

- show a compact operational readiness panel in the UI:
  - service health
  - queue health
  - summary freshness
  - reconciliation health

Why this is fourth:

- by itself it is not enough
- after priorities A-C, it becomes the final trust layer

Healthy signal:

- one glance tells whether the system is safe to use for demo or operations

Failure signal:

- scripts say healthy, but UI does not tell the same story

Delivered in current iteration:

- backend readiness snapshot:
  - `src/services/dashboardOperationalReadinessService.js`
- backend route:
  - `GET /api/dashboard/operational-readiness`
- current readiness contract:
  - `services`: live health of `Dashboard`, `SA`, and `Payroll`
  - `summaries`: dashboard freshness semantics from the executive brief
  - `parity`: SA to Payroll reconciliation status
  - `queue`: delivery-path health plus actionable queue debt
- FE operator surface:
  - `dashboard/src/components/OperationalReadinessPanel.jsx`
  - mounted in `dashboard/src/pages/OverviewPage.jsx`
- current behavior:
  - operators can refresh readiness without pretending that a summary rebuild happened
  - summary rebuild remains a distinct readiness action when freshness debt exists
  - the right side of Overview now exposes one compact trust surface instead of forcing operators to mentally combine scripts, queue pages, and badges
  - Overview readiness and Operations queue semantics now align more tightly: readiness refresh stays scope-correct, while operator actions in Operations refresh both queue state and parity evidence
- proof collected:
  - backend tests for readiness aggregation, controller contract, and route authz
  - frontend tests for readiness rendering and overview wiring
- `verify:backend` pass
- `verify:frontend` pass
- demo queue scenarios now seed matching operator audit evidence so the Operations surface can be demonstrated with realistic queue + parity + audit data in one pass
- `verify:case3` pass

### Priority E: Surface Operator Audit Trail Inside Operations

Target outcome:

- let an operator answer, from the queue screen itself:
  - who retried/replayed/recovered an event
  - when the action happened
  - which state transition was requested
  - which request id and scope produced that change

Why this matters:

- a real queue surface needs operator evidence, not only current queue state
- it closes the gap between backend audit integrity and frontend operator trust

Healthy signal:

- each meaningful queue intervention leaves visible, timestamped operator evidence
- the operator can refresh that evidence without leaving `Operations`

Failure signal:

- queue status changes, but the app cannot explain who performed the last recovery step
- audit records exist only in the database or backend tests

Delivered in current iteration:

- existing backend route reused:
  - `GET /api/integrations/events/:id/audit`
- FE client contract:
  - `dashboard/src/services/api.js`
- operator UI surface:
  - `dashboard/src/components/IntegrationEventsPanel.jsx`
  - `dashboard/src/components/IntegrationEventsPanel.css`
- current behavior:
  - every visible queue row now exposes an on-demand `Audit` action
  - the panel shows the latest operator actions for that event
  - each audit entry surfaces:
    - operator action
    - timestamp
    - source -> target status transition
    - actor id
    - request id
    - scope/filter/entity details when present
  - audit evidence refreshes alongside queue/parity refresh cycles when an event is selected
- proof collected:
- frontend tests for loading and error rendering of audit history
- API client coverage for the audit lookup contract
- `verify:case4:operations-demo` pass
- `verify:case3` now includes the operations demo smoke by default
- `verify:frontend` pass

### Priority F: Generate a One-Command Demo Evidence Pack

Target outcome:

- generate a dated proof bundle for Case 2-4 with one command
- capture:
  - backend gate evidence
  - frontend gate evidence
  - Case 3 stack gate evidence
  - Case 4 operations smoke evidence
  - dashboard demo preparation report
  - optional screenshots when browser capture prerequisites exist

Why this matters:

- a strong system still loses credibility if the proof path is manual and inconsistent
- viva/demo readiness improves when the team can regenerate the same evidence bundle instead of collecting logs ad hoc
- interrupted long-running capture flows need a safe resume path, not a full restart

Healthy signal:

- one command produces a dated bundle with logs, data summaries, and a README that explains what was captured
- interrupted runs can resume by reusing already-collected verification logs and an already-running stack

Failure signal:

- evidence must still be collected manually across multiple terminals
- a partial or interrupted run forces the team to rerun every verification step from scratch

Delivered in current iteration:

- canonical bundle planning:
  - `src/utils/demoEvidenceCapturePlan.js`
- one-command evidence builder:
  - `scripts/build-demo-evidence-pack.mjs`
  - `npm run demo:evidence:build`
- demo preparation script now supports structured output capture:
  - `scripts/prepare-dashboard-demo.js`
- current bundle contract:
  - dated bundle directory under `docs/demo/evidence/<date-stamp>/`
  - `README.md`
  - `data/dashboard-demo-prepare.json`
  - `data/evidence-summary.json`
  - command logs for backend, frontend, Case 3, Case 4, stack start, demo prep, and capture
- current resilience behavior:
  - Windows-safe command spawning via `cmd.exe /d /s /c npm ...`
  - resume flags for reusing existing verification logs and an already-running stack
  - soft skip for screenshot capture when browser prerequisites are absent
- proof collected:
  - contract tests for bundle targets, builder wiring, and prep output
  - `npm run verify:backend` pass after builder/resume changes
  - live smoke bundle created at `docs/demo/evidence/2026-04-22-smoke/README.md`

### Priority G: Harden Dependency Recovery And Remove Generic Runtime Signals

Target outcome:

- `Dashboard` and `SA` recover from transient Mongo loss without manual restart
- `case3` readiness means dependency-usable, not only port-listening
- `Overview`, `Analytics`, `Manage Employees`, and `Payroll` keep only the signals that matter for operator decisions
- browser runtime stays free of known non-app noise like `favicon.ico 404`

Why this matters:

- a system that only passes clean boot is still fragile in operation
- UI trust drops quickly when cards repeat the same status or CTA labels feel generic
- if the browser console is noisy, the system still feels unfinished even when logic is correct

Healthy signal:

- Mongo can disappear and return while `SA` and `Dashboard` recover on their own
- startup scripts wait for `/api/health/ready`, not only open ports
- `Overview` uses one primary readiness layer instead of repeating the same state several times
- `Analytics` quick checks open action-specific drilldowns
- `Manage Employees` uses explicit internal table scroll on medium desktop instead of squeezing compensation/actions
- `Payroll` signed-in state visually prioritizes proof over auth narrative
- `SA` and `Payroll` stop emitting favicon-related browser noise

Failure signal:

- `Dashboard` stays degraded after Mongo returns until someone restarts it
- operator scripts claim the stack is ready while readiness endpoints still fail
- UI cards repeat the same readiness message across headline, pill, banner, and action card
- medium-width admin tables clip the most operationally important columns

Delivered in current iteration:

- backend dependency recovery:
  - `src/database.js`
  - automatic reconnect scheduling on Mongo disconnect/error for shared runtime clients
- startup/readiness hardening:
  - `scripts/start-case3-stack.ps1`
  - stack startup now waits for `/api/health/ready`
- runtime recovery smoke:
  - `scripts/verify-case3-mongo-recovery.ps1`
  - `npm run verify:case3:mongo-recovery`
  - `scripts/verify-case3-stack.ps1` now runs the recovery smoke by default unless explicitly skipped
- browser/runtime noise cleanup:
  - `src/apps/baseApp.js`
  - `public/payroll-console/index.html`
- UI signal cleanup:
  - `dashboard/src/components/ExecutiveBrief.jsx`
  - `dashboard/src/components/ChartsSection.jsx`
  - `dashboard/src/components/AdminEmployeesModal.jsx`
  - `dashboard/src/components/AdminEmployeesModal.css`
  - `public/payroll-console/app.js`
  - `public/payroll-console/styles.css`
- current behavior:
  - `SA` and `Dashboard` recover readiness after local Mongo returns without process restart
  - `Overview` no longer repeats a pill-level readiness badge next to the main briefing headline
  - `Analytics` quick checks now use action-specific labels such as `Open payroll`, `Open movement`, and `Open time off`
  - `Manage Employees` uses deliberate internal horizontal scroll at medium desktop widths, preserving readable compensation/action regions
  - signed-in Payroll sessions mark the shell as `data-evidence=loaded` and visually down-weight auth/scope/link cards when proof is present
  - browser audit on live runtime found no console errors, no page errors, and no favicon 404s across `Dashboard`, `SA`, and `Payroll`
- proof collected:
  - backend contract coverage for runtime hardening and service app behavior
  - frontend targeted tests plus full `verify:frontend`
  - `verify:case3` pass, including Mongo recovery smoke and browser auth smoke
  - `verify:backend` full-suite rerun remains environment-sensitive, so current proof for this priority is based on lint + targeted backend contracts + `verify:case3`

## 7. Case-by-Case Best-Possible Positioning

### Case 1

Current path is already close to best-possible within scope.

Do not spend more effort here except to keep docs consistent with the actual runtime split.

### Case 2

To become truly excellent, Case 2 needs:

- better freshness semantics
- stronger provenance from executive number to detail evidence
- fewer hidden assumptions about when summaries were last recomputed

### Case 3

To become production-near, Case 3 needs:

- in-app reconciliation, not only scripts
- clearer sync lifecycle visibility
- explicit distinction between source accepted, queued, delivered, and reconciled

### Case 4

To become best-possible without over-scoping, Case 4 needs:

- stronger operator visibility
- parity/reconciliation signals
- clearer blast-radius control

It does not need Kafka just to sound better.

## 8. Stop/Ship Criteria

The repo should be considered "best possible within current scope" when all of the following are true:

- Dashboard can explain freshness and recompute state clearly
- Operators can see SA-to-Payroll parity in-app
- Employee admin workflows expose downstream sync lifecycle without log-diving
- Queue recovery and parity evidence can be demonstrated live
- A dated Case 2-4 evidence pack can be regenerated without manual log gathering
- `verify:backend`, `verify:frontend`, and `verify:case3` remain green after each uplift

Current honest status:

- all criteria except the last one are now closed in repo behavior and live runtime proof
- `verify:frontend` and `verify:case3` are green after Priority G
- `verify:backend` full-suite reruns still hit environment timeout intermittently, so backend confidence currently relies on targeted contracts plus end-to-end case verification rather than one clean full-suite rerun in this environment

## 9. Recommended Sequence

1. Build reconciliation API + operator panel
2. Tighten dashboard freshness semantics and refresh path
3. Extend employee admin workflow with end-to-end sync evidence
4. Consolidate operational readiness into one compact system-health surface
5. Surface queue-level operator audit evidence directly inside `Operations`
6. Add a one-command evidence pack so the strongest flows are demonstrable and archivable, not only explainable
7. Harden dependency recovery and strip remaining generic/noisy runtime signals

That sequence gives the highest credibility gain without turning the repo into an over-engineered science project.
