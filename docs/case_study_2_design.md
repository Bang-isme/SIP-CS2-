# Case Study 2 - Design (Dashboard)

> Last Updated: 2026-04-02

## 1) Kiến trúc tổng quan
Dashboard được xây theo mô hình `presentation-style integration`: không thay thế hệ thống legacy, mà đọc dữ liệu HR + Payroll rồi tổng hợp thành executive views.

Luồng chính:
- MongoDB (HR) lưu employee master, alert config, user, department mapping.
- MySQL (Payroll) lưu earnings, vacation, benefits, integration events, và summary tables.
- Batch `aggregate-dashboard.js` tổng hợp earnings/vacation/benefits/alerts.
- Dashboard API đọc summary để trả nhanh.
- Drilldown API đọc dữ liệu chi tiết theo ngữ cảnh.

## 2) Mô hình dữ liệu được dùng

MongoDB:
- `Employee`
- `Department`
- `Alert`
- `User`

MySQL nghiệp vụ:
- `earnings`
- `vacation_records`
- `employee_benefits`
- `benefits_plans`
- `pay_rates`

MySQL tổng hợp:
- `earnings_summary`
- `vacation_summary`
- `benefits_summary`
- `alerts_summary`
- `alert_employees`
- `earnings_employee_year`

Trường dẫn xuất hỗ trợ drilldown/filter:
- `Employee.annualEarnings`
- `Employee.annualEarningsYear`

## 3) Batch aggregation và targeted refresh

Batch chính:
- `node scripts/aggregate-dashboard.js`
- `node scripts/aggregate-dashboard.js 2026`

Khi nào chạy:
- Theo lịch vận hành hằng ngày.
- Sau import/backfill payroll.
- Sau khi thay đổi logic aggregate hoặc cần rebuild summary.

Targeted refresh cho alerts:
- CRUD `/api/alerts` không đợi batch toàn cục.
- Sau khi lưu rule, backend gọi `refreshAlertAggregates()` và clear dashboard cache.
- UI thông báo rằng alert summaries được refresh ngay cho session dashboard hiện tại.

Phân biệt cần nói đúng:
- Earnings/vacation/benefits summary vẫn dựa trên batch.
- Alert summary có targeted refresh khi cấu hình alert thay đổi.

## 4) Thiết kế API

Summary endpoints:
- `GET /api/dashboard/earnings`
- `GET /api/dashboard/vacation`
- `GET /api/dashboard/benefits`

Drilldown:
- `GET /api/dashboard/drilldown`
- `GET /api/dashboard/drilldown/export`
- `GET /api/dashboard/departments`

Alerts:
- `GET /api/alerts/triggered`
- `GET /api/alerts/:type/employees`
- CRUD `/api/alerts`

Role split:
- `moderator/admin/super_admin`: quản lý alert configuration.
- `admin/super_admin`: integration recovery controls ở queue panel.

Hành vi khi thiếu dữ liệu tổng hợp:
- API trả hướng dẫn cần chạy lại `aggregate-dashboard.js`.

Contract rules để FE bám theo:
- Canonical response cho dashboard APIs là `{ success, data, meta }`.
- `GET /api/dashboard/executive-brief` là backend-owned snapshot cho `Executive Action Center` và `Alert Follow-up Queue`: BE trả sẵn `freshness`, `alerts.followUp`, `integration`, `actionCenter`, để FE không còn phải tự suy luận priority/tone từ nhiều endpoint rời.
- `GET /api/alerts/:type/employees` vẫn giữ legacy top-level fields (`employees`, `total`, `page`, `limit`, `totalPages`) để không làm vỡ FE cũ, nhưng canonical contract đã được đưa vào `data.employees` + `meta`.
- Invalid query/payload ở dashboard + alert config path trả `422` với `message` và `errors[]`, thay vì để controller tự parse mơ hồ.
- Dashboard/alerts/auth-guard responses giờ đều mang `x-request-id`; nếu response có `meta` thì `meta.requestId` là correlation token chuẩn để FE/logs/demo evidence cùng tham chiếu một request.
- Query text được normalize/escape ở backend trước khi đi vào Mongo regex hoặc SQL `LIKE`.
- Drilldown summary path giờ tôn trọng `year` client gửi lên; không còn lẫn `currentYear` mặc định trong aggregate lookups.
- Alert acknowledgement/follow-up logic được gom vào utility dùng chung để `GET /api/alerts/triggered` và `GET /api/dashboard/executive-brief` không bị lệch nhau về `Owned` / `Needs Re-review` / `Unassigned`.

## 5) Drilldown strategy

Chiến lược để giữ tốc độ:
- `bulk mode` khi `limit >= 1000` hoặc `bulk=1`.
- `summary=fast` để trả count nhanh trước.
- Với tập nhỏ hơn, UI có thể trigger `summary=full` để lấy tổng chính xác hơn.
- CSV export dùng streaming.
- CSV export earnings path flush theo employee batch và query `earnings_employee_year` theo `employee_id IN (...)` của từng chunk, tránh preload toàn bộ dữ liệu năm vào RAM.

Các ngữ cảnh quan trọng:
- Earnings drilldown dùng ngữ nghĩa earnings.
- Benefits drilldown đã tách đúng khỏi earnings context.
- Quick filter `minEarnings` chỉ dùng khi phù hợp với earnings context.

## 6) Alerts design (manage-by-exception)

4 loại cảnh báo:
- Anniversary
- High vacation balance
- Benefits change impact payroll
- Birthdays in current month

Chi tiết đã triển khai:
- Alert cards có preview.
- Modal có pagination qua `alert_employees`.
- `benefits_change` không còn chỉ báo “recent change”, mà mang payroll-impact cues:
  - plan
  - annual paid amount
  - effective date
  - last change date
  - impact code

## 7) UI modules

Các thành phần chính:
- `Dashboard.jsx`
- `EarningsChart.jsx`
- `VacationChart.jsx`
- `BenefitsChart.jsx`
- `AlertsPanel.jsx`
- `AlertSettingsModal.jsx`
- `DrilldownModal.jsx`
- `IntegrationEventsPanel.jsx` (Case 4 ops view)

Nguyên tắc UI:
- Summary và alert phải thấy ngay.
- Freshness/error state phải rõ.
- Drilldown phải giải thích đúng ngữ cảnh dữ liệu.
- Business controls và operations controls được tách vai trò.

## 8) Validation checklist
- Summary trả nhanh từ pre-aggregated tables.
- Drilldown lớn giữ được thời gian phản hồi chấp nhận được.
- Alerts đủ 4 loại, preview và modal khớp.
- Alert settings lưu xong thì session hiện tại thấy alert summaries được refresh.
- CSV export không phụ thuộc vào tải hết dữ liệu lên frontend.
- Invalid dashboard filters (`year`, `context`, `isShareholder`, pagination, search length) phải fail rõ ràng bằng `422`.
- FE có thể dựa vào `meta.dataset`, `meta.filters`, `meta.totalPages` để render state thay vì suy ngược từ route.

## 9) Kết luận
- Case Study 2 đang ở mức `implemented` và là phần mạnh nhất của repo.
- Các gap lớn còn lại nằm ở middleware-grade integration và production infra, không nằm ở executive dashboard core.
