# Evidence Pack - 2026-02-16 (Updated 2026-04-15)

> Historical hardening summary only.
> For the latest live demo proof bundle, use `docs/demo/evidence/2026-04-16/README.md`.

## 1. Scope

Audit and hardening evidence for:

- CEO memo flow
- Case Study 2 dashboard readiness
- Case Study 3 runtime split and consistency story
- Case Study 4 queue recovery path
- docs/test alignment
- production dependency audit hygiene

---

## 2. Code Evidence

### Backend

- `src/sa-server.js`
- `src/payroll-server.js`
- `src/dashboard-server.js`
- `src/runtime/serviceRuntime.js`
- `src/controllers/employee.controller.js`
- `src/controllers/alerts.controller.js`
- `src/controllers/integration.controller.js`
- `src/controllers/payroll.controller.js`
- `src/services/alertAggregationService.js`
- `src/services/integrationEventService.js`
- `src/services/syncService.js`
- `src/services/payrollMutationService.js`
- `src/adapters/payroll.adapter.js`
- `src/middlewares/authJwt.js`
- `src/routes/alerts.routes.js`
- `src/routes/employee.routes.js`
- `src/routes/integration.routes.js`
- `src/routes/payroll.routes.js`
- `src/utils/benefitsPayrollImpact.js`
- `src/__tests__/employee.controller.behavior.test.js`
- `src/__tests__/integration.controller.behavior.test.js`
- `src/__tests__/integrationEventService.recovery.test.js`
- `src/__tests__/payroll.mutation.service.test.js`
- `src/__tests__/local.stack.contract.test.js`
- `tests/advanced/quality.test.js`

### Frontend

- `dashboard/src/pages/Dashboard.jsx`
- `dashboard/src/components/AlertSettingsModal.jsx`
- `dashboard/src/components/AlertsPanel.jsx`
- `dashboard/src/components/DrilldownModal.jsx`
- `dashboard/src/components/IntegrationEventsPanel.jsx`
- `dashboard/src/utils/benefitsImpact.js`
- `dashboard/src/hooks/useDashboardData.js`
- `dashboard/src/pages/Dashboard.test.jsx`
- `dashboard/src/components/AlertsPanel.test.jsx`
- `dashboard/src/components/IntegrationEventsPanel.test.jsx`
- `dashboard/src/components/DrilldownModal.test.jsx`

### Scripts and Docs

- `scripts/verify-case3-stack.js`
- `scripts/prepare-dashboard-demo.js`
- `docs/ceo_memo_acceptance_matrix.md`
- `docs/case_study_guide.md`
- `docs/case_study_3_test_plan.md`
- `docs/operations_checklist_ceo_memo.md`

---

## 3. Commands Run and Results (2026-04-15)

Backend:

1. `npm run lint` -> PASS
2. `npm test` -> PASS
3. `npm run test:advanced` -> PASS
4. `npm audit --omit=dev --json` -> PASS (`0 vulnerabilities`)
5. `npm run verify:backend` -> PASS
6. `npm run verify:case3` -> PASS

Frontend (`dashboard/`):

1. `npm run lint` -> PASS
2. `npm test` -> PASS
3. `npm run build` -> PASS
4. `npm audit --omit=dev --json` -> PASS (`0 vulnerabilities`)
5. `npm run verify:frontend` -> PASS

Advisory scans:

1. `accessibility_check.py --level AA` -> advisory only, not a blocker in current coursework scope
2. `security_scan.py` -> warnings remain, no critical blocker in current coursework scope
3. `ux_audit.py` -> advisory issues remain, non-blocking

---

## 4. Contract and Policy Verifications

- Signup privilege escalation remains blocked.
- Employee write endpoints still require elevated roles.
- Alert configuration remains separated from integration recovery controls.
- Employee mutation responses expose `sync.status`, `mode`, `consistency`, and `requiresAttention`.
- Active queue/outbox ownership is in MongoDB under the SA boundary.
- Payroll write ownership is in Payroll Service through its internal API.
- Integration queue has stale-`PROCESSING` recovery in both API and UI paths.
- `benefits_change` carries payroll-impact metadata and is no longer just a "recent change" signal.
- Dashboard executive brief can now reach:
  - freshness `fresh`
  - `needsAttentionCategories = 0`
  - action center `Ready for Memo`

---

## 5. Known Residual Risks (Truthful)

- The system remains eventual consistency, not strict ACID or 2PC across databases.
- Case 4 remains middleware-lite, not a broker-grade stack.
- Full workspace `npm audit` can still show dev-tooling backlog even when production dependencies are clean.
- UX and security scans still contain advisory items.
- Case 5 remains docs + rehearsal-safe evidence, not a production network rollout.

---

## 6. Readiness Verdict

- Ready for coursework demo defense with a stronger Case 3 story than before.
- Strongest implementation area remains Case Study 2.
- Case Study 3 is now materially more defensible because:
  - the runtime is visibly split
  - the outbox is SA-owned in MongoDB
  - Payroll owns payroll writes
- This evidence pack should not be used to claim enterprise production readiness.
