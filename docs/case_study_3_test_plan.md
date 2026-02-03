# Case Study 3 - Test Plan (Sync & Consistency)

> Last Updated: 2026-02-03

## 1) Mục tiêu kiểm thử
- Xác nhận sync hoạt động đúng cho CREATE/UPDATE/DELETE.
- Xác nhận SyncLog ghi trạng thái chính xác.
- Xác nhận retry xử lý lỗi tạm thời.

## 2) Test Cases
1. Create Employee -> SyncLog SUCCESS.
2. Update Employee -> SyncLog SUCCESS.
3. Delete Employee -> SyncLog SUCCESS.
4. Force MySQL down -> SyncLog FAILED.
5. Retry sau khi MySQL up -> SyncLog RESOLVED/SUCCESS.
6. Duplicate retry không tạo dữ liệu trùng.
7. Health endpoints trả trạng thái đúng.

## 3) Reference Tests
- `SIP_CS/tests/advanced/quality.test.js` (ACID, extensibility).
- `SIP_CS/docs/advanced_test_plan.md`.
