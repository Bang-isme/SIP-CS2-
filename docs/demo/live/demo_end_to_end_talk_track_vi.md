# Demo End-to-End Talk Track

> Cập nhật: 2026-04-17

## 1. Chuẩn Bị Trước Khi Demo

Chạy:

```powershell
cd "D:\SIP_CS 2\SIP_CS"
npm run case3:stack:start
```

Nói ngắn:

> Trước khi vào demo live, nhóm em start local stack để dựng lên 3 service riêng: SA, Payroll và Dashboard. Script này đồng thời warm dashboard summaries và prepare alert ownership baseline cho current snapshot.

Mở sẵn 3 URL:

- SA: `http://127.0.0.1:4000/`
- Payroll console: `http://127.0.0.1:4100/`
- Dashboard login: `http://127.0.0.1:4200/login`

## 2. Mở Đầu

Nói:

> Ở phiên bản hiện tại, nhóm em không demo một backend duy nhất. Nhìn thấy 3 process riêng: SA là source system, Payroll là downstream system, và Dashboard là reporting system cho CEO Memo.

Nếu cần, mở nhanh 3 health endpoints:

- `http://127.0.0.1:4000/api/health/live`
- `http://127.0.0.1:4100/api/health/live`
- `http://127.0.0.1:4200/api/health/live`

## 3. Đăng Nhập

Đăng nhập vào Dashboard:

- email: `admin@localhost`
- password: `admin_dev`

Nói:

> Auth vẫn thuộc SA. Access token do SA phát ra được dùng lại trên Payroll và Dashboard, nên nhóm em vẫn giữ một auth contract thống nhất.

## 4. Cho Thấy Dashboard Đang Ở Trạng Thái Sẵn Sàng

Dừng tại Dashboard overview và chỉ vào:

- freshness pill
- executive action center
- alert follow-up

Nói:

> Ở startup script, nhóm em warm summary tables và baseline lại current alert ownership. Vì vậy executive brief không bị kẹt ở `Action Required` vì data cũ. Khi demo, trạng thái mong muốn là `Ready for Memo`.

Nếu cần giải thích nhanh:

- dashboard không claim real-time
- dashboard dùng pre-aggregated summaries
- freshness metadata được expose rõ ràng

## 5. Tạo Employee Ở SA

Có 2 cách:

1. Dùng Swagger hoặc Postman gọi `POST /api/employee`
2. Dùng luồng admin employee management nếu cần demo UI

Payload demo tối thiểu:

```json
{
  "employeeId": "EMP-DEMO-2026-01",
  "firstName": "Case",
  "lastName": "Study",
  "employmentType": "Full-time",
  "payRate": 41.5,
  "payType": "SALARY",
  "vacationDays": 5,
  "paidToDate": 1000,
  "paidLastYear": 1200
}
```

Nói:

> Ở bước này source mutation chỉ xảy ra trong SA. SA ghi employee vào MongoDB trước, sau đó trả về `sync.status = QUEUED` để cho thấy consistency model hiện tại là eventual consistency.

## 6. Chuyển Sang Payroll Console

Mở `http://127.0.0.1:4100/`, nhập `employeeId` vừa tạo.

Nói:

> Đây là Payroll system riêng. Nó có port riêng, UI riêng và read API riêng. Sau khi SA worker xử lý outbox, Payroll service tự ghi pay rate và sync log vào MySQL của nó.

Cho thấy:

- current pay rate
- pay type
- latest sync log

## 7. Update Employee Để Cho Thấy Đồng Bộ Tiếp Tục

Tại SA, update:

- `payRate` từ `41.5` thành `55`
- `payType` thành `HOURLY`

Refresh Payroll console.

Nói:

> Ở lần update này, SA vẫn không ghi thẳng vào bảng payroll. SA chỉ forward mutation qua internal API. Payroll service mới là nơi sở hữu write path của `pay_rates` và `sync_log`.

## 8. Quay Lại Dashboard

Refresh Dashboard.

Nói:

> Dashboard là reporting layer riêng. Nó vẫn dùng cùng session auth, nhưng route đọc summary và alert nằm ở Dashboard service. Nhìn thấy executive brief vẫn `fresh` và action center vẫn `Ready for Memo`.

## 9. Nếu Cần Chứng Minh Automation

Chạy:

```powershell
npm run verify:case3
```

Nói:

> Đây là automated proof. Script này start stack, prepare dashboard baseline, sign in, create employee, poll Payroll đến khi đồng bộ xong, update, check dashboard freshness và action center, rồi delete employee và stop stack.

## 10. Câu Trả Lời Ngắn Khi Bị Hỏi Khó

### "Tại sao đây không phải monolith 2 DB?"

> Vì runtime đã tách thành 3 process và 3 port. SA, Payroll và Dashboard có route ownership riêng. SA không còn import SQL model của Payroll để ghi trực tiếp nữa.

### "Consistency ở đây là gì?"

> Eventual consistency có kiểm soát. Nhóm em có outbox, worker, retry, replay, recover-stuck và sync log để operator theo dõi được.

### "Dashboard có real-time không?"

> Không claim real-time. Dashboard dùng summary tables và expose freshness metadata. Startup script warm snapshot trước để tránh stale state trong demo.

## 11. Điều Không Nên Nói

Không nên nói:

- "ACID xuyên hệ thống"
- "Transactional outbox chuẩn"
- "Enterprise middleware production-grade"
- "Case 5 đã rollout production"

Nên nói:

- "same-repo multi-service runtime"
- "eventual consistency có kiểm soát"
- "Payroll tự sở hữu write path của MySQL"
- "Dashboard là reporting system riêng"
