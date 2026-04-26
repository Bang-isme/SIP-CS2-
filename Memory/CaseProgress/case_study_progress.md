# Case Study Progress

> Last Updated: 2026-04-22T03:10:00+07:00

## Current Stage: Case Study 4 - PRODUCTION-NEAR COURSEWORK IMPLEMENTATION

---

## Completion Snapshot (2026-04-22)

| Area | Completion | Evidence Snapshot | Practical Reading |
|---|---|---|---|
| CEO Memo | 94% | `verify:backend`, `verify:frontend`, `verify:case3` all pass on 2026-04-22 | Strong enough for demo and viva, with clearer operational trust signals than before |
| Case 1 | 96% | proposal docs + visible three-service runtime + operational uplift plan closed through A-D | No longer just a proposal on paper; the chosen architecture is observable and behaviorally reinforced |
| Case 2 | 95% | dashboard routes, alerts, drilldown, readiness/freshness semantics, frontend tests | Strongest case-study area in the repo and now closer to a real reporting surface |
| Case 3 | 94% | SA/Payroll split + outbox dispatch + reconciliation + sync evidence + `npm run verify:case3` | Defend as controlled eventual consistency with visible operator evidence, not ACID |
| Case 4 | 88% | outbox, worker, retry/replay/recover, operator panel, audit trail, parity snapshot | Defend as middleware-lite with real recovery/parity loops, not full ESB/event mesh |

### Current Honest Positioning

- Dashboard is `refresh-based` and `pre-aggregated`, not realtime streaming.
- `SA` remains the source of truth.
- `Payroll` remains the downstream target, not the canonical write path.
- The strongest classroom story is now `Case 2 + Case 3`, with `Case 4` upgraded from a substantial extension to a strong middleware-lite layer, though still not a finished enterprise backbone.

## Recent Fixes (2026-04-22)
- Added backend-owned operational readiness snapshot at `GET /api/dashboard/operational-readiness`, combining live `Dashboard / SA / Payroll` health, dashboard freshness semantics, SA-to-Payroll parity, and queue recovery state.
- Added `OperationalReadinessPanel` to `OverviewPage`, so the product now exposes one compact readiness surface instead of forcing operators to mentally combine scripts, badges, and the separate Operations page.
- Finished the remaining planned operational uplift priorities:
  - Priority B: summary freshness semantics + manual rebuild path
  - Priority C: employee `Source / Queue / Payroll` lifecycle evidence
  - Priority D: unified in-app runtime readiness surface
- Tightened `Overview` semantics so `Refresh readiness` only refreshes the readiness surface instead of reloading the whole overview payload.
- Tightened `Manage Employees` post-mutation behavior so source writes refresh the broader dashboard context with readiness semantics.
- Tightened `Operations` so `retry`, `retry dead`, `recover stuck`, and `replay` now refresh parity evidence together with queue state, keeping the operator surface internally consistent after deliberate recovery actions.
- Re-verified the uplift with the full gates:
  - `npm run verify:backend`
  - `npm --prefix dashboard run verify:frontend`
  - `npm run verify:case3`

---

## Reference Requirements (Case 1-5)
CEO Memo core: dashboard summary (earnings/vacation/benefits), drill-down to details, alerts (anniversary, vacation threshold, benefits change, birthdays in current month), no required legacy replacement.

See: Memory/Context/case_study_requirements_summary.md

---

## Recent Fixes (2026-02-03)
- Drilldown performance: added bulk mode (`limit>=1000` or `bulk=1`) + fast summary (`summary=fast`) to keep response under 10s.
- Export CSV: switched to backend streaming endpoint to avoid huge JSON payload.
- UI stability: cancel stale drilldown requests to prevent 20-row response overriding 10k.
- UI polish (executive minimal): refined spacing/typography, card rhythm, charts, alerts, and drilldown visuals.
- Alerts display fix: Anniversary shows "1 day/2 days"; Birthday shows date (no negative days).
- Guide docs completed: `docs/case_study_guide.md` (Case 1-5 status, CEO Memo alignment).
- Hybrid totals: fast mode shows count quickly; if COUNT <= 10,000, background summary updates totals.
- Case Study 4 implemented: Outbox + Worker for async integration events.
- Case Study 4 monitor: added Integration Events API (list + retry).
- Case Study 4 demo: added script to insert FAILED/DEAD outbox events.
- Case Study 4 UI: Integration Queue panel added to Dashboard.
- Demo script updated: keep FAILED visible (next_run_at in future) and clear old demo rows.
- Case Study 4 replay: added admin replay filters (FAILED/DEAD) for DLQ recovery.

## Recent Fixes (2026-02-07)
- Re-audited codebase against CEO Memo + Case Study 1-5 using code evidence (controllers/services/routes/scripts/docs).
- Added formal audit report: `docs/codebase_ceo_memo_case_audit.md` (stakeholder needs, CEO Memo mapping, Case 1-5 status, prioritized gaps).
- Fixed broken backend test runtime for ESM (`npm test` now executes and passes).
- Corrected test expectations to match current auth behavior (`200/401/403`).
- Added Outbox worker variables to `.env.example` for reproducible setup.
- Rewrote `docs/case_study_2_design.md` to remove encoding corruption and clarify batch operation rules.
- Added `docs/operations_checklist_ceo_memo.md` for daily runbook + post-import verification.
- Added deterministic queue scenario script: `scripts/demo-integration-queue-scenario.js` (`healthy/warning/critical/cleanup`).
- Added queue demo runbook: `docs/integration_queue_demo_runbook.md`.
- Added queue severity UI based on metrics thresholds (Healthy/Warning/Critical).
- Dashboard layout stability: fixed Earnings/Alerts stretch gap by making primary-row cards auto-height.
- Re-validated quality gates (`npm test`, queue flow rehearsal, frontend build, data audit) for demo readiness.

## Recent Fixes (2026-04-02)
- Added `Executive Action Center` to `dashboard/src/pages/Dashboard.jsx` so executive users get one prioritized summary of freshness, summary failures, alerts, and queue risk before presenting data.
- Added `Memo Presets` + `Saved Views` to `dashboard/src/components/DrilldownModal.jsx` for repeated CEO Memo / viva queries without rebuilding filters each time.
- Fixed drilldown state init so `minEarnings` now honors incoming filters when the modal opens from a chart or preset flow.
- Added missing `Benefit Plan` filter control for benefits drilldown, backed by current plan names from benefits summary.
- Added alert acknowledgement workflow (`owner + note + timestamp + stale re-review state`) across `src/controllers/alerts.controller.js` and `dashboard/src/components/AlertsPanel.jsx`.
- Added `Alert Follow-up Queue` to `dashboard/src/pages/Dashboard.jsx` so unassigned/stale alert categories are prioritized and can open their detail modal directly.
- Hardened dashboard backend contract with shared query normalization/validation, canonical metadata envelope, safe search escaping, and year-aware drilldown summary totals.
- Added backend-owned `GET /api/dashboard/executive-brief` snapshot so `Executive Action Center` and `Alert Follow-up Queue` can follow a single BE contract for freshness, alert priority, and integration risk.
- Extended frontend regression coverage for dashboard action center and drilldown preset workflows.
- Extended backend unit/authz coverage for alert acknowledgement endpoint.
- Extended backend regression coverage for executive-brief assembly + cache behavior.
- Hardened integration operator APIs with shared validation for list/replay/id params, canonical metadata on operator responses, and dedicated authz/controller regression coverage.
- Added API-level request tracing (`x-request-id` + `requestId` in error/meta envelopes) so dashboard, alerts, auth-guard, and integration flows can be debugged and evidenced consistently during demo/operator recovery.
- Added durable operator audit trail on `integration_events` plus incremental MySQL migration readiness checks, so retry/replay/recover actions are persisted in DB and schema drift is caught by migration status/readiness.
- Added dedicated `integration_event_audits` history table + `GET /api/integrations/events/:id/audit` so operator evidence is queryable per event instead of only visible through latest row metadata.
- Locked CSV export memory behavior with regression coverage proving earnings lookups are chunked by streamed employee batch, not preloaded whole-year into memory.
- Added end-to-end correlation tracing for employee sync workflows so `requestId` now survives through employee mutation responses, `integration_events`, outbox worker/direct fallback, and `sync_log`.
- Hardened `/api/sync` into the same FE-follow-BE contract style with canonical `{ success, data, meta }`, `422` validation, actor/request metadata, and correlation-aware log filters.
- Fixed employee read contract mismatch so `GET /api/employee/:employeeId` now resolves by business employeeId first, preserves Mongo-id fallback for legacy callers, and returns canonical metadata on list/detail responses.
- Added backend-owned OpenAPI bundle at `/api/contracts/openapi.json` so FE/operator tooling has one machine-readable contract source for dashboard, alerts, employee, integrations, sync, and auth profile flows.
- Hardened auth/user/health backend surfaces so the remaining legacy contract gaps do not sit outside the FE-follow-BE standard anymore.
- `POST /api/auth/logout` is now the canonical revoke route; deprecated `GET /api/auth/logout` remains only as compatibility alias.
- `signin` now accepts email-or-username as intended instead of only querying email under a misleading comment.
- Admin user-management no longer silently ignores mixed valid/invalid role arrays, and invalid Mongo-style user ids are rejected with `422` before hitting persistence.
- Health endpoints now report readiness with MySQL migration context, so operations checks can catch schema drift instead of only checking raw DB connectivity.
- OpenAPI contract bundle now covers auth signup/logout/profile, admin users, and health probes in addition to dashboard/alerts/employee/integrations/sync.
- Auth middleware boundary now emits canonical machine-readable error codes (`AUTH_TOKEN_MISSING`, `AUTH_UNAUTHORIZED`, `AUTH_TOKEN_REVOKED`, `AUTH_FORBIDDEN`) with `requestId`, so FE/operator contracts stay consistent even before controller logic runs.
- Deprecated compatibility alias `GET /api/auth/logout` now advertises migration intent through `Deprecation` and `Sunset` headers instead of being a silent legacy path.
- Main backend runtime paths now use structured logger instead of scattered `console.*`, including auth, employee mutation fallback, dashboard, alerts, service registry, worker startup, auth seed, cache, and security mock adapter.
- Auth guard keeps missing-token noise at debug level, so anonymous probes no longer flood logs while revoked/forbidden flows still surface as actionable warnings.
- Main backend controllers now converge on a shared API error envelope helper (`success/message/code/requestId/errors[]`) for validation, not-found, conflict, and fallback server failures.
- App-level fallback handlers now return JSON contract errors for unknown routes and uncaught server errors, so FE/operator evidence does not fall back to Express HTML.
- Legacy `/api/products` module now follows backend contract standards too: canonical validation/error envelopes, fixed HTTP status semantics, bounded name search, route authz regression, and OpenAPI coverage.
- Backend contract is now explorable at runtime via local Swagger UI on `/api/contracts/docs/`, sourced from the same OpenAPI bundle the FE/operator path already relies on.
- Test environment now defaults to quiet structured logging and disabled access-log noise unless `LOG_LEVEL` or `HTTP_LOG_LEVEL=verbose` is set explicitly, so backend gate output is clearer.
- Backend runtime dependency audit is now clean (`npm audit --omit=dev` -> 0 vulnerabilities) after locking safe transitive overrides for `path-to-regexp` and `lodash`.
- Auth signin no longer returns unusable tokens when MongoDB token writes fail under storage quota; backend now returns `503 AUTH_SESSION_STORAGE_UNAVAILABLE` unless stateless fallback is explicitly enabled for read-only demo mode.
- Local Mongo runtime has been bootstrapped on `D:\MongoDB` (server, shell, data, log, config) and the app `.env` now points to `mongodb://127.0.0.1:27017/apicompany`; Atlas settings were preserved in `.env.atlas.backup`.
- Atlas Mongo data was cloned into local Mongo with the current local dataset containing `435000` employee documents; login `admin@localhost / admin_dev` now succeeds again in persistent session mode.

## Recent Fixes (2026-04-03)
- Normalized legacy `pay_rates` schema through MySQL migration `20260403_000005_pay_rate_schema_contract_cleanup`, removing old incompatible columns that were causing enterprise seed failures.
- Hardened `scripts/seed.js` so each SQL batch (`earnings`, `vacation_records`, `employee_benefits`, `pay_rates`) runs inside a transaction, preventing partial SQL writes when a batch fails.
- Expanded seed reset to clear derived analytics tables (`earnings_employee_year`, `*_summary`, `alert_employees`) before reseeding, so dashboard snapshots cannot inherit stale rows from a previous dataset.
- Expanded `scripts/repair-cross-db-consistency.js` to detect/remove orphan rows in `pay_rates` and `alert_employees` in addition to existing payroll tables.
- Reseeded local Mongo + MySQL with the enterprise profile to a verified `500000`-employee baseline and rebuilt dashboard aggregates successfully.
- Verified local counts after reseed: Mongo `employees=500000`, Mongo `departments=8`, MySQL `vacation_records=500000`, `employee_benefits=500000`, `pay_rates=500000`, `earnings_employee_year=849977`.
- Verified cross-database repair run reported `0` orphan deletions on the 500k local baseline.
- Re-ran backend quality gates after the reseed hardening: `npm run lint`, `npm test`, `npm run test:advanced`, `npm audit --omit=dev`, `npm run db:migrate:mysql:status` all pass.
- Added Windows service operations for local Mongo on `D:\MongoDB` (`SIPLocalMongoDB`) so demo/test environments no longer depend on remembering a manual `mongod` start command.
- `mongo:local:start` and `mongo:local:stop` now prefer the Windows service when installed and fall back to manual process mode otherwise.
- Added package scripts for Mongo service install/uninstall/status and updated docs/runbook to treat service mode as the recommended runtime for demo readiness.
- Added a no-admin fallback autostart path via scheduled task `SIPLocalMongoDBAutostart`, so local Mongo can still auto-start on user logon even when Windows service registration is blocked by non-elevated shells.
- Added `npm run doctor:local` to verify Mongo, MySQL, migration readiness, backend health probes, runtime hints, and 500k dataset baseline in one command before demo/viva.
- Added `backend:local:*` and `stack:local:*` wrappers so local backend and the full Mongo+backend stack can be started/stopped/status-checked without ad-hoc terminal commands.
- Re-ran `npm run doctor:local` after the local runtime wrappers and confirmed `status=healthy` on the 500k baseline with Mongo autostart present, MySQL required migrations satisfied, and backend `/api/health/live` + `/api/health/ready` both returning `200`.
- Backend review verdict for the current repo state: no new functional blocker remains for coursework/demo; remaining improvements are non-blocking polish only (elevated Windows service install for Mongo if desired, stronger static linting, broker-grade middleware only if intentionally over-scoping past coursework).
- Tightened dashboard CSV export once more so benefits-context exports skip `EarningsEmployeeYear` lookups unless `minEarnings` is actually active, and locked that behavior with an additional controller regression test.
- Upgraded backend quality gate from syntax-only linting to a two-stage contract: `lint:syntax` plus `lint:static` via ESLint, using a narrow runtime-safety rule set (`no-undef`, `no-unreachable`, `no-dupe-keys`, `no-self-assign`, `no-constant-condition`) that matches the current repo maturity.
- Expanded that ESLint runtime-safety baseline with `no-unused-vars` and `no-empty`, then cleaned the actual findings it exposed in scripts/controllers/routes instead of suppressing them.
- Extended the same lint baseline further with `eqeqeq` and `no-useless-catch`; current backend code already satisfies both, so the gate is stricter without introducing new cleanup churn.
- Stabilized the advanced availability gate so the health-endpoint latency check warms the app first and evaluates a short sample window, reducing false negatives from one-off local timing spikes while still enforcing a fast health path.
- Added `npm run verify:backend` so the existing local-runtime doctor, lint, tests, migration status, and production dependency audit can be run in one repeatable pre-demo/pre-submit command instead of a manual checklist.
- Added `dashboard`-level `verify:frontend` and root `verify:all` so the full stack can now be validated from repo root with one command before demo or submission.
- Completed `D:\SIP_CS 2\Vision_Group11.md` using the original Vision template structure, but replaced the placeholder content with the actual Group 11 solution direction, implemented architecture, demo flow, and reproducibility steps that match the current codebase.
- Added a separate presentation/demo script at `D:\SIP_CS 2\SIP_CS\docs\demo\slide\group11_slide_demo_script_vi.md`, then simplified it further to match the real 3-member team split (Bang, Khiem, Hoa) with shorter and more natural Vietnamese speaking lines.
- Simplified the dashboard FE for demo clarity: softened action-center wording, renamed the alert detail area, and reduced drilldown clutter by collapsing saved views and optional filters behind explicit toggles.
- Changed drilldown pagination copy to emphasize the current filtered result window (`Showing X-Y of Z matching employees`) instead of foregrounding huge page counts, which reads better on the 500k dataset during demo.
- Rebalanced drilldown layout for readability: widened the modal, reduced filter chrome, kept presets on a tighter horizontal row, and gave the data table a larger share of the viewport so drilldown feels like a review surface instead of a small pop-up.

## Recent Fixes (2026-04-06)
- Added admin-facing employee CRUD support to the frontend dashboard via `dashboard/src/components/AdminEmployeesModal.jsx`, so admin/super-admin users can create, edit, and delete HR source records without leaving the dashboard.
- Added `Manage Employees` entry point in `dashboard/src/pages/Dashboard.jsx`; it sits alongside existing admin/operator tools instead of overloading the executive drilldown flow.
- Added employee admin API helpers in `dashboard/src/services/api.js` (`getEmployeesPage`, `getEmployeeEditorOptions`, `createEmployeeRecord`, `updateEmployeeRecord`, `deleteEmployeeRecord`).
- Extended backend employee contract with optional list search (`search` over `employeeId`, `firstName`, `lastName`) and a new admin helper endpoint `GET /api/employee/options` that returns department ids plus enum options for employee forms.
- Updated backend OpenAPI bundle and regression tests so the employee admin helper route and search parameter are documented and covered by contract tests.
- Added frontend regression coverage for the new employee admin modal and dashboard button visibility to make sure the CRUD path stays available for admin users.

## Case Study 2: The Dashboard

### Status: COMPLETE

### Requirements Checklist

#### CEO Memo Requirements
- [x] Total earnings by shareholder, gender, ethnicity, PT/FT, department (YTD + previous year)
- [x] Total vacation days by shareholder, gender, ethnicity, PT/FT (YTD + previous year)
- [x] Average benefits paid to shareholders vs non-shareholders by plan
- [x] Drill-down capability from summary to details
- [x] Alert: Employee within N days of hiring anniversary
- [x] Alert: Employee with excessive vacation accumulation
- [x] Alert: Benefits plan changes affecting payroll
- [x] Alert: Employees with birthdays in current month

#### Implementation Status
| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard Summary Cards | DONE | 4 KPI cards |
| Earnings Chart | DONE | By department with drill-down |
| Vacation Chart | DONE | By demographics |
| Benefits Chart | DONE | Shareholder vs Non-shareholder |
| Alerts Panel | DONE | 4 alert types with preview |
| Alert Acknowledgement | DONE | Category-level owner/note/timestamp workflow with stale re-review cue |
| Alert Follow-up Queue | DONE | Dashboard rail prioritizes unassigned/stale alerts and quick-opens detail modal |
| Dashboard Backend Contract | DONE | Shared validation + `{ success, data, meta }` contract hardening for dashboard/alerts endpoints |
| Executive Brief Snapshot | DONE | Backend-owned action center + follow-up queue contract via `/api/dashboard/executive-brief` |
| Integration Operator Contract | DONE | Validation + operator metadata + authz regression for retry/replay/recover/list APIs |
| API Request Tracing | DONE | Shared middleware emits `x-request-id` and injects `requestId` into meta/error contracts for dashboard/alerts/integration/auth paths |
| Integration Operator Audit Trail | DONE | `integration_events` stores actor/request/action/time for retry/replay/recover; readiness enforces required audit migration |
| Integration Operator Audit History | DONE | `integration_event_audits` preserves per-event retry/replay/recover history and is readable via admin API |
| End-to-End Sync Correlation Trace | DONE | Employee mutation responses expose `sync.correlationId`; backend preserves it through outbox/direct fallback and `sync_log` via migration `20260402_000004_integration_correlation_trace` |
| Sync API Contract Hardening | DONE | `/api/sync/status`, `/logs`, `/retry`, `/entity/:type/:id` now use canonical envelope, boundary validation, and correlation-aware log filters |
| Employee Read Contract Hardening | DONE | `GET /api/employee/:employeeId` now honors business employeeId, list/detail responses carry canonical metadata, and legacy Mongo-id callers still work |
| OpenAPI Contract Bundle | DONE | `GET /api/contracts/openapi.json` now exposes backend-owned OpenAPI 3.1 JSON for FE/operator consumers |
| Drilldown Modal | DONE | Pagination + search + preset library + saved views + benefits plan filter |
| Jump to Page | DONE | Added 2026-01-23 |
| Alert Config UI | DONE | `moderator/admin/super_admin` configurable; alert summaries refresh ngay trong session hiện tại, còn batch schedule vẫn giữ vai trò baseline cho aggregate toàn cục |

#### Current Increment Notes
- `benefits_change` no longer stops at "recent change"; alert detail now carries payroll-impact context (plan, annual paid amount, effective date, change date).
- Alert Settings copy updated to match real behavior: saving refreshes current dashboard alert summaries immediately.
- Added `docs/demo/live/openapi_try_it_out_demo_vi.md` as the dedicated Swagger/OpenAPI demo script, including safe routes, request bodies, response samples, and what each route is proving during demo.
- Reworked `docs/demo/live/demo_end_to_end_talk_track_vi.md` so the direct demo now has a separate run order with real response examples, auth/role explanation, and backup/recovery talking points.
- Added `docs/demo/slide/demo_role_split_talk_track_vi.md` to split the live presentation across Bang, Khiem, and Hoa while keeping the same builder-focused voice and clear hand-off cues between speakers.
- Replaced `docs/demo/slide/group11_slide_demo_script_vi.md` with a slide-only master script; direct demo steps are no longer mixed into the slide flow.
- Added `docs/demo/support/demo_qa_defense_vi.md` as the dedicated Q&A/defense sheet for likely teacher questions; it covers architecture choices, why local runtime was chosen, why the team does not claim ACID or Kafka/RabbitMQ, dashboard/backend contract rationale, data-scale/export decisions, and honest backup/recovery positioning.
- Added `docs/demo/support/system_operation_builder_explainer_vi.md` as the detailed builder-oriented explainer for how the system operates end-to-end; it now also includes clear auth/role, response-shape, and backup/recovery explanation in addition to source-of-truth, read model, outbox, worker, and consistency.
- Expanded `docs/demo/support/system_operation_builder_explainer_vi.md` into a more operational handbook style: it now distinguishes seed/export/worker batch concepts, lists tunable parameters with their source files, includes concrete code snippets, and explains the system impact of changes such as increasing seed batch size from `5000` to `10000`.
- Added `docs/demo/support/tunables_cheat_sheet_vi.md` as a one-file quick reference for code-level test knobs. It covers `SEED_BATCH_SIZE`, `SEED_TOTAL_RECORDS`, `profile`, `OUTBOX_POLL_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_ATTEMPTS`, `OUTBOX_PROCESSING_TIMEOUT_MS`, `exportBatchSize`, `LOCAL_DATASET_TARGET`, plus the exact “what happens if this is increased or decreased” framing the team should use on the spot.
- Added `Memory/Context/sip_course_alignment_notes.md` as the persistent “SIP lens” for future doc rewrites. It maps the course material in `SystemIntegrationPractics` to this codebase: why integrate, presentation/data/functional integration, consistency requirements, middleware vs practical outbox/worker design, reliability/recovery, security integration, and the exact claims the team should or should not make during demo/viva.
- Rewrote the main demo-prep docs with a clearer SIP-course narrative. The updated slide script, end-to-end talk track, role split, Q&A, operational explainer, tunables sheet, and OpenAPI test guide now consistently use course-aligned language such as `management information`, `exception reporting`, `presentation/data/functional integration`, `eventual consistency`, and `reliable and recoverable systems`, while keeping the tone closer to a student team defending trade-offs rather than a product brochure.
- Ran a second “teacher-hearing” pass on the SIP-aligned docs. The master slide/demo script was shortened and made more conversational, while the technical explainer was intentionally kept denser as the team’s fallback document for deep architecture, consistency, queue, and tunable-parameter questions.
- Added a generated Postman demo kit for the current backend:
  - `sip_cs_postman_collection.json`
  - `sip_cs_demo_local.postman_environment.json`
  - generator script `scripts/generate-postman-assets.js`
  - npm command `npm run postman:generate`
- The Postman collection now includes a `0. Demo Safe Flow` folder plus all main backend groups: Auth, Users, Health, Products, Employee, Dashboard, Alerts, Integrations, Sync, and Contracts.
- Added `docs/demo/live/postman_demo_guide_vi.md` to capture:
  - import order
  - safe demo request sequence
  - optional deep-dive requests
  - mutation/destructive requests that should be avoided during the main classroom demo
  - per-API explanations for what each route is used for, whether it should be tested live, and what result should be expected
- Verified local compatibility for the generated Postman kit with:
  - `GET /api/health/ready` => `200`
  - `POST /api/auth/signin` using `admin@localhost / admin_dev` => `200`
  - `GET /api/dashboard/executive-brief?year=2026` => `200`
- Rewrote `Vision_Group11.md` to make it closer to a proper Vision document instead of a mixed vision/runbook:
  - removed demo-step and rebuild-step style content from the vision itself
  - made the language clearer for non-technical readers
  - kept the document aligned with the implemented system direction without turning it into a low-level implementation report
  - updated the cover identity to `Group 11 / HR & Payroll Analytics for CEO Memo`
- Refilled `D:\\SIP_CS 2\\Vision_Group11.md` directly inside the original RUP-style Vision template instead of replacing the template structure.
- Kept the original section order and headings intact, then replaced placeholder text with project-specific content for Group 11's `HR & Payroll Analytics for CEO Memo`.
- Standardized the completed Vision cover to `Group 11 - HR & Payroll Analytics for CEO Memo`, `Vision`, `Version 1.0`.
- Repositioned the Vision document at the right abstraction level: stakeholder value, scope, assumptions, capability summary, constraints, and documentation requirements, without turning it into a demo script or runbook.
- Reorganized all demo-prep docs into `docs/demo/slide`, `docs/demo/live`, and `docs/demo/support` so the team can separate slide preparation, direct live demo flow, and deeper technical defense.
- Added `docs/demo/README_vi.md` and rewrote `docs/demo_preparation_guide_vi.md` so the team now has one clear map of which file to read first, which file belongs to each speaker, and which file to open when the lecturer asks about auth, role, queue, tunables, or recovery.

#### API Endpoints
- [x] `GET /api/dashboard/earnings`
- [x] `GET /api/dashboard/vacation`
- [x] `GET /api/dashboard/benefits`
- [x] `GET /api/dashboard/drilldown`
- [x] `GET /api/alerts/triggered`
- [x] `GET /api/alerts/:type/employees`
- [x] CRUD `/api/alerts` (role-gated config API for moderator/admin/super-admin)

---

## Case Study 3: Integrated System

### Status: IMPLEMENTED AT EVENTUAL-CONSISTENCY LEVEL

### Implementation Summary
- **Sync Service**: Eventual consistency pattern with retry mechanism
- **SyncLog Table**: Tracks all sync operations (PENDING/SUCCESS/FAILED)
- **Employee Controller**: Integrated sync on CREATE/UPDATE/DELETE
- **Monitoring API**: `/api/sync/status`, `/api/sync/logs`, `/api/sync/retry`

### Documentation
- `docs/case_study_3_data_consistency.md` - Data flow & failure scenarios
- `docs/case_study_3_test_plan.md` - 7 test cases

### Focus Areas Addressed in Current Increment
- [x] Data consistency strategy
- [x] Near real-time sync design
- [x] Sync orchestration
- [x] Failure scenarios documentation

### Extras (Beyond Requirements)
- [x] **Frontend User Registration**: Added `/register` page and API
- [x] **DevOps Readiness**: Added `/health` endpoints and `.env.example`
- [x] **QA Foundation**: Added Jest framework and API tests
- [x] **Security Hardening**: Removed default secrets, restricted dev bypass

---

## Case Study 4: Fully Integrated System

### Status: PARTIAL IMPLEMENTATION (Outbox + Worker + Admin Monitor + stale-processing recovery path)

### Focus Areas
- [x] Outbox integration events
- [x] Worker + retry/backoff
- [x] DLQ replay (admin replay filters + UI)
- [x] Scalable architecture design (documented)
- [x] Extensibility for new systems (ServiceRegistry + adapters)
- [x] Middleware-centric design (Outbox/Worker + integration routes)
- [ ] Enterprise broker implementation (Kafka/RabbitMQ) - design only

---

## Case Study 5: Network Integration

### Status: Design completed / Implementation pending

### Focus Areas
- [x] Network architecture diagram (ASCII)
- [x] Security baseline checklist
- [x] Backup and recovery plan (docs + templates)
- [x] DR rehearsal evidence (safe run report)
- [x] Availability strategy (docs)

---

## Recent Fixes (2026-04-06)

- [x] Reworked `Employee Source Manager` to behave more like a drilldown workspace: table-first layout, wider data view, server-side search/filter/pagination, and editor panel opened only on demand.
- [x] Restricted employee source mutations to `super_admin` only on both FE and BE. The dashboard button is now `super_admin` only, and `/api/employee/options`, `POST /api/employee`, `PUT /api/employee/:id`, `DELETE /api/employee/:id` are protected by `isSuperAdmin`.
- [x] Extended employee list query contract with `departmentId` and `employmentType` so the source manager can filter large HR datasets without loading broad pages client-side.
- [x] Smoothed `Employee Source Manager` interactions by isolating the table and editor into separate memoized panels, keeping form draft state local to the editor, and reducing expensive modal repaint work from overlay blur and shared layout recalculation.
- [x] Fixed `Alert Review` visual imbalance by removing the shrink-to-fit summary dock and replacing the alert detail row-based grid with two stacked columns. Root cause was CSS grid row coupling: shorter cards left dead space under their column neighbor. The detail board now uses a full-width summary band plus independent alert columns, so card heights no longer create large visual gaps.
- [x] Added backend request throttling with per-scope in-memory rate limiters in `src/middlewares/rateLimit.js`. Auth is capped at 10 requests/minute, dashboard reads at 30/minute, dashboard exports at 6/minute, and admin write operations at 10/minute. The limiter returns the normal API error envelope plus `RateLimit-*` and `Retry-After` headers.
- [x] Wired the new rate limiters into `auth.routes.js`, `dashboard.routes.js`, `alerts.routes.js`, `employee.routes.js`, `user.routes.js`, `integration.routes.js`, and `sync.routes.js`. Added `rateLimit.middleware.test.js` and global limiter resets in `src/__tests__/setup.js` so the suite stays deterministic.
- [x] Added a shared FE toast layer with `ToastProvider` and `ToastViewport`, then integrated it into login/register, auth expiry handling, employee/user admin actions, alert settings, alert acknowledgements, and integration retry/replay/recovery flows. Result: success/error feedback is now consistent and no longer depends only on inline messages that users can miss.
- [x] Added an env-gated dashboard aggregation scheduler in `src/workers/dashboardAggregationWorker.js` and started it from `src/index.js`. The worker reuses the existing `scripts/aggregate-dashboard.js` batch job by spawning it on an interval, so summary tables now have an optional runtime refresh path instead of relying only on manual script runs or external cron.
- [x] Promoted `currentYear` in `dashboard/src/hooks/useDashboardData.js` from a hard-coded value to real shared state, then added `AnalyticsFilterBar` on `AnalyticsPage`. Year changes now trigger true data refetches, while department scope is applied honestly to drilldown launches only, because the current summary endpoints do not yet support department-scoped aggregate queries.
- [x] Added structured client-side validation to `dashboard/src/components/AdminEmployeesModal.jsx`. The source manager now blocks invalid submissions before they hit the API, highlights broken fields inline, and covers the most obvious data-quality rules: required employee ID/first name, valid date parsing, birth-date-before-hire-date ordering, and non-negative numeric inputs for vacation/pay fields. Regression coverage was added in `AdminEmployeesModal.test.jsx`.
- [x] Reworked `OverviewPage` information hierarchy so the first screen now reads as `Current status -> Core metrics -> Next actions` instead of three equally weighted card bands. The executive brief now uses descriptive metric values and notes (for example, `3 stale datasets` or `No failed loads`) rather than bare counters, and quick navigation cards lead with concrete numbers such as affected employees, actionable events, and payroll YTD. `formatCurrencyCompact()` now supports billions, so the top payroll KPI reads naturally as `$50.4B` instead of `$50359.9M`.
- [x] Tightened `Alert Review` again after the multi-page refactor. The left follow-up queue now uses denser operator-style copy (`employees + owner + action state`) instead of long descriptive blocks, the alert detail area gets more width than the queue, and the detail summary dock no longer repeats a separate `Active Categories` KPI that already exists in the page header. This removed a real CSS syntax bug in `Dashboard.css`, reduced visual duplication, and made the page read more like `queue on the left, scope and impact on the right`.
- [x] Normalized FE error handling and empty-state guidance. `Login`, `AnalyticsPage`, and `DrilldownModal` now all use the shared `getErrorMessage()` helper instead of parsing Axios responses ad hoc. `ChartsSection` empty states now include explicit recovery actions (`Refresh Earnings`, `Refresh Time Off`, `Refresh Benefits`) so a blank panel no longer leaves the user without a next step.
- [x] Fixed auth CTA visibility and consistency on `Login` / `Register`. Footer links are no longer plain inline text that can disappear into the layout; both pages now use visible CTA pills, and the register submit button uses the same icon + content structure as the login submit button so the primary action reads like a real button instead of bare text.
- [x] Simplified `OverviewPage` again by removing the standalone `Snapshot signals` band and moving those checkpoints into the `Next actions` panel. The page now reads in a tighter order: `Presentation status -> Business impact -> Where to go next`, which reduces one whole layer of repeated labels and makes the hero + KPI + navigation relationship clearer.
- [x] Tightened auth CTA styling and overview copy density again. `Login` / `Register` now use a true action gradient for the primary button instead of the white dashboard header gradient, so `Sign In` and `Create Account` are visually obvious again. The auth brand panels were shortened, the login helper row was reduced to a single `Forgot password?` action, and `Overview` quick-nav cards now lead with one clear title + one metric instead of stacked explanatory text.
- [x] Simplified `Overview` one more pass by removing the duplicated right-column status stack entirely. `Next steps` now contains only route cards, and the compact quick-nav cards were restructured into a simpler flow: label + metric, title + one summary line, then one short supporting chip plus CTA. This makes the page read more like `status at the top, totals on the left, next page to open on the right`.
- [x] Hardened backend auth/session runtime. Added refresh-token rotation with `httpOnly` cookie support in `auth.controller.js` and `/api/auth/refresh`, while keeping the legacy response-body access token so the current FE does not break. Guard logic in `authJwt.js` now rejects refresh tokens as access tokens and only allows stateless JWT fallback in explicit `development/test` demo mode.
- [x] Tightened backend startup configuration. `config.js` now refuses weak production auth settings such as missing `REFRESH_SECRET`, `REFRESH_SECRET === SECRET`, or insecure refresh cookies, and auth seeding now requires an explicit `ADMIN_PASSWORD` outside `development/test` instead of silently falling back to `admin_dev`.
- [x] Strengthened backend auth validation. Signup now requires at least 8 characters for passwords, rejects overly permissive email formats like `a@b.c`, and both static and instance `User.comparePassword()` paths fail closed when bcrypt errors instead of returning undefined behavior. Added regression coverage for these contracts.
- [x] Hardened backend dashboard caching. `src/utils/cache.js` now enforces TTL-based background pruning, a bounded entry count with simple LRU-style eviction, and documented env knobs (`DASHBOARD_CACHE_TTL_MS`, `DASHBOARD_CACHE_MAX_ENTRIES`, `DASHBOARD_CACHE_SWEEP_INTERVAL_MS`). Added `cache.util.test.js` to cover expiry, overflow eviction, and background sweep behavior.
- [x] Tightened signup prechecks and session semantics. `/api/auth/signup` now actually runs `checkExistingRole`, malformed/unknown `roles` inputs fail fast with the canonical 422 envelope, and signup no longer writes an access token into `User.tokens` because it does not establish a logged-in session.
- [x] Made backend auth token persistence session-aware. `User.tokens` entries now carry `sessionId`, signin appends a bounded set of active sessions instead of overwriting all tokens, refresh rotates only the current session while preserving unrelated sessions, and logout clears the full matching session rather than removing just one token string.
- [x] Hardened refresh-token behavior further. Invalid or revoked refresh attempts now clear the stale refresh cookie, and refresh rotation keeps the same `sessionId` for the active session instead of silently turning every refresh into a brand-new session lineage.
- [x] Centralized auth session-token lifecycle helpers in `src/utils/authSessionTokens.js`. `auth.controller.js` and `authJwt.js` now share the same prune/merge/session-key logic, so signin/refresh/logout and token verification cannot drift on what counts as an active persisted session. Also removed one redundant `User.findById()` from RBAC checks by reusing the user document already loaded in `verifyToken`.
- [x] Formalized drilldown CSV export batching as an explicit runtime contract. `dashboard.controller.js` now reads `DRILLDOWN_EXPORT_BATCH_SIZE` from `config.js` instead of using an inline `1000`, `.env.example` documents the knob, and the dashboard controller/runtime hardening tests lock the expectation that SQL earnings lookups stay chunked rather than reverting to a whole-year preload.
- [x] Hardened dashboard aggregation worker shutdown. `dashboardAggregationWorker.js` now `unref()`s its interval, waits for an active child process to exit on shutdown, and escalates from `SIGTERM` to `SIGKILL` after the new `DASHBOARD_AGGREGATION_STOP_TIMEOUT_MS` timeout. `index.js` now awaits worker shutdown before closing the HTTP server, so background aggregation no longer risks leaving a hanging child process on exit.
- [x] Hardened outbox worker shutdown too. `integrationEventWorker.js` now tracks its active iteration promise, `unref()`s the polling interval, and waits up to `OUTBOX_STOP_TIMEOUT_MS` during shutdown before warning and continuing. `index.js` now awaits this worker as well, so HTTP shutdown no longer races a still-running outbox iteration.
- [x] Fixed backend startup sequencing. `src/index.js` no longer starts listening before runtime initialization completes: MongoDB connection, auth seed, MySQL schema init, adapter registry, and workers are now all part of an awaited bootstrap path. `src/database.js` exports `connectMongo()` instead of a side-effect import that swallowed connection errors, and `src/libs/initialSetup.js` no longer auto-runs auth seeding at import time. This closes the old footgun where the API could accept traffic while core systems were still booting or Mongo/auth seed had already failed in the background.
- [x] Made drilldown CSV export batching even more explicit for reviewability. `dashboard.controller.js` now routes per-batch SQL earnings lookup through `buildEarningsLookupForExportBatch()` and per-batch benefits lookup through `buildBenefitLookupForExportBatch()`, with an inline note that export stays memory-bounded by streaming Mongo rows and resolving SQL lookups only for the current employee chunk. This does not change the contract; it makes the already-chunked export path harder to misread as a whole-year preload.
- [x] Benchmarked the real CSV export path on the local 500k dataset using `scripts/benchmark-export-csv.js` (`npm run benchmark:export:csv`). Measured results on 2026 data: unfiltered earnings export streamed ~500,001 rows / 33.31 MB in 24.13s with only +22.37 MB peak RSS on the backend process; `minEarnings=100000` exported 237,778 rows / 15.90 MB in 19.82s with +3.65 MB peak RSS; unfiltered benefits export streamed ~500,001 rows / 32.14 MB in 32.05s with +8.96 MB peak RSS. Conclusion: export is working and memory-bounded; the repeated review finding about preloading a whole earnings year into memory is outdated for the current code path, even though the end-to-end wall time for 500k-row exports is still in the tens of seconds.
- [x] Optimized backend drilldown latency without breaking data consistency. `getDrilldown()` now auto-downgrades only genuinely expensive filtered summaries to `fast` once the result set exceeds the new `DRILLDOWN_FULL_SUMMARY_MAX_COUNT` threshold, but it keeps large single-dimension filters on the cheap pre-aggregated summary path. For `minEarnings`-only queries, the controller now first compares a Mongo snapshot count (`annualEarningsYear + annualEarnings`) against the SQL earnings count; if they match, it uses the indexed Mongo snapshot filter directly, otherwise it falls back to the older SQL-ID-list path. Local timing after this change: `minEarnings=100000` dropped from ~4.62s to ~1.84s, and a multi-filter drilldown (`gender + employmentType + shareholder`) dropped from ~3.65s to ~0.42s, while the large single-filter case (`gender=Female`) stayed on `summaryMode=full`, `summarySource=pre-aggregated`, and remained ~0.34s.
- [x] Tightened backend employee search so interactive list/drilldown lookups are index-friendly again. Added `buildEmployeeSearchQuery()` in `src/utils/employeeSearch.js` and switched both `employee.controller.js` and `dashboard.controller.js` off the old unanchored `contains anywhere` regexes. Search now uses exact/prefix matches for `employeeId`, `firstName`, and `lastName`, with supporting indexes on `Employee.firstName` and `Employee.lastName`. Local timing after restart: `/api/employee?...&search=amy` dropped from ~1.42s to ~0.06s, non-existent search to ~0.01s, and `/api/dashboard/drilldown?...&search=Amy` to ~0.05s.
- [x] Optimized drilldown CSV export throughput further while keeping the path memory-bounded. `exportDrilldownCsv()` now reuses Mongo earnings snapshots when they are valid for the requested year, only hits SQL earnings for the subset of employee IDs that actually need lookup, writes CSV rows in buffered chunks instead of one `res.write()` per row, and raises the default `DRILLDOWN_EXPORT_BATCH_SIZE` to `5000`. Re-benchmark on the 500k dataset after restart: `earnings-full-snapshot` improved from ~24.13s to ~19.99s, `earnings-min-100k` from ~19.82s to ~18.84s, and `benefits-full-snapshot` from ~32.05s to ~22.00s. The trade-off is higher transient RSS on the first large earnings export, so this path is now clearly throughput-oriented rather than minimal-memory-oriented.
- [x] Audited live interactive backend latency after the drilldown/search/export work. Current local timings are roughly: executive brief `~54ms`, earnings `~13ms`, vacation `~12ms`, benefits `~312ms`, alerts triggered `~579ms` before the latest alert preview refactor, integration metrics `~12ms`, base drilldown `~218ms`, search drilldown `~21ms`, multi-filter drilldown `~354ms`, and `minEarnings` drilldown `~1.09s`. Conclusion: the old `10–12s` complaint no longer matches interactive dashboard APIs; the remaining multi-second path is bulk CSV export of hundreds of thousands of rows.
- [x] Refactored `getTriggeredAlerts()` to fetch preview employees with one SQL window-function query instead of one query per alert type, while keeping a safe Sequelize fallback if the optimized query fails. Cold-path latency still depends on process/cache warmup, but the cached path stays in the low tens of milliseconds, and the controller no longer fans out separate preview queries for each active alert category.
- [x] Hardened HTTP shutdown orchestration in `src/index.js`. Backend shutdown now stops both workers via `Promise.allSettled()`, then waits for `server.close()` with the new `SERVER_SHUTDOWN_TIMEOUT_MS` guard and uses `closeIdleConnections()` / `closeAllConnections()` as a fallback for hung keep-alive connections. This makes the process exit path much less dependent on perfect client behavior during deploy/restart.
- [x] Removed the last hardcoded auth session cap. `src/utils/authSessionTokens.js` now uses `AUTH_MAX_PERSISTED_SESSIONS` from `src/config.js` instead of a baked-in `5`, and `.env.example` documents the knob. This keeps the current bounded-session behavior but makes it explicit and easier to tune without changing code.
- [x] Tightened startup behavior when MySQL is unavailable in non-production. `src/index.js` still allows the API shell to start for local diagnosis, but it no longer starts the MySQL-dependent outbox worker or dashboard aggregation worker in that state. This avoids pointless error loops and makes the degraded-mode startup less noisy and more honest.
- [x] Removed another small runtime magic number: manual sync retry now uses `SYNC_RETRY_BATCH_LIMIT` from `src/config.js` instead of a hardcoded `100` inside `src/services/syncService.js`. `.env.example` documents the knob, so operators can tune retry breadth without editing code.


