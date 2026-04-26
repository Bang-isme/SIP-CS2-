# Hướng Dẫn Demo Backend Bằng Postman

> Cập nhật: 2026-04-17

## 1. Postman Dùng Để Làm Gì

Postman nên được dùng như một fallback nhanh cho phần backend-safe flow:

- sign in
- health/readiness
- list employees
- integration metrics
- sync status

Nó không nên thay thế hoàn toàn browser demo cho `Payroll Service` và `Dashboard Service`.

## 2. File Cần Import

- [sip_cs_postman_collection.json](/D:/SIP_CS 2/SIP_CS/sip_cs_postman_collection.json)
- [sip_cs_demo_local.postman_environment.json](/D:/SIP_CS 2/SIP_CS/sip_cs_demo_local.postman_environment.json)

## 3. Chuẩn Bị

Chạy stack:

```powershell
npm run case3:stack:start
```

Sau đó mở:

- Payroll console: `http://127.0.0.1:4100/`
- Dashboard login: `http://127.0.0.1:4200/login`

Postman chủ yếu sẽ bám vào SA APIs.

## 4. Biến Môi Trường Chính

- `baseUrl = http://127.0.0.1:4000/api`
- `adminEmail = admin@localhost`
- `adminPassword = admin_dev`
- `token` được request signin lưu lại

## 5. Thứ Tự Nên Bấm

Folder nên dùng là `0. Demo Safe Flow`.

Thứ tự:

1. `Sign in and capture token`
2. `Get current authenticated profile`
3. `Get readiness probe`
4. `List employees`
5. `Get integration queue metrics`
6. `Get sync overview`
7. `Fetch backend-owned OpenAPI contract`

Nếu muốn prove Dashboard, quay lại browser ở `4200/login`.
Nếu muốn prove Payroll, quay lại browser ở `4100`.

## 6. Cách Giải Thích Response

### Signin

Nói:

> Request này cho thấy auth route là route thật của SA, token được cấp một lần và dùng lại cho các request sau.

### Readiness

Nói:

> Đây là evidence runtime cho local stack. Nhóm em dùng route readiness thay vì nói chung chung là "máy em đang chạy".

### List employees

Nói:

> Route này chứng minh source data tồn tại thật và backend đang pagination phía server.

### Integration queue metrics

Nói:

> Queue có lớp quan sát riêng, nên eventual consistency không phải là "không biết bên trong đang gì".

### Sync overview

Nói:

> Đây là một lớp evidence khác cho sync state, dùng khi cần explain queue và downstream propagation.

## 7. Điều Không Nên Bấm Trong Postman Demo Chính

Không nên bấm:

- create/update/delete employee
- create/update/delete alert
- retry/replay/recover routes
- sync retry routes

Lý do:

- đây là mutation thật
- dễ làm thay đổi baseline demo
- browser flow và verify script đã prove phần đó rõ hơn

## 8. Khi Nào Nên Dùng Postman Thay Vì Swagger

Dùng Postman khi:

- muốn chạy nhanh một safe flow đã có sẵn
- muốn lưu biến `token`
- muốn demo backend mà không cần mở nhiều tab Swagger

## 9. Câu Chốt

> Postman là backup cho SA/backend contract proof. Browser vẫn là nơi để chứng minh 3-service runtime: SA, Payroll và Dashboard là ba hệ thống đang chạy riêng.
