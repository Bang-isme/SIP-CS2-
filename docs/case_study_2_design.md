# Case Study 2 - Design (Dashboard)

> Last Updated: 2026-02-03

## 1) Kiến trúc tổng quan
- HR System: MongoDB (employees, departments, alerts, users).
- Payroll System: MySQL (earnings, vacation, benefits).
- Batch Aggregation: `scripts/aggregate-dashboard.js`.
- Summary Tables: `EarningsSummary`, `VacationSummary`, `BenefitsSummary`, `AlertsSummary`, `AlertEmployee`.
- API Layer: `dashboard.controller.js`, `alerts.controller.js`.
- Frontend: React + Vite (Dashboard, AlertsPanel, DrilldownModal).

## 2) Data Flow chính
1. Batch chạy theo ngày hoặc sau khi import dữ liệu lớn.
2. Batch tổng hợp -> ghi vào summary tables.
3. Dashboard API đọc summary tables để trả dữ liệu nhanh.
4. Drilldown đọc Mongo + snapshot earnings, có export CSV.

## 3) Drilldown & Performance
- Bulk mode khi `limit >= 1000` hoặc `bulk=1`.
- Summary fast mode khi `summary=fast`.
- Snapshot earnings trong Mongo để lọc minEarnings nhanh.
 - Hybrid Summary Totals: nếu fast mode và COUNT <= 10,000 thì chạy nền `summary=full` để cập nhật Total Earnings/Benefits/Vacation sau.

## 4) Alerts
- AlertEmployee table phục vụ pagination lớn.
- Triggered alerts API lấy preview từ AlertEmployee.

## 5) UI Layout
- Header: tiêu đề + trạng thái hệ thống + refresh.
- KPI cards: 4 thẻ chỉ số chính.
- Charts: Earnings by Department, Vacation, Benefits.
- Alerts panel: 4 loại cảnh báo.
- Drilldown modal: filters, table, export.

## 6) Error Handling
- Nếu thiếu summary tables -> trả 404 với hướng dẫn chạy batch.
- Drilldown export trả CSV streaming để tránh payload lớn.
