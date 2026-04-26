# Group 11 - Script Trình Bày Slide

> Cập nhật theo codebase hiện tại ngày 2026-04-19

File này dùng cho phần nói trên slide. File này không thay thế runbook thao tác live demo.

## 1. Mạch trình bày ngắn gọn

Nên đi theo mạch sau:

1. Bài toán từ CEO Memo
2. Vì sao đây là bài toán System Integration
3. Kiến trúc hiện tại và boundary giữa các hệ
4. Dashboard đang giải quyết Case 2 như thế nào
5. Cơ chế consistency của Case 3
6. Chất lượng kỹ thuật và giới hạn hiện tại

## 2. Lời mở đầu gợi ý

> Bài toán của nhóm em xuất phát từ CEO Memo. Công ty có dữ liệu nhân sự và dữ liệu payroll đi qua nhiều hệ khác nhau, nhưng người quản lý chưa có một nơi tổng hợp để nhìn earnings, vacation, benefits, alert follow-up và trạng thái đồng bộ một cách nhanh và có ngữ cảnh.

## 3. Vì sao đây là bài System Integration

> Nhóm em xem đây là bài System Integration vì nó có ba lớp tích hợp cùng lúc. Lớp thứ nhất là presentation integration cho management qua Dashboard. Lớp thứ hai là reporting/read-model integration để tạo summary, chart và drilldown. Lớp thứ ba là functional integration để đẩy thay đổi từ SA sang Payroll với cơ chế eventual consistency có kiểm soát.

## 4. Lời giải thích kiến trúc

> Phiên bản hiện tại không còn là một backend duy nhất nối với hai database. Runtime đã tách thành ba service chạy riêng: SA trên cổng 4000, Payroll trên cổng 4100, và Dashboard trên cổng 4200.

> SA sở hữu authentication, employee CRUD và Mongo outbox. Payroll sở hữu payroll write path trong MySQL. Dashboard sở hữu reporting layer, executive brief, analytics và alert review.

## 5. Lời giải thích consistency

> Nhóm em không claim ACID xuyên MongoDB và MySQL. Nhóm em chọn eventual consistency có kiểm soát, và bù lại bằng source-first write, Mongo outbox, worker, retry, replay, recover-stuck, sync log và correlation trace.

## 6. Lời giải thích Dashboard

> Dashboard là reporting system riêng cho Case Study 2. Nó đọc summary/read-model data để tạo executive brief, KPI, analytics charts, page-level drilldown, alert follow-up và operator workspace.

> Ở mức giao diện, người dùng có thể vào Overview để xem brief tổng hợp, vào Analytics để xem chart và mở drilldown, vào Alerts để review queue và owner note, vào Operations để theo dõi integration queue, và với role cao hơn thì vào Administration để quản lý employee source records và quyền truy cập user.

## 7. Lời giải thích write path của Case 3

> Khi employee thay đổi ở SA, SA ghi source data vào MongoDB trước, rồi enqueue integration event vào Mongo outbox do SA sở hữu. Worker của SA xử lý event, PayrollAdapter gọi internal API của Payroll, và Payroll service mới là nơi ghi `pay_rates` và `sync_log` trong MySQL.

## 8. Lời giải thích quality gates

> Root gate hiện tại của nhóm em là `npm run verify:all`. Lệnh này bao gồm backend gate, frontend gate và split-runtime proof cho Case 3.

> Nếu giảng viên chỉ muốn xem proof cho integrated path, nhóm em có thể chạy `npm run verify:case3` để chứng minh flow create -> sync -> verify -> delete, đồng thời kiểm tra freshness và action center của Dashboard.

## 9. Tài liệu tham chiếu đúng nhất cho Dashboard

Nếu cần trả lời chính xác câu hỏi "dashboard hiện có gì" và "người dùng thao tác được những gì", dùng file này:

- `docs/demo/slide/group11_dashboard_capabilities_vi.md`

File trên mô tả đúng theo codebase hiện tại:

- phạm vi Case 1 đến Case 3
- route nào đang có
- role nào làm được gì
- người dùng thao tác được gì trên từng màn
- những cơ chế nổi bật mà dashboard đang thật sự dùng

## 10. Lời chốt

> Điểm nhóm em muốn nhấn mạnh là: hệ thống này có boundary rõ ràng, có trade-off rõ ràng, và có thể giải thích bằng runtime thật và thao tác thật, chứ không chỉ bằng slide.

## 11. Điều không nên nói

Không nên nói:

- "Đây là transactional outbox chuẩn enterprise"
- "Đây là ACID xuyên hệ thống"
- "Đây là enterprise middleware stack hoàn chỉnh"
- "Case 5 đã production-ready"

Nên nói:

- "same-repo multi-service runtime"
- "eventual consistency có kiểm soát"
- "Payroll service sở hữu SQL write path"
- "Dashboard là reporting system riêng"
