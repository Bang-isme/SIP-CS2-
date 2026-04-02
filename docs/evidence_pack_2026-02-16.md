# Evidence Pack - 2026-02-16 (Updated 2026-03-19)

## 1) Scope

Audit + hardening cho CEO memo flow và Case Study 1-5:
- correctness
- role separation
- queue recovery path
- docs/test alignment
- production-dependency audit hygiene

## 2) Code Evidence

Backend:
- `src/controllers/employee.controller.js`
- `src/controllers/alerts.controller.js`
- `src/controllers/integration.controller.js`
- `src/services/alertAggregationService.js`
- `src/services/integrationEventService.js`
- `src/services/syncService.js`
- `src/middlewares/authJwt.js`
- `src/routes/alerts.routes.js`
- `src/routes/employee.routes.js`
- `src/routes/integration.routes.js`
- `src/utils/benefitsPayrollImpact.js`
- `src/__tests__/employee.controller.behavior.test.js`
- `src/__tests__/alerts.routes.authz.test.js`
- `src/__tests__/alerts.controller.behavior.test.js`
- `src/__tests__/integration.controller.behavior.test.js`
- `src/__tests__/integrationEventService.recovery.test.js`
- `src/__tests__/benefitsPayrollImpact.test.js`
- `tests/advanced/quality.test.js`

Frontend:
- `dashboard/src/pages/Dashboard.jsx`
- `dashboard/src/components/AlertSettingsModal.jsx`
- `dashboard/src/components/AlertsPanel.jsx`
- `dashboard/src/components/DrilldownModal.jsx`
- `dashboard/src/components/IntegrationEventsPanel.jsx`
- `dashboard/src/utils/benefitsImpact.js`
- `dashboard/src/pages/Dashboard.test.jsx`
- `dashboard/src/components/AlertsPanel.test.jsx`
- `dashboard/src/components/IntegrationEventsPanel.test.jsx`
- `dashboard/src/components/DrilldownModal.test.jsx`

Docs:
- `docs/ceo_memo_acceptance_matrix.md`
- `docs/case_study_guide.md`
- `docs/known_gaps_2026-02-21.md`
- `docs/operations_checklist_ceo_memo.md`

## 3) Commands Run and Results (2026-03-19)

Backend:
1. `npm run lint` -> PASS
2. `npm test` -> PASS
3. `npm run test:advanced` -> PASS
4. `npm audit --omit=dev --json` -> PASS (`0 vulnerabilities`)

Frontend (`dashboard/`):
1. `npm run lint` -> PASS
2. `npm test` -> PASS
3. `npm run build` -> PASS
4. `npm audit --omit=dev --json` -> PASS (`0 vulnerabilities`)

Advisory scans:
1. `accessibility_check.py --level AA` -> PASS (`0 issue`, score `100`)
2. `security_scan.py` -> warnings remain, no critical blocker in current coursework scope
3. `ux_audit.py` -> advisory issues remain (non-blocking)

## 4) Contract and Policy Verifications

- Signup privilege escalation vẫn bị chặn: request role cao hơn vẫn không tự lấy quyền.
- Employee write endpoints vẫn yêu cầu `admin/super_admin`.
- Alert configuration hiện được tách quyền đúng hơn:
  - `moderator/admin/super_admin` quản lý alert rules
  - `admin/super_admin` quản lý integration recovery path
- Employee mutation response hiện phản ánh rõ `sync.status`, `mode`, `consistency`, `requiresAttention`.
- Integration queue có stale-`PROCESSING` recovery path ở API và UI.
- `benefits_change` hiện mang payroll-impact metadata, không còn chỉ là “recent change”.

## 5) Known Residual Risks (Truthful)

- Hệ thống vẫn là eventual consistency, không phải strict ACID/2PC xuyên nhiều database.
- Case 4 vẫn là middleware-lite, chưa có broker-grade stack.
- Full workspace `npm audit` vẫn có backlog ở dev tooling, dù production dependencies đã sạch.
- UX static audit vẫn còn advisory warnings.

## 6) Readiness Verdict

- Ready cho demo/coursework defense ở mức production-like.
- Không nên dùng evidence pack này để claim enterprise production readiness.
