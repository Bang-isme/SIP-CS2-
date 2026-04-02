# Case Study 3 - Test Plan (Sync & Consistency)

> Last Updated: 2026-03-19

## 1) Mục tiêu kiểm thử
- Xác nhận employee mutation path trả trạng thái đúng.
- Xác nhận source write semantics không bị mô tả sai.
- Xác nhận retry/fallback/recovery path hoạt động đúng mức hiện tại.

## 2) Test cases chính
1. Create employee hợp lệ -> `201` + `sync` object.
2. Update employee hợp lệ -> `200` + `sync` object.
3. Delete employee hợp lệ -> `200` + `sync` object.
4. Validation fail -> `400`.
5. Duplicate `employeeId` -> `409`.
6. Outbox enqueue fail -> source vẫn được lưu, response phản ánh `DIRECT_FALLBACK` hoặc `requiresAttention`.
7. Sync retry path cập nhật status hợp lệ.
8. Health/status endpoints phản ánh tình trạng integration.

## 3) Reference tests trong repo
- `src/__tests__/employee.controller.behavior.test.js`
- `src/__tests__/sync.retry.status.test.js`
- `tests/advanced/quality.test.js`
- `docs/advanced_test_plan.md`

## 4) Cách đọc kết quả đúng bản chất
- Nếu source lưu thành công nhưng downstream dispatch chưa chắc chắn, test cần chấp nhận response thành công có `sync.requiresAttention`, không ép phải là lỗi `500`.
- Những test này chứng minh eventual consistency path và failure semantics, không chứng minh ACID xuyên nhiều database.

## 5) Kết luận
- Bộ test của Case 3 nên được dùng để bảo vệ lập luận “source-first + controlled eventual consistency”.
- Không nên dùng bộ test này để claim strong consistency hoặc distributed transaction.
