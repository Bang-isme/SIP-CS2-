# Case Study Guide - SIP_CS (CEO Memo + Case Study 1-5)

> Last Updated: 2026-02-03

## 0) Tình trạng codebase hiện tại (snapshot)
- Case Study 2 (Dashboard): Hoàn thành. Dashboard, alerts, drilldown, pre-aggregation và UI đã ổn định.
- Case Study 3 (Integrated System): Hoàn thành ở mức eventual consistency (sync service + sync log + retry + health).
- Case Study 4 (Fully Integrated System): Đã triển khai middleware-lite (Outbox + Worker), Integration Events API (admin-only), UI Integration Queue; bổ sung kiến trúc lớn (design-only) cho broker/DLQ/observability.
- Case Study 1 (Proposal deliverables): Đã có proposal doc; còn thiếu GUI sketch hình ảnh nếu cần nộp.
- Case Study 5 (Network Integration): Tài liệu mạng/DR/security đã mở rộng, có template cấu hình + availability strategy (docs), chưa triển khai hạ tầng.
  - Có script rehearsal an toàn: `scripts/dr-rehearsal-safe.js` (ghi report vào Memory/DR).
  - Rehearsal gần nhất: `Memory/DR/dr_rehearsal_safe_2026-02-03.json`.

## 1) Đối chiếu CEO Memo
| Yêu cầu CEO Memo | Trạng thái | Bằng chứng (code) |
|---|---|---|
| Tổng earnings theo shareholder/gender/ethnicity/emp-type/department (current + prev) | DONE | `SIP_CS/scripts/aggregate-dashboard.js`, `SIP_CS/src/controllers/dashboard.controller.js` |
| Tổng vacation days theo phân loại (current + prev) | DONE | `SIP_CS/scripts/aggregate-dashboard.js`, `SIP_CS/src/controllers/dashboard.controller.js` |
| Avg benefits theo plan + shareholder status | DONE | `SIP_CS/scripts/aggregate-dashboard.js`, `SIP_CS/src/controllers/dashboard.controller.js` |
| Drill-down từ summary vào chi tiết | DONE | `SIP_CS/src/controllers/dashboard.controller.js`, `SIP_CS/dashboard/src/components/DrilldownModal.jsx` |
| Alerts: anniversary, vacation threshold, benefits change, birthday (tháng hiện tại) | DONE | `SIP_CS/scripts/aggregate-dashboard.js`, `SIP_CS/src/controllers/alerts.controller.js`, `SIP_CS/dashboard/src/components/AlertsPanel.jsx` |
| Ad-hoc query (VD: employees earning > X) | PARTIAL | Min earnings filter + quick buttons + CSV export (chưa có NL query) |
| Không đổi legacy (ưu tiên presentation-style) | MOSTLY | Chỉ thêm bảng summary/AlertEmployee, không alter schema cũ |

## 2) Case Study 1 - The Proposal
### Goal & Requirements
- Xác định vấn đề, đề xuất 2 phương án khả thi, so sánh ưu/nhược, GUI sketch, lifecycle & schedule.

### Solution Approach
- Option A: Presentation-style integration (pre-aggregation) triển khai theo Case 2.
- Option B: Functional integration (sync service + adapters) triển khai theo Case 3 và Case 4.

### Architecture & Data Flow
- Option A: Mongo + MySQL -> `aggregate-dashboard.js` -> summary tables -> dashboard APIs -> FE.
- Option B: Employee CRUD -> Outbox -> Worker -> ServiceRegistry -> adapters -> SyncLog.

### Key Components / Scripts
- `SIP_CS/scripts/aggregate-dashboard.js`
- `SIP_CS/src/services/syncService.js`
- `SIP_CS/src/registry/ServiceRegistry.js`
- `SIP_CS/src/config/integrations.js`

### APIs
- `GET /api/dashboard/*`, `GET /api/alerts/*`, `GET /api/sync/*`

### Tests / Validation
- `SIP_CS/docs/advanced_test_plan.md`
- `SIP_CS/tests/advanced/quality.test.js`

### Artifacts
- Proposal doc: `SIP_CS/docs/case_study_1_proposal.md`
- ADR: `SIP_CS/Memory/Decisions/architecture_decisions.md`

### Status & Gaps
- Đã có proposal doc. Cần GUI sketch hình ảnh nếu yêu cầu nộp kèm.

## 3) Case Study 2 - The Dashboard
### Goal & Requirements
- Dashboard tích hợp (presentation-style), drilldown, alerts, không thay hệ thống legacy.

### Solution Approach
- Pre-aggregation vào summary tables để response nhanh.
- Drilldown query Mongo + snapshot earnings trong Mongo để đảm bảo tốc độ.
- AlertEmployee table cho pagination lớn.
- Hybrid Summary Totals: fast mode vẫn trả nhanh, nếu COUNT <= 10,000 sẽ chạy nền để cập nhật tổng chính xác.

### Architecture & Data Flow
- Mongo Employees + MySQL payroll -> `aggregate-dashboard.js` -> `EarningsSummary`, `VacationSummary`, `BenefitsSummary`, `AlertsSummary`, `AlertEmployee`.
- Dashboard API đọc summary từ MySQL, drilldown từ Mongo + MySQL snapshot.

### Key Components / Scripts
- `SIP_CS/scripts/aggregate-dashboard.js`
- `SIP_CS/src/controllers/dashboard.controller.js`
- `SIP_CS/src/controllers/alerts.controller.js`
- `SIP_CS/src/models/sql/EarningsSummary.js`
- `SIP_CS/src/models/sql/VacationSummary.js`
- `SIP_CS/src/models/sql/BenefitsSummary.js`
- `SIP_CS/src/models/sql/AlertEmployee.js`
- `SIP_CS/dashboard/src/pages/Dashboard.jsx`
- `SIP_CS/dashboard/src/components/AlertsPanel.jsx`
- `SIP_CS/dashboard/src/components/DrilldownModal.jsx`

### APIs
- `GET /api/dashboard/earnings`
- `GET /api/dashboard/vacation`
- `GET /api/dashboard/benefits`
- `GET /api/dashboard/drilldown`
- `GET /api/dashboard/drilldown/export`
- `GET /api/dashboard/departments`
- `GET /api/alerts/triggered`
- `GET /api/alerts/:type/employees`
- CRUD `/api/alerts`

### Tests / Validation
- `SIP_CS/docs/advanced_test_plan.md`
- `SIP_CS/tests/advanced/quality.test.js`

### Artifacts
- Requirements: `SIP_CS/docs/case_study_2_requirements.md`
- Design: `SIP_CS/docs/case_study_2_design.md`
- User Guide: `SIP_CS/docs/case_study_2_user_guide.md`

### Status & Gaps
- Functional UI/UX hoàn thiện. Cần hình ảnh mockup nếu yêu cầu nộp kèm.

## 4) Case Study 3 - Integrated System
### Goal & Requirements
- Data entered once, near real-time sync, consistency handling, retry/restore.

### Solution Approach
- SyncService gọi ServiceRegistry để broadcast đến adapters.
- SyncLog theo dõi PENDING/SUCCESS/FAILED và retry.

### Architecture & Data Flow
- Employee CRUD -> Outbox/SyncService -> ServiceRegistry -> adapters -> SyncLog.

### Key Components / Scripts
- `SIP_CS/src/services/syncService.js`
- `SIP_CS/src/models/sql/SyncLog.js`
- `SIP_CS/src/adapters/base.adapter.js`
- `SIP_CS/src/adapters/payroll.adapter.js`
- `SIP_CS/src/adapters/security.mock.adapter.js`
- `SIP_CS/src/controllers/employee.controller.js`
- `SIP_CS/src/routes/sync.routes.js`
- `SIP_CS/src/routes/health.routes.js`

### APIs
- `POST /api/employee` (create + sync)
- `PUT /api/employee/:id` (update + sync)
- `DELETE /api/employee/:id` (delete + sync)
- `GET /api/sync/status`
- `GET /api/sync/logs`
- `POST /api/sync/retry`
- `GET /api/sync/entity/:type/:id`

### Tests / Validation
- `SIP_CS/docs/advanced_test_plan.md`
- `SIP_CS/tests/advanced/quality.test.js`
- Test plan riêng: `SIP_CS/docs/case_study_3_test_plan.md`

### Artifacts
- Consistency doc: `SIP_CS/docs/case_study_3_data_consistency.md`
- Test plan: `SIP_CS/docs/case_study_3_test_plan.md`

### Status & Gaps
- Eventual consistency đạt yêu cầu, chưa có message queue hoặc 2PC.

## 5) Case Study 4 - Fully Integrated System
### Goal & Requirements
- Middleware chính thức, single-system appearance, mở rộng tích hợp.

### Solution Approach
- ServiceRegistry + integrations config + adapters.
- Outbox + Worker xử lý event nền (đã triển khai).
- Health check integrations.
- Thêm Integration Events API để monitor + retry thủ công (admin-only).
- Thêm UI Integration Queue để demo queue + replay filters (admin).
- Bổ sung design event broker + DLQ + observability (docs).
- Ghi chú production-ready option: Kafka/RabbitMQ (docs-only).

### Architecture & Data Flow
- CRUD -> Outbox -> Worker -> adapters -> SyncLog.
- `integrations.js` -> `ServiceRegistry` -> adapters -> `syncService`.

### Key Components / Scripts
- `SIP_CS/src/registry/ServiceRegistry.js`
- `SIP_CS/src/config/integrations.js`
- `SIP_CS/src/services/integrationEventService.js`
- `SIP_CS/src/workers/integrationEventWorker.js`
- `SIP_CS/src/models/sql/IntegrationEvent.js`
- `SIP_CS/src/routes/health.routes.js`

### APIs
- `GET /api/health/integrations`
- `GET /api/integrations/events`
- `POST /api/integrations/events/retry/:id`
- `POST /api/integrations/events/retry-dead`
- `POST /api/integrations/events/replay`

### Tests / Validation
- Extensibility tests trong `SIP_CS/tests/advanced/quality.test.js`

### Artifacts
- Architecture doc: `SIP_CS/docs/case_study_4_architecture.md`
- Demo script: `SIP_CS/scripts/demo-integration-events.js`
- UI: `SIP_CS/dashboard/src/components/IntegrationEventsPanel.jsx`

### Status & Gaps
- Middleware-lite đã có; broker/DLQ/observability mới ở mức design-only.

## 6) Case Study 5 - Network Integration
### Goal & Requirements
- Network architecture, security boundaries, backup/recovery (RTO/RPO), bandwidth, DR plan.

### Solution Approach
- Tài liệu kế hoạch mạng/DR/security đã bổ sung (chưa triển khai hạ tầng).
- Có template cấu hình backup/DR/security để làm baseline.
- Availability strategy được mô tả ở mức tài liệu.

### Artifacts
- Network & DR plan: `SIP_CS/docs/case_study_5_network_dr_security.md`
 - Templates: `SIP_CS/docs/templates/*`
 - Safe rehearsal script: `SIP_CS/scripts/dr-rehearsal-safe.js`

### Status & Gaps
- Chưa triển khai thực tế. Cần thực thi hạ tầng, HA thật và kiểm thử DR.

## 7) Crosswalk (Case 1-5 vs yêu cầu chính)
| Yêu cầu chính | Case1 | Case2 | Case3 | Case4 | Case5 | Trạng thái code |
|---|---|---|---|---|---|---|
| Dashboard summary + drilldown | Y | Y | Y | Y |  | DONE (Case2) |
| Alerts / Manage-by-exception | Y (đề xuất) | Y | Y (consistency) | Y (middleware) |  | DONE (Case2) |
| Giữ legacy / estimate effort nếu thay đổi | Y | Y (cụ thể) |  |  |  | DONE (chỉ extend summary) |
| Near real-time data consistency / ACID |  |  | Y | Y |  | PARTIAL (eventual, no 2PC) |
| Middleware & single-system appearance |  |  | option | required |  | PARTIAL (outbox + worker) |
| Test plan, verification & validation |  | Y | Y | Y | Y (backup testing) | PARTIAL (advanced tests only) |
| Network / Backup / Recovery / Security |  |  |  |  | Y | DOCS + rehearsal (no infra) |
| Availability / HA strategy |  |  |  |  | Y | DOCS ONLY |
