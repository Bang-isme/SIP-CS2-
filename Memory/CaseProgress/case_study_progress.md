# Case Study Progress

> Last Updated: 2026-04-03T14:45:00+07:00

## Current Stage: Case Study 4 - PARTIAL IMPLEMENTATION

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


