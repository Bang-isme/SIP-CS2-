# Viva Claim - Evidence Cheatsheet

> Last Updated: 2026-04-17
> Mục đích: mở 1 file là biết nên nói gì, mở file nào nếu bị hỏi sâu, và câu nào tuyệt đối không nên overclaim.

## 1) Cách dùng nhanh trước viva

1. Chọn đúng claim bạn sắp nói.
2. Mở file evidence ở cột `Code chính` nếu giảng viên muốn xem source.
3. Nếu bị hỏi sâu hơn, chuyển sang cột `Test/docs`.
4. Nếu lỡ định nói điều ở cột `Không nên nói`, đổi sang wording ở cột `Cách nói an toàn`.

## 2) Claim -> Evidence -> Safe wording

| Chủ đề | Cách nói an toàn | Code chính | Test/docs | Không nên nói |
|---|---|---|---|---|
| Dashboard CEO Memo | "Nhóm em đã triển khai executive dashboard cho earnings, vacation, benefits, alerts, drilldown và export CSV." | `scripts/aggregate-dashboard.js`, `src/controllers/dashboard.controller.js`, `dashboard/src/pages/Dashboard.jsx` | `docs/ceo_memo_acceptance_matrix.md`, `tests/integration/dashboard.test.js` | "Nhóm em chỉ làm UI đẹp." |
| 4 alert types | "Hệ thống có 4 alert types: anniversary, vacation, benefits_change, birthday." | `src/controllers/alerts.controller.js`, `src/services/alertAggregationService.js`, `dashboard/src/components/AlertsPanel.jsx` | `docs/case_study_guide.md`, `docs/ceo_memo_acceptance_matrix.md` | "Alerts là mock data." |
| Demo alert stability | "Cho live demo, script `demo:dashboard:prepare` có thể provision evidence còn thiếu để đủ 4 alert types hiển thị ổn định." | `scripts/prepare-dashboard-demo.js` | `src/__tests__/dashboard.demo-prep.contract.test.js`, `docs/demo/live/demo_runbook_one_page_vi.md` | "Runtime business bình thường luôn tự sinh đủ 4 alert trong mọi dataset." |
| Benefits change impact | "Alert `benefits_change` hiện là explainable payroll-impact cue, gồm plan, annual paid amount, effective date, last change date và impact code." | `src/utils/benefitsPayrollImpact.js`, `src/services/alertAggregationService.js`, `dashboard/src/utils/benefitsImpact.js` | `src/__tests__/benefitsPayrollImpact.test.js`, `docs/case_study_guide.md` | "Hệ thống đã tự recalculate payroll đầy đủ." |
| Case 2 strength | "Case 2 là phần implemented mạnh nhất vì dashboard, alerts, drilldown, executive brief và export đều có evidence thật." | `dashboard/src/pages/Dashboard.jsx`, `src/controllers/dashboard.controller.js`, `src/controllers/alerts.controller.js` | `docs/case_study_guide.md`, `docs/codebase_ceo_memo_case_audit.md` | "Case nào của nhóm em cũng production-ready ngang nhau." |
| Case 3 consistency model | "Case 3 được triển khai theo eventual consistency có kiểm soát với flow SA -> Mongo outbox -> Payroll internal API -> Payroll MySQL." | `src/controllers/employee.controller.js`, `src/adapters/payroll.adapter.js`, `src/services/payrollMutationService.js` | `docs/case_study_3_data_consistency.md`, `docs/case_study_3_test_plan.md` | "Hệ thống đã strong consistency / ACID xuyên MongoDB và MySQL." |
| Payroll ownership | "SA không ghi thẳng payroll tables nữa; Payroll service sở hữu write path của MySQL." | `src/payroll-server.js`, `src/services/payrollMutationService.js`, `src/adapters/payroll.adapter.js` | `docs/case_study_guide.md`, `README.md` | "SA ghi luôn cả source DB lẫn payroll DB." |
| Case 4 middleware level | "Case 4 đang ở mức middleware-lite: có outbox, worker, retry, replay, recover-stuck, monitor API/UI." | `src/services/integrationEventService.js`, `src/controllers/integration.controller.js`, `src/workers/integrationEventWorker.js` | `src/__tests__/integration.controller.behavior.test.js`, `src/__tests__/integrationEventService.recovery.test.js`, `docs/case_study_4_architecture.md` | "Đây là enterprise middleware như Kafka/RabbitMQ production stack." |
| Root verification | "Root gate hiện tại là `npm run verify:all`, và nó đã bao gồm cả split-runtime proof của Case 3, không chỉ lint/test backend/frontend." | `package.json` | `src/__tests__/lint.contract.test.js`, `README.md` | "`verify:all` chỉ là mấy unit test rời rạc." |
| Live audit contract | "File audit advanced hiện đã bám contract backend hiện tại, không còn gọi endpoint cũ như `/dashboard/summary`." | `tests/advanced/questions-audit.test.js` | `src/__tests__/questions.audit.contract.test.js` | "File audit cũ vẫn dùng nguyên được làm evidence." |
| Case 5 completion level | "Case 5 hiện ở mức docs + rehearsal-safe evidence, chưa phải production infra rollout." | `scripts/case5-readiness-safe.js`, `docs/case_study_5_network_dr_security.md` | `docs/known_gaps_2026-02-21.md`, `Memory/DR/*` | "Nhóm em đã triển khai thật HA/DR/network production." |

## 3) Câu trả lời mẫu rất ngắn

- "Điểm mạnh nhất của nhóm em là Case 2 vì phần executive dashboard đã chạy được end-to-end."
- "Case 3 của nhóm em là eventual consistency có kiểm soát, nên tụi em không claim ACID xuyên nhiều database."
- "Case 4 tụi em đã có outbox-style queue, retry/replay và recovery path, nhưng chưa gọi đó là enterprise broker stack."
- "Case 5 hiện là readiness/design evidence, chưa phải rollout production."

## 4) Nếu thầy hỏi sâu thì mở file nào

- Dashboard core: `dashboard/src/pages/Dashboard.jsx`
- Drilldown: `dashboard/src/components/DrilldownModal.jsx`
- Alerts panel: `dashboard/src/components/AlertsPanel.jsx`
- Alert backend: `src/controllers/alerts.controller.js`
- Demo alert prep: `scripts/prepare-dashboard-demo.js`
- Employee consistency path: `src/controllers/employee.controller.js`
- Payroll ownership path: `src/services/payrollMutationService.js`
- Queue recovery path: `src/services/integrationEventService.js`
- Root verification gate: `package.json`
- Truthful gaps: `docs/known_gaps_2026-02-21.md`

## 5) Quy tắc cuối cùng khi bảo vệ

- Nếu không chắc, quay về wording: `implemented`, `partial`, `docs-level`, `readiness`.
- Nếu bị hỏi về consistency, nói thẳng: `eventual consistency`, không đẩy sang `ACID`.
- Nếu bị hỏi về middleware, nói thẳng: `DB-backed outbox + worker`, không gọi là broker stack.
- Nếu bị hỏi về demo 4 alerts, nói đúng: đó là `demo prep evidence`, không gọi là business realtime guarantee.
