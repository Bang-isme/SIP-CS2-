# Decision: Canonical Auth Guard Errors and Logout Alias Deprecation Signaling

Date: 2026-04-03
Status: accepted

## Context

Sau khi auth/user/health controllers đã được harden, một điểm lệch contract vẫn còn nằm ở middleware auth:

- `verifyToken` và role guards vẫn trả bare `{ message }` responses.
- FE/operator không có machine-readable error code ngay tại request boundary.
- `GET /auth/logout` đã được giữ lại vì compatibility nhưng chưa phát tín hiệu deprecation thực sự.

Điều này làm contract backend chưa thật sự nhất quán, vì một request có thể fail trước controller nhưng lại không theo chuẩn envelope mà phần còn lại của backend đang dùng.

## Decision

1. Thêm helper riêng cho auth guard responses để chuẩn hóa `success`, `message`, `code`, `requestId`.
2. Gắn stable codes cho các auth failure modes quan trọng:
   - `AUTH_TOKEN_MISSING`
   - `AUTH_UNAUTHORIZED`
   - `AUTH_TOKEN_REVOKED`
   - `AUTH_FORBIDDEN`
   - `AUTH_USER_NOT_FOUND`
3. Giữ `POST /auth/logout` là canonical route.
4. Với alias `GET /auth/logout`, trả thêm `Deprecation`, `Sunset`, và `Link` headers để contract migration có evidence rõ ràng.
5. Mở rộng OpenAPI error schema để include `code`.

## Consequences

### Positive

- FE có thể phân nhánh lỗi auth theo `code` thay vì parse text message.
- Operator/debug flow giữ được request trace thống nhất ngay cả khi request fail ở middleware.
- Deprecated route không còn là “legacy im lặng”; caller cũ vẫn chạy, caller mới có migration signal rõ.

### Trade-offs

- Log output trong test/dev tăng thêm một ít vì guard failures giờ được ghi có cấu trúc.
- Cần giữ đồng bộ test/spec/docs khi auth codes hoặc deprecation horizon thay đổi.

## Evidence

- Code:
  - `src/middlewares/authJwt.js`
  - `src/utils/authGuardResponses.js`
  - `src/routes/auth.routes.js`
  - `src/contracts/openapi.contract.js`
- Tests:
  - `src/__tests__/auth.guard.contract.test.js`
  - `src/__tests__/auth.logout.contract.test.js`
  - `src/__tests__/dashboard.test.js`
  - `src/__tests__/contracts.routes.test.js`
