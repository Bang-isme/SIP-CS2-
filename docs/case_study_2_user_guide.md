# Case Study 2 - User Guide (Dashboard)

> Last Updated: 2026-04-02

## 1) Yêu cầu môi trường
- Node.js 18+.
- MongoDB và MySQL đang chạy.
- Backend và frontend đã cài dependencies.

## 2) Khởi động hệ thống

Backend:
1. Vào thư mục `SIP_CS`.
2. Chạy `npm install`.
3. Chạy `npm run dev`.

Frontend:
1. Vào thư mục `SIP_CS/dashboard`.
2. Chạy `npm install`.
3. Chạy `npm run dev`.

## 3) Chuẩn bị dữ liệu dashboard

Chạy batch tổng hợp:
- `node scripts/aggregate-dashboard.js`
- Có thể truyền năm, ví dụ: `node scripts/aggregate-dashboard.js 2026`

Khi nên chạy lại:
- Sau import dữ liệu lớn.
- Sau backfill payroll.
- Khi summary bị thiếu hoặc stale quá lâu.

## 4) Sử dụng dashboard

Các flow chính:
- Xem KPI cards cho earnings, vacation, benefits, alerts.
- Xem `Executive Action Center` để biết snapshot hiện tại có đủ an toàn cho CEO memo hay còn phải refresh / review queue / review alerts.
- Xem `Alert Follow-up Queue` để biết alert nào còn `Unassigned` hoặc `Needs Re-review`, rồi mở thẳng modal chi tiết từ queue đó.
- Mở chart earnings để xem so sánh current year và previous year.
- Mở vacation breakdown theo demographics và shareholder split.
- Mở benefits summary và benefits drilldown đúng theo ngữ cảnh benefits.
- Mở drilldown modal để lọc, tìm kiếm, phân trang, export CSV, dùng preset query, và lưu `saved views`.

Quick query hiện có:
- `minEarnings`
- department
- gender
- ethnicity
- employment type
- shareholder status
- benefit plan (khi mở benefits drilldown)

Preset support:
- `Memo Presets`: query một chạm theo đúng ngữ cảnh earnings / vacation / benefits.
- `Saved Views`: lưu bộ lọc hiện tại vào local browser để dùng lại khi demo hoặc viva follow-up.
- Preset không thay natural-language query; đây là lớp structured query thực dụng cho Case Study 2.

## 5) Alerts và quyền truy cập

Alert preview:
- Tất cả user đã đăng nhập có thể xem triggered alerts.
- Nếu alert đã được manager nhận xử lý, card sẽ hiện owner, note, timestamp, và trạng thái `Owned` hoặc `Needs Re-review`.
- `Alert Follow-up Queue` trên dashboard sẽ ưu tiên các alert chưa có owner note hoặc đã stale trước khi user mở panel đầy đủ.

Alert settings:
- Role được phép: `moderator`, `admin`, `super_admin`.
- Sau khi lưu alert rule, dashboard session hiện tại sẽ refresh alert summaries ngay.

Alert acknowledgement:
- Role được phép: `moderator`, `admin`, `super_admin`.
- Manager có thể mở alert detail modal, nhập note xử lý, và lưu acknowledgement cho snapshot hiện tại.
- Nếu summary snapshot thay đổi sau khi acknowledge, UI sẽ đổi trạng thái sang `Needs Re-review`.
- Follow-up queue có nút `Assign Owner` / `Re-review Alert` để mở đúng alert modal ngay từ dashboard rail.

Integration queue:
- Role được phép: `admin`, `super_admin`.
- Dùng để xem events, retry, replay, retry-dead, và recover stale `PROCESSING`.

## 6) Các lưu ý vận hành

- Nếu API báo thiếu summary, hãy chạy lại `aggregate-dashboard.js`.
- Alert summary có thể được refresh targeted khi cấu hình alert thay đổi.
- Earnings/vacation/benefits summary vẫn phụ thuộc vào batch schedule.
- Dashboard backend hiện validate chặt query/payload. Nếu FE hoặc saved view gửi filter sai (`year`, `context`, `isShareholder`, search quá dài...), API sẽ trả `422` với `errors[]`.
- `benefits_change` là payroll-impact cue để ưu tiên kiểm tra, không phải payroll recalculation engine.
- `Saved Views` lưu trong local browser hiện tại, không sync giữa các máy hoặc các tài khoản khác.
- `Executive Action Center` và `Alert Follow-up Queue` giờ ưu tiên snapshot từ `GET /api/dashboard/executive-brief`; FE chỉ render theo contract này thay vì tự suy luận state từ nhiều API rời.
- `Alert acknowledgement` hiện đang áp dụng theo từng alert category đang active, chưa đi xuống mức từng employee row.
- `GET /api/alerts/triggered` vẫn giữ vai trò card preview + modal data source, nhưng priority/status của follow-up queue đã có contract backend riêng trong executive brief snapshot.
- Backend response chuẩn cho dashboard là `{ success, data, meta }`; riêng `GET /api/alerts/:type/employees` còn giữ thêm legacy top-level fields để tương thích FE cũ trong giai đoạn chuyển tiếp.

## 7) Smoke-check trước demo
1. Đăng nhập đúng role.
2. Refresh dashboard.
3. Kiểm tra `Executive Action Center` có hiện đúng trạng thái `Ready / Monitor Closely / Action Required`.
4. Mở một drilldown bất kỳ, chạy một `Memo Preset`, rồi lưu một `Saved View`.
5. Nếu là benefits drilldown, đổi thử `Benefit Plan` filter.
6. Nếu có alert active, kiểm tra `Alert Follow-up Queue` có hiện đúng `Unassigned` hoặc `Needs Re-review`.
7. Bấm `Assign Owner` hoặc `Re-review Alert` từ follow-up queue để mở đúng modal alert.
8. Nếu có quyền, lưu acknowledgement note, rồi xác nhận queue/card đổi trạng thái phù hợp.
9. Nếu có quyền, lưu thử một alert rule và xác nhận summary alerts đổi theo.
10. Nếu là admin, kiểm tra queue panel có mở được metrics và recover actions.
