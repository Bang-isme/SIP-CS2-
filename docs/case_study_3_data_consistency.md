# Case Study 3 - Data Consistency & Failure Scenarios

> Last Updated: 2026-04-03

## 1) Mục tiêu consistency
- Dữ liệu employee được nhập từ HR source-of-truth một lần.
- Hệ thống có đường đồng bộ sang downstream integrations.
- Failure mode được phản ánh rõ thay vì che giấu.

## 2) Luồng dữ liệu hiện tại
1. API tạo/sửa/xóa employee trên MongoDB.
2. Controller cố gắng enqueue `IntegrationEvent` vào MySQL outbox table.
3. Worker nền đọc event `PENDING/FAILED`, xử lý, rồi cập nhật trạng thái.
4. `syncEmployeeToAll` gọi adapters và ghi `SyncLog`.
5. Nếu enqueue lỗi, controller chuyển sang direct fallback và vẫn trả trạng thái `sync` về cho client.
6. `correlationId` của request được giữ xuyên employee mutation -> `integration_events` -> worker/direct fallback -> `sync_log`.

## 3) Sync metadata trả về từ API

Employee mutation responses hiện có thêm object `sync` để client biết hệ thống đang ở trạng thái nào:
- `status`: `QUEUED`, `SUCCESS`, hoặc `FAILED`
- `mode`: `OUTBOX`, `DIRECT`, hoặc `DIRECT_FALLBACK`
- `consistency`: `EVENTUAL` hoặc `AT_RISK`
- `requiresAttention`: có cần theo dõi thủ công hay không
- `message`: mô tả kết quả dispatch
- `correlationId`: token để nối response hiện tại với queue row, sync log, và server logs

Ý nghĩa:
- `QUEUED` nghĩa là source đã lưu, downstream sync sẽ chạy async.
- `SUCCESS` nghĩa là direct path hoặc fallback path đã sync xong.
- `FAILED` nghĩa là source đã lưu nhưng dispatch downstream vẫn còn rủi ro cần can thiệp.

## 4) Trạng thái ở tầng queue và log

Integration event:
- `PENDING`
- `PROCESSING`
- `SUCCESS`
- `FAILED`
- `DEAD`

Sync log:
- `PENDING`
- `SUCCESS`
- `FAILED`

Correlation fields:
- `integration_events.correlation_id`
- `sync_log.correlation_id`

Lưu ý:
- Queue status và API `sync` status không phải cùng một abstraction.
- API trả góc nhìn của mutation request.
- Queue/log phản ánh vòng đời tích hợp ở backend.
- Manual retry từ `/api/sync/retry` sẽ ưu tiên giữ lại `correlation_id` cũ của failed sync; nếu log cũ không có thì route sẽ dùng correlation của request retry hiện tại.

## 4.1) Contract vận hành cho `/api/sync`

Các endpoint này giờ theo cùng envelope canonical với dashboard/integration:
- `GET /api/sync/status` -> `{ success, data, meta }`
- `GET /api/sync/logs` -> `{ success, data, meta }`
- `POST /api/sync/retry` -> `{ success, data, meta }`
- `GET /api/sync/entity/:type/:id` -> `{ success, data, meta }`

Validation rules:
- Query/path params sai trả `422` với `errors[]`
- `GET /api/sync/logs` hỗ trợ filter theo `status`, `action`, `entityType`, `entityId`, `correlationId`, `page`, `limit`
- `meta.requestId` và `meta.actorId` được trả về để operator path có evidence nhất quán

## 5) Các kịch bản lỗi chính

- Outbox enqueue lỗi:
  - source Mongo vẫn được lưu
  - controller thử direct fallback
  - response trả `requiresAttention` nếu downstream chưa an toàn

- Worker chết giữa chừng:
  - event có thể bị kẹt `PROCESSING`
  - service có timeout-based stale recovery
  - admin path có `recover-stuck`

- Downstream integration lỗi:
  - event chuyển `FAILED`
  - retry/backoff áp dụng
  - quá ngưỡng có thể thành `DEAD`

- Validation hoặc duplicate từ source:
  - validation trả `400`
  - duplicate `employeeId` trả `409`
  - source không tạo record sai

## 5.1) Seed và repair consistency cho local 500k dataset

Với bài có quy mô `500000` records, baseline local hiện tại đi theo luồng này:
1. `node scripts/seed.js --profile enterprise --total 500000 --batch 5000`
2. `node scripts/aggregate-dashboard.js`
3. `node scripts/repair-cross-db-consistency.js`

Guardrails hiện có:
- `scripts/seed.js` ghi Mongo trước để tránh SQL > Mongo divergence khi Mongo quota/error.
- Mỗi batch SQL (`earnings`, `vacation_records`, `employee_benefits`, `pay_rates`) được bọc trong transaction.
- Nếu SQL batch fail, script rollback transaction và xóa lại Mongo batch vừa insert.
- Trước khi seed, script reset cả core tables lẫn derived tables (`earnings_employee_year`, `*_summary`, `alert_employees`) để tránh stale analytics.
- `scripts/repair-cross-db-consistency.js` hiện dọn orphan cho `earnings`, `vacation_records`, `employee_benefits`, `pay_rates`, `earnings_employee_year`, và `alert_employees`.

Baseline đã verify trên local ngày `2026-04-03`:
- Mongo `employees`: `500000`
- Mongo `departments`: `8`
- MySQL `vacation_records`: `500000`
- MySQL `employee_benefits`: `500000`
- MySQL `pay_rates`: `500000`
- MySQL `earnings_employee_year`: `849977`
- Cross-DB orphan cleanup run: `0` rows deleted

## 6) Những gì hệ thống làm được và chưa làm được

Làm được:
- Eventual consistency có kiểm soát
- Retry/replay/recovery path
- Sync/log visibility
- Response semantics rõ hơn cho mutation path
- Local seed/aggregate/repair flow đủ sạch để dựng dataset lớn mà không để lại SQL partial writes

Chưa làm:
- Strict ACID / 2PC xuyên MongoDB + MySQL
- Transactional outbox chuẩn với cùng transaction boundary
- Background reconciliation job đầy đủ kiểu production

## 7) Kết luận
- Case Study 3 hiện phù hợp để bảo vệ theo hướng eventual consistency thực dụng.
- Không nên gọi đây là strong consistency hoặc full ACID integration.
