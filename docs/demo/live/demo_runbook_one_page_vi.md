# One-Page Demo Runbook

> Cập nhật: 2026-04-17
> Dùng file này khi cần một flow demo ngắn, ổn định và dễ xử lý lỗi tại chỗ.

## 1. Preflight trước khi vào lớp

Chạy ở repo root:

```powershell
cd "D:\SIP_CS 2\SIP_CS"
npm run verify:all
```

Ý nghĩa:

- kiểm tra backend gate
- kiểm tra frontend gate
- kiểm tra luôn split-runtime proof của Case 3

Nếu không còn nhiều thời gian, ít nhất chạy:

```powershell
npm run verify:case3
```

## 2. Start demo runtime

```powershell
cd "D:\SIP_CS 2\SIP_CS"
npm run case3:stack:start
```

Mở 3 tab:

- SA: `http://127.0.0.1:4000/`
- Payroll: `http://127.0.0.1:4100/`
- Dashboard login: `http://127.0.0.1:4200/login`

Không dùng `verify:case3` khi sắp demo trực tiếp, vì lệnh đó tự stop stack sau khi xong.

Tài khoản demo:

- email: `admin@localhost`
- password: `admin_dev`

## 3. Nếu cần bảo đảm đủ 4 alert types

`case3:stack:start` mặc định đã prepare dashboard demo. Nếu cần re-baseline ngay trước lúc trình bày:

```powershell
npm run demo:dashboard:prepare
```

Cách nói an toàn:

- script này chuẩn bị demo evidence để đủ 4 alert types hiện lên ổn định
- đây là bước prep cho live demo, không phải claim runtime business lúc nào cũng tự sinh đủ 4 loại

## 4. Flow demo 5-7 phút

1. SA home
   - Nói: `SA / HR Service` là source-of-truth system.
   - Chỉ vào `Launch Demo Surfaces` để thấy Dashboard và Payroll là 2 surface riêng.

2. Dashboard login
   - Đăng nhập vào Dashboard.
   - Dừng ở `Executive Overview`.
   - Chỉ vào:
     - freshness `Fresh`
     - action center `Ready for Memo`
     - alerts panel có đủ 4 categories
   - Nói: đây là phần mạnh nhất của Case 2.

3. SA -> Payroll
   - Mở `OpenAPI docs` từ SA hoặc dùng Postman.
   - Gọi `POST /api/employee` hoặc `PUT /api/employee/:id`.
   - Ghi lại:
     - `employeeId`
     - `sync.correlationId`
   - Nói: SA ghi source record trước, sau đó dispatch tích hợp theo eventual consistency có kiểm soát.

4. Payroll proof
   - Qua `Payroll Service Console`.
   - Nhập `employeeId`.
   - Bấm `Open payroll record`.
   - Chỉ vào:
     - `Active pay rate`
     - `Pay type`
     - `Recent sync evidence`
   - Nói: Payroll là downstream system riêng và sở hữu write path của MySQL.

5. Dashboard close-out
   - Quay lại Dashboard.
   - Nếu cần, mở `Alerts` hoặc `Analytics`.
   - Nói: Dashboard là reporting layer riêng, không phải source write path.

6. Optional deep-dive
   - Chỉ mở `Operations` nếu giảng viên hỏi về queue metrics, retry, replay hoặc recover-stuck.
   - Không biến phần này thành happy path chính.

## 5. Câu trả lời cực ngắn nếu bị hỏi nhanh

- `Đây có phải monolith 2 DB không?`
  - Không. Đây là same-repo multi-service runtime: SA, Payroll, Dashboard.

- `Case 3 có ACID không?`
  - Không. Nhóm em bảo vệ theo eventual consistency có kiểm soát.

- `Làm sao biết path tích hợp chạy thật?`
  - `verify:all` hiện đã bao gồm `verify:case3`.

- `4 alerts có phải mock không?`
  - Logic alert là thật; `demo:dashboard:prepare` chỉ giúp dataset demo hiển thị ổn định đủ 4 loại.

## 6. Recovery nhanh tại chỗ

- Nếu 1 tab không lên:
  - `Ctrl+F5`
  - nếu vẫn lỗi: `npm run case3:stack:stop` rồi `npm run case3:stack:start`

- Nếu Dashboard không vào được:
  - mở lại `http://127.0.0.1:4200/login`
  - đăng nhập lại bằng `admin@localhost / admin_dev`

- Nếu Payroll chưa thấy record mới:
  - đợi 3-5 giây
  - bấm `Open payroll record` lại
  - đối chiếu `sync.correlationId` từ response SA

- Nếu cần re-baseline alerts:
  - `npm run demo:dashboard:prepare`

## 7. Evidence mở nhanh

- Proof bundle: `docs/demo/evidence/2026-04-16/README.md`
- 3 ảnh nên mở nhanh:
  - `screenshots/sa-home.png`
  - `screenshots/dashboard-ready-for-memo.png`
  - `screenshots/payroll-record.png`
