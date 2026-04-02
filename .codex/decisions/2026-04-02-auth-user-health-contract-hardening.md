# Decision: Auth, User, and Health Contract Hardening

Date: 2026-04-02
Status: accepted

## Context

Sau khi dashboard, alerts, integrations, sync, và employee APIs đã được harden theo hướng FE-follow-BE, phần còn lại của backend vẫn còn vài vùng legacy:

- `signin` ghi chú là nhận email hoặc username nhưng implementation chỉ query theo email.
- `GET /auth/logout` vẫn là mutation route duy nhất cho revoke session.
- `/users` còn cho payload roles lẫn giá trị hợp lệ và không hợp lệ đi qua theo kiểu partial match.
- `/users/:id` và role-mutation endpoints chưa reject sớm ObjectId sai format.
- `/health` chỉ check connection, chưa phản ánh migration readiness đã được backend enforce ở MySQL layer.
- OpenAPI bundle chưa cover chính xác auth/user/health surfaces đang dùng thật.

## Decision

Chuẩn hóa nốt `auth`, `user`, và `health` thành một phần của backend contract chính thức:

1. Thêm boundary validation helpers riêng cho auth/user.
2. Cho `signin` nhận `identifier`, legacy `email`, hoặc explicit `username`.
3. Chuyển `POST /auth/logout` thành route canonical và giữ `GET /auth/logout` như alias deprecated.
4. Reject `roles` invalid hoặc `userId` sai format bằng `422` trước khi vào persistence.
5. Tách `health` sang controller riêng và expose readiness kèm migration context.
6. Mở rộng `/api/contracts/openapi.json` để FE/operator tooling có machine-readable contract đúng với implementation thật.

## Consequences

### Positive

- Backend còn ít điểm lệch chuẩn hơn, nên FE có thể dựa vào OpenAPI + contract tests thay vì đoán từ behavior cũ.
- Login flow khớp hơn với intent/comment và dễ defend hơn trong viva.
- Logout semantics đúng REST hơn mà không phá caller cũ ngay lập tức.
- Health checks hữu ích hơn cho demo/ops vì bắt được drift ở migration layer.
- User-management không còn silent partial acceptance cho role payload sai.

### Trade-offs

- Spec và test phải cập nhật đồng bộ cho auth/user/health.
- `GET /auth/logout` vẫn còn tồn tại một thời gian vì compatibility.

## Evidence

- Code:
  - `src/controllers/auth.controller.js`
  - `src/controllers/user.controller.js`
  - `src/controllers/health.controller.js`
  - `src/utils/authContracts.js`
  - `src/utils/userContracts.js`
  - `src/contracts/openapi.contract.js`
- Tests:
  - `src/__tests__/auth.signin.security.test.js`
  - `src/__tests__/auth.logout.contract.test.js`
  - `src/__tests__/users.contract.test.js`
  - `src/__tests__/health.test.js`
  - `src/__tests__/contracts.routes.test.js`
