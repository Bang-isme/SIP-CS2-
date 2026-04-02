# Decision: Structured Runtime Logging Hardening for Main Backend Paths

Date: 2026-04-03
Status: accepted

## Context

Sau khi contract HTTP của backend đã khá sạch, một lớp legacy khác vẫn còn tồn tại:

- Nhiều path runtime chính còn dùng `console.error`, `console.warn`, `console.log`.
- Employee outbox fallback và auth quota-degrade có log text rời rạc, khó gắn với `requestId`.
- Registry/worker/startup paths vẫn phát log kiểu cũ, làm observability không đồng nhất.

Điều này không làm sai chức năng nhưng làm backend chưa thật sự “chuẩn” ở khía cạnh operator evidence và debugging.

## Decision

1. Mở rộng logger để `error` logs mang thêm metadata.
2. Thêm helper `buildRequestLogData` để controller logs dễ gắn `requestId`, `method`, `path`, `actorId`.
3. Đổi các `console.*` ở auth, employee, dashboard, alerts, service registry, outbox worker, auth seed, cache, security mock adapter, và product controller sang structured logger.
4. Hạ `AUTH_TOKEN_MISSING` từ `info` xuống `debug` để tránh log flood cho anonymous probes, trong khi vẫn giữ `AUTH_FORBIDDEN` và token revoked là warning-level signal.

## Consequences

### Positive

- Log backend nhất quán hơn với request tracing đã có.
- Demo/viva/operator flow có thể truy theo `requestId` và `context` rõ ràng hơn.
- Recoverable fallback paths không còn bị log như hard failure bằng `console.error`.

### Trade-offs

- Test output vẫn còn thấy một số structured logs ở warning/info level vì logger hiện ghi ra console transports.
- Cần giữ discipline này nếu thêm controller/service mới, nếu không codebase sẽ lại trộn hai kiểu logging.

## Evidence

- Code:
  - `src/utils/logger.js`
  - `src/utils/requestTracking.js`
  - `src/controllers/auth.controller.js`
  - `src/controllers/employee.controller.js`
  - `src/controllers/dashboard.controller.js`
  - `src/controllers/alerts.controller.js`
  - `src/registry/serviceRegistry.js`
  - `src/workers/integrationEventWorker.js`
  - `src/libs/initialSetup.js`
- Verification:
  - `npm run lint`
  - `npm test`
  - `npm run test:advanced`
