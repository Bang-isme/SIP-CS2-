# Case Study 4 - Architecture (Fully Integrated System)

> Last Updated: 2026-04-02

## 1) Mục tiêu
- Tạo cảm giác “một hệ thống duy nhất”.
- Có lớp middleware để mở rộng tích hợp.
- Có khả năng nhìn, retry, replay, và phục hồi lỗi tích hợp.

## 2) Kiến trúc hiện có
- `integrations.js` khai báo integrations đang active.
- `ServiceRegistry` load adapters động.
- `SyncService` điều phối đồng bộ đến adapters.
- `IntegrationEvent` đóng vai trò DB-backed outbox queue.
- `integrationEventWorker` xử lý event nền.
- Health + monitor APIs dùng để quan sát trạng thái.

## 3) DB-backed outbox + worker (middleware-lite)

Luồng chính:
1. HR CRUD ghi source-of-truth vào Mongo.
2. Hệ thống enqueue `IntegrationEvent` vào MySQL.
3. Worker đọc event `PENDING/FAILED`.
4. Event được claim sang `PROCESSING`.
5. `syncEmployeeToAll` gọi adapters và cập nhật kết quả.

Những gì đã có:
- Retry + exponential backoff.
- Max attempts và trạng thái `DEAD`.
- Metrics endpoint.
- Replay theo filter.
- Timeout-based recovery cho stale `PROCESSING`.
- End-to-end correlation trace: `correlation_id` được giữ từ employee mutation request vào `integration_events`, qua worker/direct fallback, xuống `sync_log`.
- Operator audit trail ngay trên `integration_events` cho retry/replay/recover (`last_operator_action`, `last_operator_actor_id`, `last_operator_request_id`, `last_operator_at`).
- Durable audit history riêng trong `integration_event_audits` để giữ đầy đủ các lần retry/replay/recover theo từng event.

Admin path hiện tại:
- `GET /api/integrations/events`
- `GET /api/integrations/events/:id/audit`
- `GET /api/integrations/events/metrics`
- `POST /api/integrations/events/retry/:id`
- `POST /api/integrations/events/retry-dead`
- `POST /api/integrations/events/recover-stuck`
- `POST /api/integrations/events/replay`

Contract rules:
- Integration operator APIs giờ validate chặt query/payload/path params và trả `422 + errors[]` khi filter/id sai, thay vì silently normalize.
- `GET /api/integrations/events` trả canonical `{ success, data, meta }` với `meta.dataset`, `meta.filters`, `meta.totalPages`, `meta.actorId`.
- Mutation paths (`retry`, `retry-dead`, `recover-stuck`, `replay`) trả thêm operator metadata để FE/admin path biết ai chạy thao tác nào và filter nào đã được áp dụng.
- Integration/auth error paths và metadata envelopes giờ gắn `x-request-id` + `requestId` correlation token để operator có thể nối UI evidence với server logs theo từng request.
- Retry/replay/recover không chỉ trả metadata ở response mà còn ghi audit metadata bền vững vào queue row để state change có thể giải thích lại sau demo hoặc incident review.
- Nếu cần lịch sử đầy đủ thay vì latest state, admin path đọc qua `GET /api/integrations/events/:id/audit` từ bảng `integration_event_audits`.
- Replay chỉ cho phép status `FAILED` hoặc `DEAD`, và không cho phép gửi đồng thời `fromDate` với `fromDays`.

Role:
- `admin` và `super_admin`

## 4) Queue observability đã triển khai

Metrics đang có:
- `backlog`
- `actionable`
- `counts` theo trạng thái
- `stuckProcessingCount`
- `healthyProcessingCount`
- `processingTimeoutMinutes`
- `oldestPendingAt`
- `oldestPendingAgeMinutes`

UI Integration Queue hiện dùng các metrics này để:
- hiển thị severity
- tách `PROCESSING` khỏe và `PROCESSING` bị kẹt
- cho admin thực hiện retry/replay/recover

Schema/ops guard đã có:
- MySQL migration status giờ kiểm cả required migration IDs, không chỉ nhìn bảng có tồn tại hay không.
- Operator audit columns được rollout bằng incremental migration `20260402_000002_integration_event_operator_audit`.
- Audit history table được rollout bằng incremental migration `20260402_000003_integration_event_audit_history`.
- Correlation trace columns/indexes được rollout bằng incremental migration `20260402_000004_integration_correlation_trace`.

## 5) Điều cần nói đúng bản chất

Đây là gì:
- DB-backed outbox queue
- polling worker
- middleware-lite đủ để demo và bảo vệ coursework

Đây chưa phải là gì:
- transactional outbox chuẩn
- Kafka/RabbitMQ production stack
- enterprise DLQ/observability platform

## 6) Kiến trúc mở rộng ở mức design-only

Production-ready option:
- Event broker layer: Kafka/RabbitMQ
- DLQ tách riêng
- Consumer groups
- tracing/correlation ID xuyên broker/worker đầy đủ
- SLO/SLA monitoring và alerting chuẩn vận hành

Các phần này hiện phần lớn mới là định hướng kiến trúc. Repo hiện đã có correlation chain xuyên HTTP -> outbox -> worker/direct fallback -> `sync_log`, kèm durable operator audit history trong MySQL; chưa có broker-grade telemetry/distributed tracing platform.

## 7) Gaps còn lại
- Chưa có broker thật.
- Chưa có DLQ storage tách biệt.
- Chưa có observability production-grade.
- Chưa có migration sang event backbone cấp enterprise.

## 8) Kết luận
- Case Study 4 đang ở mức partial nhưng có implementation thật cho queue, retry, replay và recovery.
- Đây là phần đủ tốt để chứng minh nhóm hiểu middleware-centric integration, miễn là không overclaim lên enterprise stack.
