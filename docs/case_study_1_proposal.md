# Case Study 1 - The Proposal (Đề xuất giải pháp)

> Last Updated: 2026-02-03

## 1) Vấn đề và mục tiêu
- Hiện có 2 hệ thống riêng (HR và Payroll) nên mỗi lần tổng hợp báo cáo phải làm thủ công, chậm ra quyết định.
- Mục tiêu: xây dựng dashboard cho lãnh đạo để xem tổng quan, drilldown, và quản lý theo ngoại lệ.

## 2) Hai phương án khả thi
### Phương án A: Presentation-style integration (Pre-aggregation)
- Ý tưởng: không thay đổi hệ thống legacy, chạy batch tổng hợp dữ liệu vào bảng summary.
- Ưu điểm: triển khai nhanh, rủi ro thấp, hiệu năng dashboard rất tốt.
- Nhược điểm: dữ liệu không real-time, phụ thuộc lịch chạy batch.

### Phương án B: Functional integration (Near real-time sync)
- Ý tưởng: dữ liệu nhập 1 lần, sync gần real-time sang hệ thống còn lại qua middleware.
- Ưu điểm: dữ liệu cập nhật nhanh, giảm lệch thông tin.
- Nhược điểm: cần middleware, xử lý consistency phức tạp hơn.

## 3) So sánh nhanh
| Tiêu chí | Phương án A | Phương án B |
|---|---|---|
| Thời gian triển khai | Nhanh | Trung bình |
| Độ phức tạp | Thấp | Cao |
| Độ mới dữ liệu | Batch (theo lịch) | Gần real-time |
| Rủi ro thay đổi legacy | Thấp | Trung bình |

## 4) Kiến trúc sơ bộ
### Phương án A
- MongoDB (HR) + MySQL (Payroll) -> `aggregate-dashboard.js` -> Summary tables -> Dashboard API -> FE.

### Phương án B
- Employee CRUD -> SyncService -> ServiceRegistry -> Adapters -> SyncLog.

## 5) GUI sketch (mô tả)
- Header: tiêu đề + trạng thái hệ thống + refresh.
- KPI cards: Tổng payroll, total vacation, avg benefits, action items.
- Charts: Earnings by department, Vacation by demographics, Benefits by plan.
- Alerts: Anniversaries, High Vacation, Benefits Change, Birthday.
- Drilldown modal: filters + table + export.

## 6) Lifecycle & Schedule (gợi ý)
1. Tuần 1: Thu thập yêu cầu, xác nhận KPI và alerts.
2. Tuần 2: Thiết kế dữ liệu, aggregation, summary tables.
3. Tuần 3: FE dashboard + drilldown + alerts.
4. Tuần 4: Test plan, demo, tài liệu.

## 7) Vai trò đề xuất
- PM/Analyst: yêu cầu, ưu tiên, test criteria.
- Backend: aggregation + API + sync.
- Frontend: UI/UX + drilldown.
- QA: test plan + test results.

## 8) Deliverables
- Proposal doc (file này)
- Decision record (ADR)
- GUI sketch (ảnh hoặc Figma)
- Schedule & milestones
