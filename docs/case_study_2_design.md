# Case Study 2 - Design (Dashboard)

> Last Updated: 2026-02-07

## 1) Kiến trúc tổng quan
Dashboard được xây theo mô hình `presentation-style integration`: không thay hệ thống legacy, chỉ tích hợp dữ liệu HR + Payroll để hiển thị cho điều hành.

Luồng chính:
- MongoDB (HR) lưu hồ sơ nhân sự, phòng ban, cảnh báo.
- MySQL (Payroll) lưu earnings, vacation, benefits.
- Script tổng hợp chạy batch ghi về các bảng summary.
- API dashboard đọc từ summary để trả nhanh.
- FE hiển thị KPI, chart, alerts, drilldown.

## 2) Mô hình dữ liệu sử dụng
MongoDB:
- `Employee`, `Department`, `Alert`, `User`.

MySQL nghiệp vụ:
- `earnings`, `vacation_records`, `employee_benefits`, `benefits_plans`, `pay_rates`.

MySQL tổng hợp:
- `earnings_summary`
- `vacation_summary`
- `benefits_summary`
- `alerts_summary`
- `alert_employees`
- `earnings_employee_year` (snapshot hỗ trợ filter `minEarnings`)

Trường dẫn xuất trong Mongo để tăng tốc drilldown:
- `Employee.annualEarnings`
- `Employee.annualEarningsYear`

## 3) Batch aggregation (điểm cốt lõi hiệu năng)
Script:
- `node scripts/aggregate-dashboard.js`
- `node scripts/aggregate-dashboard.js 2026`

Khi nào chạy:
- Chạy định kỳ hằng ngày (khuyến nghị: sau giờ nghiệp vụ).
- Chạy ngay sau khi import dữ liệu lớn hoặc backfill payroll.
- Chạy lại khi thay đổi logic aggregate/alert.

Kết quả batch:
1. Tính tổng earnings/vacation theo các chiều CEO yêu cầu.
2. Tính benefits theo plan + shareholder status.
3. Sinh dữ liệu alert summary + danh sách nhân viên cảnh báo.
4. Cập nhật snapshot annual earnings vào Mongo để hỗ trợ `minEarnings`.

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

Hành vi khi thiếu dữ liệu tổng hợp:
- API trả thông báo cần chạy lại `aggregate-dashboard.js`.

## 5) Drilldown performance strategy
Chiến lược để giữ tốc độ:
- `bulk mode` khi `limit >= 1000` hoặc `bulk=1`.
- `summary=fast` để trả count nhanh trước.
- Hybrid totals: nếu count nhỏ (`<= 10,000`) thì chạy nền `summary=full` để cập nhật tổng chính xác.
- CSV export dùng streaming để tránh payload lớn.

Lưu ý nghiệp vụ:
- `total earnings` trong drilldown là tổng toàn bộ tập đã lọc, không phải chỉ 1 trang.
- Khi tập lọc rất lớn, UI có thể hiển thị `--` cho tổng để ưu tiên tốc độ.

## 6) Alerts design (manage-by-exception)
4 loại cảnh báo:
- Anniversary
- High vacation balance
- Benefits change impact payroll
- Birthday trong tháng hiện tại

Thiết kế hiển thị:
- Alert card hiển thị preview (5 dòng đầu).
- Modal hiển thị phân trang chi tiết.
- Định dạng ngày:
  - Anniversary: `X day(s)`
  - Birthday: hiển thị ngày (`Mon DD`) thay vì số âm.

## 7) UI modules
Các thành phần chính:
- `Dashboard.jsx` (layout điều hành)
- `EarningsChart.jsx`
- `VacationChart.jsx`
- `BenefitsChart.jsx`
- `AlertsPanel.jsx`
- `DrilldownModal.jsx`

Nguyên tắc:
- KPI và cảnh báo phải nhìn thấy ngay.
- Drilldown từ summary xuống record chi tiết.
- Giữ độ nhất quán về spacing, typography, trạng thái loading.

## 8) Vận hành chuẩn (production-like cho môn học)
Checklist mỗi ngày:
1. Chạy batch aggregate.
2. Kiểm tra health API.
3. Kiểm tra dữ liệu summary cập nhật.
4. Kiểm tra alert count có hợp lý.
5. Kiểm tra drilldown query mẫu của CEO (`minEarnings > X`).

Checklist sau import dữ liệu lớn:
1. Chạy lại aggregate ngay.
2. Đối chiếu count giữa summary và nguồn.
3. Spot-check 5-10 records qua drilldown.
4. Xuất CSV mẫu để xác nhận pipeline.

## 9) Validation checklist
- Dashboard summary trả nhanh với dữ liệu pre-aggregated.
- Drilldown limit lớn giữ trong ngưỡng chấp nhận (<10s cho bulk mode).
- Alerts đủ 4 loại và mở chi tiết đúng.
- Export CSV không timeout với tập dữ liệu lớn.
- Batch rerun không làm sai lệch số liệu (idempotent theo nguồn).

## 10) Status
- Case Study 2 ở mức `COMPLETE` theo phạm vi môn học.
- Gaps còn lại nằm ở Case 4/5 mở rộng hạ tầng thật (broker/network infra).
