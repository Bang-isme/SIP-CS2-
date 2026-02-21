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
