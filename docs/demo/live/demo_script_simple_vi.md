# Demo Script Đơn Giản - Một Người Nói

> Cập nhật: 2026-04-17
> Mục tiêu: đây là bản script để đọc demo bình thường trên lớp, không chia vai 3 người, không cần nhớ quá nhiều.

## 1. Trước Khi Vào Lớp

Chạy:

```powershell
cd "D:\SIP_CS 2\SIP_CS"
npm run case3:stack:start
```

Mở sẵn 3 tab:

- SA: `http://127.0.0.1:4000/`
- Payroll: `http://127.0.0.1:4100/`
- Dashboard login: `http://127.0.0.1:4200/login`

Nếu cần kiểm tra nhanh toàn bộ flow trước giờ vào lớp:

```powershell
npm run verify:all
```

Nếu chỉ muốn check hẹp riêng integrated path của Case 3:

```powershell
npm run verify:case3
```

Nếu muốn bảo đảm panel alert nhìn thấy đủ 4 loại ngay trước lúc demo:

```powershell
npm run demo:dashboard:prepare
```

Lưu ý: `verify:all` hiện đã bao gồm luôn proof của Case 3. `verify:case3` chỉ là preflight hẹp hơn và sẽ tự stop stack khi chạy xong, nên sau đó phải `case3:stack:start` lại nếu muốn demo tay.

---

## 2. Lời Mở Đầu 30-45 Giây

Nói:

> Hôm nay em demo hệ thống giải bài toán CEO Memo theo hướng System Integration. Bản hiện tại không còn là một backend duy nhất nối với hai database, mà đã tách thành 3 runtime riêng.

> Hệ thống gồm SA là source system, Payroll là downstream system, và Dashboard là reporting system cho management.

> Trong demo này, em sẽ cho thấy 3 việc: một là dashboard phục vụ CEO Memo, hai là luồng đồng bộ từ SA sang Payroll, và ba là phần monitoring cho integration queue nếu thầy muốn xem sâu hơn.

---

## 3. Mở 3 Hệ Thống

Làm:

1. Mở SA tab.
2. Mở Payroll tab.
3. Mở Dashboard tab.

Nói:

> Đây là SA trên port 4000, đây là Payroll trên port 4100, và đây là Dashboard trên port 4200.

> Cách tách này giúp hệ thống dễ defend hơn cho Case Study 3, vì mình thấy được source system, downstream system, và reporting system chạy riêng thay vì một app duy nhất.

Nếu thầy muốn nhìn nhanh health:

- `http://127.0.0.1:4000/api/health/live`
- `http://127.0.0.1:4100/api/health/live`
- `http://127.0.0.1:4200/api/health/live`

---

## 4. Đăng Nhập Dashboard

Làm:

- Đăng nhập bằng:
  - email: `admin@localhost`
  - password: `admin_dev`

Nói:

> Auth vẫn thuộc SA. Sau khi đăng nhập, Dashboard dùng session đó để gọi các route reporting riêng của Dashboard Service.

---

## 5. Cho Thấy Dashboard Đang Sẵn Sàng

Làm:

Dừng tại trang tổng quan và chỉ vào:

- KPI row
- freshness badge
- executive brief
- action center
- alerts panel đủ 4 categories nếu đang làm live demo CEO Memo

Nói:

> Đây là phần mạnh nhất của nhóm em trong Case Study 2. Dashboard tổng hợp earnings, vacation, benefits, alerts và cho phép drilldown.

> Ở startup, stack đã warm summary và baseline alert ownership, nên trạng thái mong muốn khi demo là freshness `Fresh` và action center `Ready for Memo`.

> Em không claim dashboard là realtime. Đây là reporting system dùng pre-aggregated summaries, nhưng có freshness metadata để người dùng biết dữ liệu mới đến đâu.

> Nếu ngay tại lớp panel alert chưa hiện đủ 4 categories, em chạy `npm run demo:dashboard:prepare` để re-baseline dataset demo. Đây là bước prep cho live demo, không phải claim rằng production runtime lúc nào cũng tự sinh đủ 4 loại.

---

## 6. Tạo Employee Ở SA

Làm:

- Dùng Swagger hoặc Postman ở SA gọi `POST /api/employee`

Payload demo:

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

> Ở bước này, source-of-truth chỉ được ghi ở SA. Hệ thống trả về `sync.status` và `sync.mode` để chứng minh consistency model hiện tại là eventual consistency có kiểm soát.

> Nếu happy path, response sẽ cho thấy event đã được queue để worker xử lý.

Nếu thầy hỏi cạnh kỹ thuật:

> SA ghi source record vào MongoDB trước, sau đó enqueue event vào Mongo outbox của SA.

---

## 7. Chuyển Sang Payroll

Làm:

- Sang Payroll console
- Nhập `employeeId` vừa tạo

Cho thấy:

- current pay rate
- pay type
- sync log

Nói:

> Đây là Payroll system riêng. Nó có UI riêng, route riêng, và evidence riêng.

> Điểm quan trọng ở bản hiện tại là SA không còn ghi thẳng vào bảng payroll nữa. SA chỉ gọi internal API, còn Payroll Service mới là nơi sở hữu write path của `pay_rates` và `sync_log`.

---

## 8. Update Employee Để Cho Thấy Đồng Bộ Tiếp Tục

Làm:

- Quay lại SA
- Update `payRate` từ `41.5` thành `55`
- Update `payType` thành `HOURLY`
- Refresh Payroll console

Nói:

> Ở lần update này, mình thấy tiếp một luồng đồng bộ nữa. Nghĩa là source write vẫn ở SA, còn downstream payroll evidence vẫn do Payroll sở hữu.

> Đây là cách nhóm em defend Case Study 3: data entered once ở source system, sau đó được đồng bộ sang downstream system với trace và recovery path rõ ràng.

---

## 9. Quay Lại Dashboard

Làm:

- Refresh Dashboard overview
- Nếu cần, mở thêm Earnings hoặc Alerts

Nói:

> Dashboard là reporting layer riêng cho CEO Memo. Sau khi có source và downstream systems, Dashboard đọc read-model và summary để phục vụ management.

> Em có thể drilldown từ summary xuống detail, filter theo department hoặc `minEarnings`, và export CSV nếu cần.

---

## 10. Nếu Muốn Cho Thấy Case 4

Làm:

- Mở `Integration Exceptions`

Nói:

> Đây là phần middleware-lite của nhóm em. Queue monitor cho thấy backlog, actionable events, retry, replay, và recover-stuck.

> Em không claim đây là Kafka hay enterprise middleware stack. Em chỉ claim nhóm em đã implement được outbox-style queue, worker, retry/replay, và recovery path ở mức coursework.

Nếu cần tạo state demo:

```powershell
npm run demo:queue:warning
npm run demo:queue:critical
npm run demo:queue:cleanup
```

---

## 11. Lời Kết 20-30 Giây

Nói:

> Tóm lại, phần nhóm em muốn bảo vệ là: Case 2 giải được bài toán dashboard cho CEO Memo, Case 3 giải được bài toán sync từ SA sang Payroll theo eventual consistency có kiểm soát, và Case 4 đã có monitor và recovery path ở mức middleware-lite.

> Những gì nhóm em không overclaim là ACID xuyên hệ thống, transactional outbox chuẩn, hay production-grade middleware.

---

## 12. Câu Trả Lời Rất Ngắn Nếu Bị Hỏi Đột Ngột

### "Đây có phải monolith 2 DB không?"

> Không. Runtime hiện tại tách thành SA, Payroll và Dashboard chạy riêng.

### "Case 3 có ACID không?"

> Không. Nhóm em bảo vệ theo eventual consistency có kiểm soát.

### "Tại sao SA không ghi thẳng payroll DB?"

> Bản hiện tại đã đổi boundary rồi. SA gọi internal API, còn Payroll Service tự ghi MySQL của nó.

### "Dashboard có realtime không?"

> Không claim realtime. Dashboard dùng summary tables và freshness metadata.

---

## 13. Câu Không Nên Nói

Không nên nói:

- "ACID xuyên MongoDB và MySQL"
- "Transactional outbox chuẩn"
- "Enterprise middleware stack"
- "Case 5 đã production-ready"

Nên nói:

- "same-repo multi-service runtime"
- "eventual consistency có kiểm soát"
- "Payroll sở hữu write path của MySQL"
- "Dashboard là reporting system riêng"
