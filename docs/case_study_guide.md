# Case Study Guide - SIP_CS (CEO Memo + Case Study 1-5)

> Last Updated: 2026-04-03
> Chính sách: chỉ claim những gì đang có evidence thật trong codebase.

## 0) Tài liệu nên đọc trước
- `docs/codebase_ceo_memo_case_audit.md`
- `docs/ceo_memo_acceptance_matrix.md`
- `docs/backend_api_contract_reference.md`
- `docs/viva_claim_evidence_cheatsheet_vi.md`
- `Memory/CaseProgress/case_study_progress.md`
- `docs/known_gaps_2026-02-21.md`

## 1) Snapshot hiện tại của codebase
- Case Study 1: hoàn thành ở mức tài liệu, proposal và phương án kiến trúc đã có.
- Case Study 2: mạnh nhất, đã triển khai dashboard, drilldown, export CSV, 4 loại alert, pre-aggregation, executive action center, alert follow-up queue, và preset-driven query flow.
- Dashboard backend contract cho Case Study 2 đã được siết lại theo hướng FE-follow-BE: validation 422 rõ ràng, canonical `{ success, data, meta }`, year-aware drilldown summary, `x-request-id`/`meta.requestId` cho traceability, và `GET /api/dashboard/executive-brief` làm nguồn chuẩn cho action center/follow-up queue.
- Backend giờ còn có `GET /api/contracts/openapi.json` như contract bundle machine-readable để FE/operator lấy route/query/schema/auth requirements từ BE thay vì tự đoán từ code; scope đã mở tới auth signup/signin/logout/profile, admin users, và health probes.
- Cùng contract đó giờ còn có UI runtime ở `GET /api/contracts/docs/`, nên FE/operator/giảng viên có thể duyệt trực tiếp Swagger UI từ backend thay vì đọc JSON thô.
- Compatibility surfaces ngoài CEO Memo cũng không còn bị bỏ quên: legacy `/api/products` giờ đã được kéo về cùng chuẩn validation/error/OpenAPI để không còn là route “lệch chuẩn” trong backend.
- Auth boundary itself giờ cũng đã đi theo contract chuẩn hơn: middleware trả `success/message/code/requestId` thay vì bare message, nên FE/operator có thể phân nhánh lỗi auth theo mã máy đọc được chứ không phải parse text.
- Error handling ở tầng API giờ cũng đã được kéo gần về một chuẩn chung hơn: validation/not-found/conflict/server errors trên các surface chính đều có `code` machine-readable và fallback route-not-found của app cũng trả JSON cùng style.
- Observability ở các path backend chính cũng đã sạch hơn: runtime logs dùng structured logger với `context` và `requestId`, nên trace demo/incidents theo workflow thật dễ hơn so với giai đoạn còn rải `console.*`.
- Quality gate backend giờ cũng rõ hơn: `NODE_ENV=test` mặc định tắt structured logger và access log nếu không chủ động bật, nên unit/integration output ít noise hơn và dễ nhìn blocker thật hơn.
- `npm run lint` của backend cũng không còn dừng ở syntax check: giờ chạy cả `lint:syntax` và `lint:static` với ESLint runtime-safety rules để bắt thêm lỗi như `no-undef`, `no-unreachable`, `no-dupe-keys`, `no-unused-vars`, `no-empty`, `eqeqeq`, và `no-useless-catch`.
- Backend runtime dependency tree hiện cũng sạch hơn cho demo/coursework: transitive overrides đã dọn advisory ở `express -> path-to-regexp` và `sequelize -> lodash`, nên `npm audit --omit=dev` đang pass.
- Auth signin giờ cũng quota-aware hơn: nếu Mongo token storage bị khóa ghi vì over-quota, backend trả `503 AUTH_SESSION_STORAGE_UNAVAILABLE` thay vì phát token rồi để `/auth/me` đá người dùng ra ngay sau đó.
- Legacy product module cũng đã được làm sạch HTTP semantics: không còn `204` kèm body, có `404/422` canonical, và search path giờ dùng lookup chạy thật thay vì aggregation syntax lỗi.
- Local runtime cho BE cũng đã được kéo về trạng thái ổn định hơn cho dataset lớn: Mongo local 500k tránh quota Atlas, có `doctor:local`, `backend:local:*`, `stack:local:*`, và fallback autostart theo user logon để demo/viva bớt phụ thuộc thao tác tay.
- Case Study 3: triển khai được theo hướng eventual consistency có kiểm soát, và giờ có correlation trace xuyên request -> outbox/direct fallback -> sync log; chưa claim ACID xuyên MongoDB + MySQL.
- Case Study 4: có middleware-lite bằng DB-backed outbox + worker, monitor API/UI, replay/retry, stale-`PROCESSING` recovery, integration operator contract với validation `422` + operator metadata, end-to-end correlation trace xuyên worker/adapters, latest audit trail trên `integration_events`, và durable history riêng trong `integration_event_audits`; chưa có broker-grade stack.
- Case Study 5: có network/DR/security docs + rehearsal-safe evidence; chưa rollout hạ tầng thật.

## 2) Đối chiếu CEO Memo

| Yêu cầu CEO Memo | Trạng thái | Ghi chú trung thực |
|---|---|---|
| Earnings theo shareholder/gender/ethnicity/PT-FT/department (current + previous year) | DONE | API + UI đều có cues năm hiện tại và năm trước |
| Vacation totals theo cùng chiều phân loại | DONE | API + UI có current/previous + YoY cues |
| Average benefits theo plan + shareholder split | DONE | Summary và benefits drilldown đã khớp ngữ nghĩa benefits |
| Drilldown từ summary xuống detail | DONE | Có filter, pagination, quick query, preset library, saved views, export CSV |
| Alerts: anniversary, vacation threshold, benefits change, birthday | DONE | `benefits_change` đã có payroll-impact cues rõ hơn, kèm acknowledgement note/owner và follow-up queue để thể hiện xử lý manage-by-exception |
| Management set alerts | DONE | `moderator/admin/super_admin` cấu hình alert rules được |
| Ad-hoc query kiểu `employees earning > X` | PARTIAL | Có numeric filter `minEarnings`, preset query, saved views; chưa có natural-language query |
| Không phá legacy systems | MOSTLY | Mở rộng bằng summary tables, outbox events, derived fields; không thay flow lõi legacy |

## 3) Case Study 1 - The Proposal

### Mục tiêu
- Xác định vấn đề tích hợp HR + Payroll.
- Đề xuất ít nhất 2 hướng triển khai.
- So sánh trade-off, vòng đời, và lộ trình thực hiện.

### Hướng đã có trong repo
- Option A: presentation-style integration cho dashboard.
- Option B: functional integration theo sync service + adapters + outbox-style queue.

### Bằng chứng chính
- `docs/case_study_1_proposal.md`
- `Memory/Decisions/architecture_decisions.md`

### Trạng thái
- PASS ở mức docs-level.
- Nếu môn yêu cầu hình GUI sketch riêng thì cần nộp kèm ngoài phần codebase.

## 4) Case Study 2 - The Dashboard

### Mục tiêu
- Dashboard điều hành cho CEO.
- Summary rõ ràng, drilldown được, alerts theo manage-by-exception.
- Không phụ thuộc vào query real-time nặng trên cả hai DB.

### Cách triển khai hiện tại
- Batch `aggregate-dashboard.js` tạo summary tables cho earnings, vacation, benefits, alerts.
- Drilldown đọc dữ liệu chi tiết từ Mongo + snapshot SQL/Mongo tùy ngữ cảnh.
- CSV export dùng streaming để tránh payload quá lớn.
- Export earnings path flush theo employee batch trong lúc stream, không còn preload toàn bộ earnings của cả năm vào RAM.
- Export benefits path cũng không còn query `EarningsEmployeeYear` vô ích khi không dùng `minEarnings`, nên export lớn giảm thêm một lớp SQL load không cần thiết.
- `Executive Action Center` gom freshness, summary failures, alerts, và queue health thành action-oriented briefing ngay trên trang chính.
- `Alert Follow-up Queue` tách riêng các alert đang `Unassigned` hoặc `Needs Re-review` và cho phép mở thẳng modal cần xử lý.
- Backend còn có `executive brief snapshot` để FE lấy sẵn priority/tone/follow-up state thay vì tự ráp từ nhiều endpoint.
- Drilldown có `Memo Presets` + `Saved Views` để lặp lại nhanh các structured query thường gặp trong CEO Memo/viva.
- Alerts panel có acknowledgement workflow ở mức alert category: owner + note + timestamp + stale re-review state.
- Alert settings được cấu hình qua UI/API và khi lưu sẽ refresh alert summaries ngay cho session dashboard hiện tại.
- Dashboard/alerts backend đã normalize query ở boundary, escape search đầu vào, và thêm metadata (`dataset`, `filters`, `totalPages`) để FE render ổn định hơn.
- Dashboard/alerts/integration paths còn có request tracing ở API layer (`x-request-id`, `meta.requestId`) để FE/logs/operator evidence cùng nói về một request.
- Auth/user/health nhóm route cũng đã được kéo về cùng hướng contract này: `signin` nhận email hoặc username đúng như intended flow, `POST /auth/logout` là canonical route, user-management rejects invalid role/object-id input bằng `422`, và health endpoints trả readiness/migration context thay vì chỉ báo “app còn sống”.

### Điểm cần hiểu đúng bản chất
- Earnings/vacation/benefits summaries vẫn dựa trên pre-aggregation theo lịch vận hành.
- Alert summaries có targeted refresh khi cấu hình alert thay đổi.
- `Saved Views` là local browser state để tối ưu demo flow, không phải shared query catalog giữa nhiều user/máy.
- Alert acknowledgement hiện là category-level workflow, chưa phải task-tracking đầy đủ theo từng employee.
- Follow-up queue cũng là category-level operational cue, chưa phải SLA/task board nhiều bước.
- `benefits_change` hiện là explainable payroll-impact cue, chưa phải payroll recalculation engine.

### Bằng chứng chính
- `scripts/aggregate-dashboard.js`
- `src/controllers/dashboard.controller.js`
- `src/controllers/alerts.controller.js`
- `src/services/alertAggregationService.js`
- `dashboard/src/pages/Dashboard.jsx`
- `dashboard/src/components/DrilldownModal.jsx`
- `dashboard/src/components/AlertsPanel.jsx`
- `dashboard/src/components/AlertSettingsModal.jsx`

### Trạng thái
- PASS ở mức implemented.

## 5) Case Study 3 - Integrated System

### Mục tiêu
- Dữ liệu nhập một nơi từ HR.
- Có cơ chế đồng bộ sang hệ khác.
- Có trạng thái, retry, và cách giải thích failure mode.

### Cách triển khai hiện tại
- Employee mutation ghi source-of-truth vào Mongo trước.
- Sau đó hệ thống enqueue integration event vào MySQL outbox table.
- Worker nền đọc event, gọi `syncEmployeeToAll`, và ghi `SyncLog`.
- Nếu enqueue lỗi, controller có direct fallback và trả `sync` metadata về cho client.
- `sync.correlationId` ở response nối được với `integration_events.correlation_id` và `sync_log.correlation_id`, nên failure mode có thể trace theo từng workflow thay vì chỉ theo timestamp.
- Nhóm `/api/sync` giờ cũng theo canonical `{ success, data, meta }`, có validation `422`, và hỗ trợ filter logs theo `correlationId` để operator/FE truy evidence đúng workflow.
- Employee read APIs cũng không còn lệch contract cũ: `GET /api/employee/:employeeId` ưu tiên business `employeeId`, vẫn có Mongo-id fallback cho caller legacy, và list/detail responses đều trả envelope + metadata nhất quán hơn.
- Auth/user operator flows giờ cũng có request metadata thống nhất hơn, nên operator evidence không còn bị đứt đoạn giữa dashboard/integration và admin/auth surfaces.
- Shared API error envelope giờ phủ luôn users/employee/dashboard/alerts/integrations/sync, nên FE không còn phải đoán theo từng controller khi phân nhánh lỗi.

### Ý nghĩa của trạng thái hiện tại
- Đây là eventual consistency có kiểm soát.
- Không phải strict ACID hoặc 2PC giữa MongoDB và MySQL.
- Cũng chưa phải transactional outbox chuẩn vì source write và outbox write không nằm trong cùng transaction boundary xuyên hệ.

### Bằng chứng chính
- `src/controllers/employee.controller.js`
- `src/services/syncService.js`
- `src/services/integrationEventService.js`
- `src/models/sql/SyncLog.js`
- `src/routes/sync.routes.js`

### Trạng thái
- PARTIAL nhưng defend tốt cho coursework, nếu nói đúng bản chất.

## 6) Case Study 4 - Fully Integrated System

### Mục tiêu
- Tạo cảm giác “một hệ thống thống nhất”.
- Có lớp middleware để mở rộng tích hợp và quản trị lỗi.

### Cách triển khai hiện tại
- DB-backed outbox + polling worker.
- Integration monitor UI/API cho `admin/super_admin`.
- Có metrics, retry, retry-dead, replay theo filter, và recover stale `PROCESSING`.
- Integration operator APIs giờ theo contract rõ ràng hơn: query/payload/path params được validate, và response mutation có metadata để chứng minh operator action nào đã chạy.
- App-level fallback for unknown routes/unhandled errors is now JSON-contract based, which keeps operator/demo evidence consistent even outside happy-path controller logic.
- Operator/debug flow giờ có correlation token ở API layer và xuyên cả outbox/worker/adapters, nên auth failure, validation failure, employee mutations, và sync logs nối được về cùng một workflow.
- `GET /api/integrations/events/:id/audit` cho phép FE/admin path đọc lại durable operator history của từng event thay vì chỉ nhìn latest state trên queue row.
- Queue row cũng lưu operator audit fields cho retry/replay/recover, nên sau demo hoặc incident review vẫn truy được ai bấm thao tác nào, lúc nào, theo request nào.
- Migration readiness không còn dừng ở mức “đủ bảng”; script status/readiness giờ còn kiểm required migration IDs để tránh schema drift giữa code và MySQL.

### Chưa nên overclaim
- Chưa có Kafka/RabbitMQ thật.
- Chưa có DLQ/observability production-grade.
- Chưa có consumer groups và ops runbook ở cấp enterprise.

### Bằng chứng chính
- `src/services/integrationEventService.js`
- `src/controllers/integration.controller.js`
- `src/routes/integration.routes.js`
- `src/workers/integrationEventWorker.js`
- `dashboard/src/components/IntegrationEventsPanel.jsx`

### Trạng thái
- PARTIAL, middleware-lite đã triển khai và demo được.

## 7) Case Study 5 - Network Integration

### Mục tiêu
- Network architecture, backup/recovery, security boundary, DR readiness.

### Cách triển khai hiện tại
- Tài liệu kiến trúc mạng, DR, security baseline.
- Template cấu hình.
- Script rehearsal-safe để tạo evidence mà không làm hại dữ liệu vận hành.

### Bằng chứng chính
- `docs/case_study_5_network_dr_security.md`
- `docs/templates/*`
- `scripts/dr-rehearsal-safe.js`
- `Memory/DR/*`

### Trạng thái
- DOCS-LEVEL / rehearsal-safe.

## 8) Crosswalk nhanh (Case 1-5 vs yêu cầu chính)

| Yêu cầu chính | Case 1 | Case 2 | Case 3 | Case 4 | Case 5 | Trạng thái code |
|---|---|---|---|---|---|---|
| Dashboard summary + drilldown | Y | Y | Y | Y |  | DONE |
| Alerts / manage-by-exception | Y | Y | Y | Y |  | DONE |
| Giữ legacy / giảm rủi ro thay đổi | Y | Y |  |  |  | DONE |
| Data entered once + sync path |  |  | Y | Y |  | PARTIAL |
| Strict ACID / 2PC xuyên hệ |  |  | Y | Y |  | NOT IMPLEMENTED |
| Middleware-centric integration |  |  | option | Y |  | PARTIAL |
| Test / verification / validation | Y | Y | Y | Y | Y | PARTIAL-TO-STRONG |
| Network / backup / DR / security infra |  |  |  |  | Y | DOCS-LEVEL |

## 9) Quality gate snapshot (2026-04-03)

Backend:
- `npm run doctor:local` -> HEALTHY (`500000` Mongo employees, required MySQL migrations present, `/health/live` + `/health/ready` đều `200`)
- `npm run lint` -> PASS
- `npm test` -> PASS
- `npm run test:advanced` -> PASS
- `npm audit --omit=dev` -> PASS (`0 vulnerabilities`)

Frontend (`dashboard/`):
- `npm run lint` -> PASS
- `npm test` -> PASS
- `npm run build` -> PASS
- `npm audit --omit=dev` -> PASS (`0 vulnerabilities`)

Advisory-only backlog:
- Full workspace `npm audit` vẫn có dev-tooling advisories.
- `ux_audit.py` vẫn còn cảnh báo polish, không block scope hiện tại.

## 10) Cách nói chắc khi bảo vệ
- Case 2: implemented mạnh, demo tốt.
- Case 3: eventual consistency có kiểm soát, không claim ACID.
- Case 4: middleware-lite có retry/replay/recovery, chưa phải enterprise middleware.
- Case 5: có thiết kế và rehearsal-safe evidence, chưa phải triển khai hạ tầng thật.

## 11) Backend improvement verdict (2026-04-03)
- Không còn blocker chức năng mới nào cho scope coursework/demo; BE hiện đủ ổn để FE bám theo như nguồn chuẩn.
- Phần còn lại là non-blocking polish:
  1. Cài `SIPLocalMongoDB` thành Windows service bằng PowerShell elevated nếu muốn system-wide autostart; hiện tại scheduled-task autostart đã đủ cho demo local.
  2. Mở rộng dần rule-set ESLint/static analysis nếu muốn quality gate chặt hơn nữa, thay vì chỉ giữ runtime-safety baseline hiện tại.
  3. Chỉ khi muốn vượt phạm vi môn học mới cần thay DB-outbox polling bằng broker-grade middleware và observability sâu hơn.
