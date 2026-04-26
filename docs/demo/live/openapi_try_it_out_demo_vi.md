# Hướng Dẫn Swagger / OpenAPI Try It Out

> Cập nhật: 2026-04-17

## 1. Mục Đích Của Swagger Trong Buổi Demo

Swagger ở `http://127.0.0.1:4000/api/contracts/docs/` nên được dùng để chứng minh:

- backend có contract rõ ràng
- auth, health, employee, integration routes là route thật
- frontend/operator không cần đoán API từ source code

Swagger không phải là bằng chứng duy nhất cho 3-service runtime. Phần prove `Payroll` và `Dashboard` vẫn nên mở bằng browser ở `4100` và `4200`.

## 2. Chuẩn Bị

Trước khi mở Swagger, chạy:

```powershell
npm run case3:stack:start
```

Nói ngắn:

> Nhóm em start stack trước để có 3 service running. Swagger được mở trên SA để chứng minh contract auth và source-system APIs. Payroll và Dashboard sẽ được mở riêng ở browser.

## 3. Thứ Tự Nên Bấm

Thứ tự an toàn:

1. `POST /auth/signin`
2. `GET /auth/me`
3. `GET /health`
4. `GET /health/live`
5. `GET /employee?page=1&limit=2`
6. `GET /integrations/events/metrics`
7. `GET /sync/status`

Nếu cần thêm:

8. `GET /contracts/openapi.json`

Không cần cố gắng demo full Dashboard hay Payroll trong Swagger.

## 4. Body Signin Nên Dùng

```json
{
  "identifier": "admin@localhost",
  "password": "admin_dev"
}
```

## 5. Điều Nên Nói Ở Từng Route

### `POST /auth/signin`

Nói:

> Đây là auth contract thật của SA. Access token được SA phát ra và được các service khác chấp nhận lại.

### `GET /auth/me`

Nói:

> Route này chứng minh token đang hợp lệ và role được backend resolve đúng.

### `GET /health`

Nói:

> Đây là evidence runtime, không phải cảm giác "máy em đang chạy". SA cho thấy readiness của dependency mà nó cần ở runtime.

### `GET /employee?page=1&limit=2`

Nói:

> Route này chứng minh source-system data đang tồn tại thật, có pagination phía server, và không phải frontend tự tạo data.

### `GET /integrations/events/metrics`

Nói:

> Đây là lớp quan sát cho eventual consistency. Nhóm em có queue visibility, không chỉ có luồng đồng bộ "ẩn" ở bên trong.

### `GET /sync/status`

Nói:

> Route này chứng minh sync state được track riêng, nên khi downstream chậm hoặc lỗi thì operator vẫn có chỗ để kiểm tra.

## 6. Điều Không Nên Làm Trong Swagger

Không nên bấm trong demo chính:

- create/update/delete employee
- create/update/delete alert
- retry/replay/recover integration
- retry sync logs

Lý do:

- các request này là mutation thật
- dễ làm thay đổi baseline demo
- nhóm đã có browser và verify script để prove luồng write an toàn hơn

## 7. Cách Nói Về Dashboard Và Payroll Khi Đang Mở Swagger

Nếu giảng viên hỏi:

> "Swagger này có chứng minh được Dashboard và Payroll là hệ thống riêng không?"

Trả lời:

> Swagger ở đây chứng minh contract của SA. Còn proof 3-system runtime sẽ được mở song song bằng browser: Payroll console ở `4100` và Dashboard login ở `4200`.

## 8. Câu Chốt

> Swagger được dùng để chứng minh backend contract rõ ràng. Còn demo runtime sẽ được chứng minh bởi 3 port riêng, 3 health endpoints, Payroll console, Dashboard UI, và script `npm run verify:case3`.
