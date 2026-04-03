# Operations Checklist - CEO Memo Alignment

> Last Updated: 2026-04-03
> Demo quick reference: `docs/demo_pass_checklist.md`

## 1) Objective

Checklist này dùng để vận hành dashboard ổn định theo CEO flow:
- Summary rõ ràng
- Alerts theo manage-by-exception
- Drilldown chính xác
- Integration recovery path hoạt động được

## 2) Daily Runbook

1. Chạy aggregate batch:
   - `node scripts/aggregate-dashboard.js`
2. Kiểm tra health:
   - `GET /api/health/live`
   - `GET /api/health`
   - `GET /api/health/ready`
   - hoặc chạy gọn `npm run doctor:local` để kiểm tra local runtime + dataset baseline một lượt
3. Kiểm tra summary APIs:
    - `GET /api/dashboard/earnings`
    - `GET /api/dashboard/vacation`
    - `GET /api/dashboard/benefits`
    - `GET /api/contracts/openapi.json`
    - `GET /api/contracts/docs/` nếu cần nhìn nhanh contract qua Swagger UI trong demo/viva
4. Kiểm tra alerts API:
   - `GET /api/alerts/triggered`
5. Kiểm tra drilldown và export:
   - `GET /api/dashboard/drilldown?minEarnings=100000`
   - `GET /api/dashboard/drilldown/export?...`

## 2.1) Local 500k Data Bootstrap

Khi cần dựng lại dataset lớn trên local Mongo + MySQL:
1. `node scripts/seed.js --profile enterprise --total 500000 --batch 5000`
2. `node scripts/aggregate-dashboard.js`
3. `node scripts/repair-cross-db-consistency.js`
4. Kiểm tra lại counts chính:
   - Mongo `employees=500000`
   - MySQL `vacation_records=500000`
   - MySQL `employee_benefits=500000`
   - MySQL `pay_rates=500000`
5. Chỉ demo khi repair script báo `total_deleted_orphan_rows: 0` hoặc sau khi đã rerun aggregate.

Mongo local runtime:
- Khuyến nghị cài `SIPLocalMongoDB` Windows service bằng `npm run mongo:local:service:install`
- Trước demo, kiểm tra nhanh bằng `npm run mongo:local:service:status`
- Sau khi đã cài service, không cần nhớ chạy `npm run mongo:local:start` thủ công nữa
- Nếu shell hiện tại không chạy elevated và service install fail, dùng fallback `npm run mongo:local:autostart:install` để Mongo tự lên khi user đăng nhập
- Backend local có wrapper riêng: `npm run backend:local:start`, `npm run backend:local:status`, `npm run backend:local:stop`
- Nếu muốn lên trọn stack nhanh trước demo: `npm run stack:local:start` rồi `npm run doctor:local`
- Nếu muốn chốt toàn bộ gate backend bằng một lệnh duy nhất trước demo/chấm: `npm run verify:backend`
- Nếu muốn chốt luôn cả backend + dashboard bằng một lệnh duy nhất: `npm run verify:all`

## 3) UI Operational Checks

1. Header freshness badge hiển thị hợp lệ: `Fresh`, `Stale`, hoặc `Unknown`.
2. Error state hiển thị cục bộ cho:
   - summary/KPI
   - alerts
   - integration queue
3. Refresh/retry buttons có loading/disabled state khi đang chạy.
4. Empty state không bị hiểu nhầm là system failure.
5. Benefits drilldown hiển thị đúng context benefits, không dùng nhãn earnings sai ngữ nghĩa.
6. `Alert Follow-up Queue` phải phản ánh đúng alert `Unassigned` / `Needs Re-review` trước khi user mở alert board.

## 4) Alert Configuration Checks

1. Đăng nhập bằng role phù hợp:
   - `moderator`, `admin`, hoặc `super_admin`
2. Mở `Alert Settings`.
3. Lưu thử một rule.
4. Xác nhận dashboard alert summaries refresh lại trong session hiện tại.
5. Nếu tắt rule, xác nhận alert summary không giữ alert cũ sau refresh.

## 5) Integration Queue (Case 4)

Quick checks:
1. `GET /api/integrations/events` (`admin` path)
2. Nếu cần giải thích một event cụ thể sau retry/replay:
   - `GET /api/integrations/events/:id/audit`
3. `GET /api/integrations/events/metrics`
4. Nếu có `FAILED/DEAD`:
   - retry một event: `POST /api/integrations/events/retry/:id`
   - retry all dead: `POST /api/integrations/events/retry-dead`
   - replay theo filter: `POST /api/integrations/events/replay`
5. Nếu có `PROCESSING` quá hạn:
   - recover stale processing: `POST /api/integrations/events/recover-stuck`
6. Xác nhận worker đang chạy từ startup logs.
7. Nếu filter/operator input sai, kỳ vọng API trả `422` với `errors[]`, không tự lặng lẽ bỏ qua filter sai.
8. Sau mỗi thao tác retry/replay/recover, kiểm tra response có `meta.actorId` và `meta.filters` để làm evidence operator path.
9. Với mọi lỗi demo cần chụp lại, ghi luôn `x-request-id` hoặc `meta.requestId` để backend trace được đúng request thay vì chỉ nói miệng “API bị lỗi”.
10. Nếu cần chứng minh một employee mutation đã đi qua worker hay direct fallback, đối chiếu `sync.correlationId` ở response với `integration_events.correlation_id` và `sync_log.correlation_id`.
11. Trước demo/chấm, gọi `GET /api/sync/logs?correlationId=<sync.correlationId>` và xác nhận row mới tạo có `correlation_id`, `status`, `action` đúng để tracing không bị đứt ở async path.
12. Trước demo/chấm, chạy `npm run db:migrate:mysql:status` và xác nhận `Missing required migrations: none` để tránh code mới chạy trên schema cũ.
13. Nếu FE/report cần xác nhận query param hay envelope chuẩn, mở `GET /api/contracts/openapi.json` thay vì suy đoán từ UI behavior.
14. Nếu cần walkthrough trực quan cho giảng viên hoặc teammate, mở `GET /api/contracts/docs/` để xem cùng contract đó qua Swagger UI thay vì đọc JSON thô.
15. Nếu cần test logout flow, dùng `POST /api/auth/logout`; chỉ dùng `GET /api/auth/logout` khi đang giữ compatibility với caller cũ.
16. Nếu login fail trong demo, nhớ rằng backend chấp nhận cả `identifier`, legacy `email`, và explicit `username`; lỗi chuẩn là `401 Invalid credentials`, không còn tách riêng “user not found” và “wrong password”.
17. Với lỗi authz/authn, ưu tiên đọc `code` trong body (`AUTH_TOKEN_MISSING`, `AUTH_UNAUTHORIZED`, `AUTH_FORBIDDEN`, `AUTH_TOKEN_REVOKED`) trước khi giải thích sự cố theo `message`.
18. Khi đọc server logs, ưu tiên lọc theo `requestId`, `context`, và `actorId`; các path chính giờ đã phát structured logs thay cho `console.*` rời rạc.
19. Test env giờ mặc định giảm log noise; nếu cần debug sâu test local thì chủ động bật `LOG_LEVEL` hoặc `HTTP_LOG_LEVEL=verbose`.
20. Với lỗi validation/not-found/conflict ngoài auth, cũng ưu tiên `code` trước `message`; các path auth/users/employee/dashboard/alerts/integrations/sync đã đi theo envelope chung.
21. Nếu gọi nhầm route trong demo, backend giờ trả JSON `404` với `code=API_ROUTE_NOT_FOUND`, không còn rơi về HTML error page.

## 6) Quality Gate Before Demo

Backend:
- `npm run verify:backend`
- `npm run lint`
- `npm test`
- `npm run test:advanced`

Frontend:
- `npm run verify:all`
- `cd dashboard && npm run lint`
- `cd dashboard && npm test`
- `cd dashboard && npm run build`

Expected:
- tất cả lệnh pass
- không có blocker ở production dependency audit (`npm audit --omit=dev`)

## 7) Incident Playbook

1. Xác định scope: summary, drilldown, alerts, hay integration queue.
2. Với summary mismatch: chạy lại `aggregate-dashboard.js`.
2.1. Nếu vừa reseed local dataset, luôn chạy theo thứ tự `seed -> aggregate -> repair`; đừng chạy riêng aggregate trên dữ liệu seed dở dang.
3. Với alert mismatch sau config change: refresh dashboard session; nếu cần, kiểm tra alert aggregate refresh path.
4. Nếu follow-up queue không khớp acknowledgement mới lưu: refresh alerts panel, rồi kiểm tra lại `GET /api/alerts/triggered`.
5. Với integration issue: mở queue panel, xem metrics, thử retry/replay/recover-stuck.
6. Nếu cần điều tra sâu hơn, xem row `integration_events` để lấy latest operator state và gọi `GET /api/integrations/events/:id/audit` để lấy full history.
7. Với issue sync employee, tra thêm `sync_log.correlation_id` để biết direct fallback/manual retry có đang nói về cùng workflow hay không.
8. Nếu cần replay lại evidence của một employee cụ thể, dùng `GET /api/sync/entity/employee/:employeeId` để lấy latest sync state trước khi mở raw log list.
9. Ghi lại command đã dùng, response, `requestId`, và nếu có thì luôn chụp cả `correlation_id` để evidence không bị rời rạc giữa queue và log.

## 8) Auth Quota Note

1. Nếu demo account đúng nhưng FE vẫn quay lại màn login ngay sau signin, kiểm tra response của `POST /api/auth/signin`.
2. Nếu thấy `503` với `AUTH_SESSION_STORAGE_UNAVAILABLE`, nguyên nhân là MongoDB đang over quota nên không ghi được token.
3. Khi đó có 2 lựa chọn rõ ràng:
   - giải phóng quota để giữ session persistence chuẩn
   - hoặc bật `ALLOW_STATELESS_JWT_FALLBACK=1` cho read-only demo mode rồi restart backend
4. Với bài `500000` records, lựa chọn khuyến nghị là không dùng Atlas free làm DB chính; dùng local Mongo trên `D:\MongoDB` để auth/session và HR dataset không cùng chết vì quota `512 MB`.
