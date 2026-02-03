# Case Study 3 - Data Consistency & Failure Scenarios

> Last Updated: 2026-02-03

## 1) Mục tiêu consistency
- Data entered once từ HR (Mongo) và sync sang Payroll (MySQL).
- Eventual consistency với retry và log theo dõi.

## 2) Luồng dữ liệu
1. API tạo/sửa/xóa employee trên MongoDB.
2. SyncService gọi ServiceRegistry để broadcast đến các adapter.
3. Adapter thực thi sync và ghi SyncLog (SUCCESS/FAILED).
4. RetryFailedSyncs đọc SyncLog FAILED và thử lại.

## 3) Các trạng thái và cửa sổ lệch dữ liệu
- PENDING: đã ghi vào HR nhưng chưa sync xong.
- FAILED: sync thất bại, dữ liệu có thể lệch tạm thời.
- SUCCESS: dữ liệu đồng bộ xong.

## 4) Kịch bản lỗi và xử lý
- MySQL down: adapter trả FAILED, SyncLog lưu lỗi, retry sau.
- Network tạm thời: retry lại đến khi SUCCESS.
- Data thiếu (employee bị xóa trước khi retry): ghi log và bỏ qua.

## 5) Cách phục hồi (reconcile)
- Sử dụng `POST /api/sync/retry` để retry batch.
- Có thể xây cron job chạy retry định kỳ.

## 6) Giới hạn hiện tại
- Chưa có message queue hoặc 2PC.
- Không có background reconciliation job mặc định.
