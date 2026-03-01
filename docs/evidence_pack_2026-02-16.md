# Evidence Pack - 2026-02-21 (File name kept for continuity)

## 1) Scope

Audit + hardening for CEO memo flow and Case Study 1-5 defense:
- Security/correctness blockers
- FE reliability + A11y regression fixes
- DB readiness discipline for production profile
- Test hardening (remove false-pass conditions)

## 2) Code Evidence

Backend:
- `src/libs/initialSetup.js`
- `src/routes/employee.routes.js`
- `src/services/syncService.js`
- `src/models/sql/PayRate.js`
- `src/adapters/payroll.adapter.js`
- `src/mysqlDatabase.js`
- `src/index.js`
- `scripts/migrate-mysql.js`
- `scripts/lint-backend.js`
- `src/__tests__/employee.routes.authz.test.js`
- `src/__tests__/sync.retry.status.test.js`
- `src/__tests__/payrate.contract.test.js`
- `tests/advanced/quality.test.js`

Frontend:
- `dashboard/src/components/IntegrationEventsPanel.css`
- `dashboard/src/components/AlertsPanel.jsx`
- `dashboard/src/components/AlertsPanel.css`
- `dashboard/src/components/StatCard.jsx`
- `dashboard/src/pages/Dashboard.jsx`
- `dashboard/src/pages/Dashboard.css`
- `dashboard/src/pages/Dashboard.test.jsx`
- `dashboard/src/components/AdminUsersModal.jsx`

Docs:
- `docs/ceo_memo_acceptance_matrix.md`
- `docs/solutions_overview.md`
- `docs/case_study_3_test_plan.md`
- `docs/known_gaps_2026-02-21.md`

## 3) Commands Run and Results

Backend:
1. `npm run lint` -> PASS  
2. `npm test` -> PASS  
3. `npm run test:advanced` -> PASS  
4. `npm audit --omit=dev --json` -> PASS security threshold (0 critical, 0 high, 1 moderate)

Frontend (`dashboard/`):
1. `npm run lint` -> PASS  
2. `npm test` -> PASS  
3. `npm run build` -> PASS  
4. `npm audit --omit=dev --json` -> PASS (0 vulnerabilities)

Quality-gate scripts:
1. `run_gate.py` -> gate_passed=true
2. `security_scan.py` -> 0 critical, warnings only
3. `accessibility_check.py --level AA` -> 0 issue (score 100)
4. `ux_audit.py` -> advisory issues remain (non-blocking)

## 4) Contract and Policy Verifications

- Signup role escalation blocked: request `roles=["admin"]` still persisted as `["user"]`.
- Employee write endpoints require admin/super-admin role.
- Sync retry no longer writes out-of-enum status (`RESOLVED` removed from runtime path).
- Integration queue access for `super_admin` is preserved in FE tests.
- User management summary counts privileged accounts (`admin` + `super_admin`).

## 5) Known Residual Risks (Truthful)

- `sequelize` currently pulls `lodash@4.17.21` (moderate advisory); no critical/high remaining.
- DB migration strategy is bootstrap-level, not yet a full incremental migration pipeline.
- UX static audit still reports advisory warnings; not blocking current course demo acceptance.

## 6) Addendum - 2026-03-02 (`audit_tmp` Readiness)

Scope decision: freeze implementation at audit-compliance and data-correctness level, avoid new UX scope that is not required by `audit_tmp`.

### 6.1 Audit Criteria Status

| Criteria | Status | Evidence |
|---|---|---|
| CEO memo summary dimensions (earnings/vacation/benefits) | PASS | `GET /api/dashboard/earnings`, `GET /api/dashboard/vacation`, `GET /api/dashboard/benefits` |
| Manage-by-exception alerts (4 types) | PASS | `GET /api/alerts/triggered`, `scripts/aggregate-dashboard.js` |
| Drilldown + `minEarnings` query | PASS | `GET /api/dashboard/drilldown`, integration tests |
| Alerts preview/modal deterministic order | PASS | `src/controllers/alerts.controller.js` (`days_until`, `name`, `employee_id`) |
| Department labels not degraded to `Unassigned` in summaries | PASS | fallback mapping in aggregation/controller |
| Cross-DB consistency | PASS | `node scripts/audit-data.js` -> `SQL Coverage: 100.00%` |

### 6.2 Verification Run (2026-03-02)

1. `npm run lint` -> PASS
2. `npm run test:integration` -> PASS (5/5)
3. `node scripts/audit-data.js` -> PASS
   - `Total MongoDB Employees: 435000`
   - `Total Unique SQL Employee IDs: 435000`
   - `SQL Coverage: 100.00%`
4. SQL alert summary check -> PASS
   - `anniversary:35936`
   - `vacation:50498`
   - `benefits_change:3767`
   - `birthday:36804`
   - `total_affected:127005`

### 6.3 Audit-Safe Delta

- `src/utils/departmentMapping.js`
  - deterministic fallback mapping when Mongo `departments` is empty.
- `scripts/aggregate-dashboard.js`
  - uses fallback department mapping and continues when Mongo quota blocks snapshot writes.
- `src/controllers/dashboard.controller.js`
  - `minEarnings` from SQL `earnings_employee_year`;
  - department resolution fallback; department list remains valid without `departments` documents.
- `src/controllers/alerts.controller.js`
  - stable ordering for preview/modal (`days_until ASC`, `name ASC`, `employee_id ASC`).
- `tests/integration/dashboard.test.js`
  - added checks for `Unassigned` regression and `minEarnings` correctness.

### 6.4 Updated Residual Risks

1. Mongo Atlas quota is still exceeded; write paths may continue in fallback/degraded mode.
2. `departments` collection in Mongo remains empty; deterministic fallback mapping is currently required.
3. Current checkpoint is audit/demo ready, not a claim of full enterprise production hardening.

### 6.5 Readiness Verdict

Ready for `audit_tmp` walkthrough with scope frozen at required case-study outcomes.
