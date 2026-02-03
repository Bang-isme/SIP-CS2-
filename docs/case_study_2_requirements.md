# Case Study 2 - Requirements (Dashboard)

> Last Updated: 2026-02-03

## 1) Functional Requirements
- Dashboard tổng hợp earnings theo shareholder/gender/ethnicity/emp-type/department (current + previous year).
- Dashboard tổng hợp vacation days theo shareholder/gender/ethnicity/emp-type (current + previous year).
- Average benefits theo plan + shareholder status.
- Drilldown từ summary vào danh sách chi tiết.
- Alerts: anniversary, high vacation balance, benefits change, birthday trong tháng.
- Export dữ liệu drilldown ra CSV.

## 2) Non-functional Requirements
- Summary endpoints trả về < 100ms khi có dữ liệu pre-aggregated.
- Drilldown phải đáp ứng tốt với tập dữ liệu lớn (bulk mode, summary fast).
- Bảo mật: JWT cho tất cả API dashboard.
- Không làm đổi schema legacy (ưu tiên presentation-style).

## 3) Data Freshness
- Dữ liệu summary phụ thuộc vào batch `node scripts/aggregate-dashboard.js`.
- Khi dữ liệu thay đổi lớn cần chạy lại aggregation.

## 4) Constraints
- Không thay đổi hệ thống HR/Payroll hiện hữu.
- Không yêu cầu real-time tuyệt đối cho dashboard tổng quan.

## 5) Out of Scope
- NLP query hoàn chỉnh.
- Middleware/2PC cho consistency tuyệt đối.
