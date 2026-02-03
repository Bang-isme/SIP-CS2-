# Case Study 4 - Architecture (Fully Integrated System)

> Last Updated: 2026-02-03

## 1) Mục tiêu
- Tạo cảm giác “một hệ thống duy nhất”.
- Middleware chính thức để mở rộng tích hợp.

## 2) Kiến trúc hiện có (scaffold)
- `integrations.js` chứa danh sách adapter đang active.
- `ServiceRegistry` load adapter động.
- `SyncService` broadcast đến adapters.
- `Health` endpoint kiểm tra tình trạng tích hợp.

## 3) Outbox + Worker (Middleware-lite)
- Tất cả thay đổi employee sẽ tạo **IntegrationEvent** (Outbox) trong MySQL.
- Worker chạy nền đọc event theo batch, gọi `syncEmployeeToAll`.
- Có retry + backoff, quá số lần thì chuyển trạng thái **DEAD**.
- API monitor (admin-only): `/api/integrations/events` + retry thủ công.
- Replay (admin-only): `/api/integrations/events/replay` (lọc FAILED/DEAD theo entity/date).
- Demo script: `node scripts/demo-integration-events.js` (tạo FAILED/DEAD để test).
- UI monitor: Integration Queue panel trong Dashboard (filter + retry nhanh).

## 4) Data Flow
1. CRUD từ HR -> **Outbox enqueue**.
2. Worker -> ServiceRegistry -> Adapter tương ứng.
3. Adapter sync -> SyncLog.

## 5) Kiến trúc lớn (Design-only)
### 5.1 Event Broker Layer
- Outbox publish sang event broker (Kafka/RabbitMQ).
- Consumer group xử lý theo domain: payroll, security, analytics.
- Bảo đảm at-least-once, idempotent ở consumer.

### 5.2 DLQ & Replay Policy
- Retry policy theo backoff + max attempts.
- DLQ chính thức lưu FAILED lâu dài.
- Replay UI cho phép reprocess theo time range hoặc entity.
- TTL cho event trong broker và DLQ.

### 5.3 Observability & SLO/SLA
- Metrics: queue lag, retry count, dead count, success rate, p95 latency.
- Tracing: correlation ID xuyên suốt CRUD -> outbox -> broker -> consumer.
- Dashboard: trạng thái integrations + SLA vi phạm.
- Target SLO: 99% event sync < 5 phút, lỗi < 1%.

### 5.4 Sequence (ASCII)
```
Client -> API -> Outbox -> Broker -> Consumer -> SyncLog -> Target Systems
          |         |        |         |            |
          |         |        |         |            +--> Health/Status
          |         |        |         +--> DLQ on failures
          |         |        +--> Retry policy
          |         +--> Enqueue events
          +--> CRUD done
```

### 5.5 Production-ready Option (Kafka/RabbitMQ)
- Production có thể dùng Kafka/RabbitMQ để tăng throughput và durability.
- Trong phạm vi case study, dùng Outbox + Worker để tập trung vào logic tích hợp,
  đồng thời vẫn mô tả rõ kiến trúc broker ở mức design.
- Lợi ích khi triển khai thật:
  - Partitioning để scale theo domain.
  - Consumer groups để xử lý song song.
  - Retention policy và replay tốt hơn.

## 6) Mở rộng hệ thống
- Thêm adapter mới chỉ cần thêm file adapter và tên trong `integrations.js`.
- Hỗ trợ nhiều hệ thống đích (Payroll, Security, ...).

## 7) Gaps cần bổ sung
- Event broker thực tế (Kafka/RabbitMQ) và DLQ storage.
- Replay UI + monitoring dashboard triển khai thật.
- SLA/SLO monitoring ở production.
- Hiện tại chỉ có outbox worker (middleware-lite), chưa có broker chính thức.
