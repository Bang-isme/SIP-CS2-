# Viva Claim - Evidence Cheatsheet

> Last Updated: 2026-03-19
> Mục đích: mở 1 file là biết câu nào nói được, bằng chứng code nằm ở đâu, và câu nào không nên nói.

## 1) Cách dùng nhanh trước viva

1. Chọn claim bạn sắp nói.
2. Mở đúng file evidence tương ứng nếu thầy hỏi sâu.
3. Nếu claim nằm ở cột `Không nên nói`, đổi sang wording ở cột `Cách nói an toàn`.

## 2) Claim -> Evidence -> Safe wording

| Chủ đề | Cách nói an toàn | Evidence code chính | Evidence test/docs | Không nên nói |
|---|---|---|---|---|
| Dashboard CEO memo | "Nhóm em đã triển khai dashboard điều hành cho earnings, vacation, benefits, alerts, drilldown và export." | `scripts/aggregate-dashboard.js`, `src/controllers/dashboard.controller.js`, `dashboard/src/pages/Dashboard.jsx` | `docs/ceo_memo_acceptance_matrix.md`, `tests/integration/dashboard.test.js` | "Nhóm em chỉ làm UI đẹp." |
| Earnings/Vacation current vs previous year | "UI hiện tại đã có cues cho current year và previous year theo đúng executive view." | `dashboard/src/components/EarningsChart.jsx`, `dashboard/src/components/VacationChart.jsx` | `docs/case_study_guide.md`, `docs/case_study_2_design.md` | "Chỉ backend có dữ liệu, UI chưa phản ánh." |
| Benefits summary + drilldown | "Benefits summary và drilldown hiện đã đúng ngữ nghĩa benefits, không còn dùng earnings context sai nữa." | `dashboard/src/components/BenefitsChart.jsx`, `dashboard/src/components/DrilldownModal.jsx`, `src/controllers/dashboard.controller.js` | `dashboard/src/components/DrilldownModal.test.jsx` | "Benefits drilldown cũng chỉ là earnings drilldown đổi màu." |
| Manage-by-exception alerts | "Hệ thống có 4 alert types và hiển thị preview + detail theo hướng manage-by-exception." | `src/controllers/alerts.controller.js`, `src/services/alertAggregationService.js`, `dashboard/src/components/AlertsPanel.jsx` | `docs/case_study_2_design.md`, `docs/ceo_memo_acceptance_matrix.md` | "Alerts là mock dữ liệu." |
| Management can set alerts | "Ở mức hiện tại `moderator/admin/super_admin` có thể cấu hình alert rules; phần integration recovery vẫn tách riêng cho admin path." | `src/middlewares/authJwt.js`, `src/routes/alerts.routes.js`, `dashboard/src/pages/Dashboard.jsx`, `dashboard/src/components/AlertSettingsModal.jsx` | `src/__tests__/alerts.routes.authz.test.js`, `dashboard/src/pages/Dashboard.test.jsx` | "Chỉ admin hệ thống mới chạm được alert settings." |
| Alert refresh behavior | "Khi lưu alert rule, backend refresh alert summaries ngay cho session hiện tại; còn batch schedule vẫn là baseline cho aggregate tổng thể." | `src/controllers/alerts.controller.js`, `src/services/alertAggregationService.js`, `dashboard/src/components/AlertSettingsModal.jsx` | `src/__tests__/alerts.controller.behavior.test.js`, `docs/operations_checklist_ceo_memo.md` | "Save alert xong là toàn bộ hệ thống realtime hoàn toàn." |
| Benefits change impact payroll | "Alert `benefits_change` hiện cung cấp payroll-impact cues có thể giải thích được, gồm plan, annual paid amount, effective date, last change date và impact code." | `src/utils/benefitsPayrollImpact.js`, `src/services/alertAggregationService.js`, `dashboard/src/utils/benefitsImpact.js`, `dashboard/src/components/AlertsPanel.jsx` | `src/__tests__/benefitsPayrollImpact.test.js`, `dashboard/src/components/AlertsPanel.test.jsx` | "Hệ thống đã tự tái tính payroll đầy đủ." |
| Employee write path | "Source-of-truth được ghi ở HR trước, sau đó mới dispatch tích hợp; response có `sync.status`, `mode`, `consistency`, `requiresAttention` để phản ánh đúng trạng thái." | `src/controllers/employee.controller.js`, `src/routes/employee.routes.js` | `src/__tests__/employee.controller.behavior.test.js`, `src/__tests__/employee.routes.authz.test.js` | "Một lần ghi là ACID xuyên tất cả hệ thống." |
| Case 3 consistency model | "Case 3 của nhóm em là eventual consistency có kiểm soát, không claim strict ACID hay 2PC." | `src/controllers/employee.controller.js`, `src/services/syncService.js`, `src/models/sql/SyncLog.js` | `docs/case_study_3_data_consistency.md`, `docs/case_study_3_test_plan.md` | "Hệ thống đã strong consistency giữa MongoDB và MySQL." |
| Queue / middleware | "Nhóm em đã có DB-backed outbox + worker + retry/replay/recover-stuck để chứng minh middleware-centric integration ở mức coursework." | `src/services/integrationEventService.js`, `src/controllers/integration.controller.js`, `src/routes/integration.routes.js`, `dashboard/src/components/IntegrationEventsPanel.jsx` | `src/__tests__/integration.controller.behavior.test.js`, `src/__tests__/integrationEventService.recovery.test.js`, `docs/case_study_4_architecture.md` | "Đây là enterprise middleware như Kafka/RabbitMQ production stack." |
| Stale PROCESSING recovery | "Nếu worker chết giữa chừng, queue có timeout-based stale `PROCESSING` recovery và admin có đường `recover-stuck`." | `src/services/integrationEventService.js`, `src/controllers/integration.controller.js`, `dashboard/src/components/IntegrationEventsPanel.jsx` | `src/__tests__/integrationEventService.recovery.test.js`, `dashboard/src/components/IntegrationEventsPanel.test.jsx` | "Queue tự chữa mọi lỗi mà không cần giám sát." |
| Quality gates | "Ở thời điểm hiện tại, backend/frontend lint, test, build đều pass; production dependency audit cũng sạch với `npm audit --omit=dev`." | `package.json`, `dashboard/package.json` | `docs/ceo_memo_acceptance_matrix.md`, `docs/evidence_pack_2026-02-16.md` | "Toàn bộ workspace và dev tooling đã sạch tuyệt đối." |
| Case 4 completion level | "Case 4 đang ở mức partial nhưng có implementation thật cho queue, retry, replay, monitor và recovery." | `src/services/integrationEventService.js`, `src/workers/integrationEventWorker.js`, `dashboard/src/components/IntegrationEventsPanel.jsx` | `docs/case_study_guide.md`, `docs/case_study_4_architecture.md` | "Case 4 đã fully integrated ở cấp enterprise." |
| Case 5 completion level | "Case 5 hiện ở mức docs + rehearsal-safe evidence, chưa phải production infra rollout." | `scripts/dr-rehearsal-safe.js`, `docs/case_study_5_network_dr_security.md` | `Memory/DR/*`, `docs/known_gaps_2026-02-21.md` | "Nhóm em đã triển khai thật hạ tầng HA/DR/network." |

## 3) Câu trả lời mẫu rất ngắn

- "Điểm mạnh nhất của nhóm em là Case 2, vì phần executive dashboard đã chạy được end-to-end."
- "Case 3 nhóm em làm theo eventual consistency có kiểm soát, nên tụi em không claim ACID xuyên nhiều database."
- "Case 4 tụi em đã có outbox-style queue, retry/replay và recovery path, nhưng chưa gọi đó là enterprise broker stack."
- "Case 5 hiện là thiết kế và rehearsal-safe evidence, chưa phải rollout production."

## 4) Mốc file nên mở nếu thầy hỏi sâu

- Dashboard core: `dashboard/src/pages/Dashboard.jsx`
- Drilldown: `dashboard/src/components/DrilldownModal.jsx`
- Alert config: `dashboard/src/components/AlertSettingsModal.jsx`
- Alert backend: `src/controllers/alerts.controller.js`
- Employee consistency path: `src/controllers/employee.controller.js`
- Queue recovery path: `src/services/integrationEventService.js`
- Acceptance snapshot: `docs/ceo_memo_acceptance_matrix.md`
- Truthful gaps: `docs/known_gaps_2026-02-21.md`

## 5) Quy tắc cuối cùng khi bảo vệ

- Nếu không chắc, quay về wording: `implemented`, `partial`, `docs-level`.
- Nếu bị hỏi về consistency, nói thẳng: `eventual consistency`, không cố đẩy sang `ACID`.
- Nếu bị hỏi về middleware, nói thẳng: `DB-backed outbox + worker`, không gọi là Kafka/RabbitMQ stack.
- Nếu bị hỏi về payroll impact, nói đúng: `explainable cue`, không gọi là payroll recalculation engine.
