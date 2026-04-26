# One-Page Viva Defense Sheet

> Cập nhật: 2026-04-17
> Dùng file này khi giảng viên hỏi nhanh, hỏi xoáy, hoặc yêu cầu mở source ngay tại lớp.

## 1. Core Thesis 20-30 giây

"Đề tài này không chỉ là một dashboard. Nhóm em giải bài toán System Integration cho CEO Memo bằng 3 runtime riêng:

- `SA / HR Service` là source-of-truth system
- `Payroll Service` là downstream system
- `Dashboard Service` là reporting system

Case 2 là phần implemented mạnh nhất. Case 3 được bảo vệ theo `eventual consistency có kiểm soát`, không claim `ACID xuyên nhiều database`. Case 4 đã có outbox-style queue, worker, retry/replay, monitoring và recovery, nhưng chưa phải enterprise broker stack. Case 5 là readiness/design evidence, chưa phải rollout production."

## 2. 5 câu phải nói đúng

1. `Same repo`, nhưng không còn là một app duy nhất.
   - Runtime hiện tại tách thành 3 service, 3 port, 3 entrypoint.

2. Case 2 là phần mạnh nhất.
   - Dashboard giao được KPI, alerts, drilldown, executive brief và export cho CEO Memo.

3. Case 3 là `eventual consistency`.
   - Flow hiện tại là `SA -> Mongo outbox -> Payroll internal API -> Payroll MySQL`.

4. Payroll tự sở hữu write path của nó.
   - SA không ghi thẳng bảng Payroll nữa.

5. `verify:all` bây giờ là gate tổng thực sự.
   - Nó đã bao gồm backend, frontend và split-runtime proof của Case 3.

## 3. 7 câu hỏi dễ bị hỏi nhất

### Q1. "Đây có phải monolith 2 DB không?"

Trả lời ngắn:

"Không. Repo vẫn là same repo, nhưng runtime đã tách thành `SA`, `Payroll`, và `Dashboard` chạy riêng. Đây là same-repo multi-service runtime, không phải một Express app duy nhất nối 2 DB."

### Q2. "Case 3 có ACID hay strong consistency không?"

Trả lời ngắn:

"Không. Nhóm em không claim điều đó. Case 3 được implement theo `eventual consistency có kiểm soát`, có sync state, retry/replay và recovery path để xử lý failure."

### Q3. "Tại sao vẫn gọi là integrated system?"

Trả lời ngắn:

"Vì dữ liệu đi qua nhiều hệ: SA ghi source record, queue event, Payroll consume và sở hữu write path của nó, Dashboard tổng hợp để phục vụ management. Tích hợp ở đây là data flow, sync state và operational control, không chỉ là CRUD trong một app."

### Q4. "Làm sao chứng minh integrated path chạy thật?"

Trả lời ngắn:

"Nhóm em dùng `npm run verify:all` làm root gate. Hiện tại lệnh này đã bao gồm cả `verify:case3`, nên không chỉ chứng minh lint/test mà còn chứng minh luồng split runtime SA -> Payroll -> Dashboard chạy end-to-end."

### Q5. "4 alert types có phải mock không?"

Trả lời ngắn:

"Không. Alert logic là thật. Với live demo, nhóm em có thêm `demo:dashboard:prepare` để provision evidence còn thiếu trong dataset demo, nhằm bảo đảm cả 4 alert types đều nhìn thấy được. Đó là bước chuẩn bị demo, không phải claim rằng mọi dataset production luôn tự hiển thị đủ 4 loại."

### Q6. "Tại sao không dùng Kafka hay middleware enterprise thật?"

Trả lời ngắn:

"Vì scope môn học. Nhóm em ưu tiên increment có thể chạy, demo và giải thích được end-to-end. Bản hiện tại chứng minh được async integration, retry/replay, monitoring và recovery, nhưng không overclaim là enterprise broker stack."

### Q7. "Case 5 của nhóm em đến mức nào?"

Trả lời ngắn:

"Case 5 hiện ở mức docs, checklist và rehearsal-safe evidence. Nhóm em không claim đã rollout HA/DR/network production thật."

## 4. Tuyệt đối không nên nói

- "Hệ thống đã microservices production-ready."
- "Case 3 đã ACID xuyên MongoDB và MySQL."
- "Đây là transactional outbox hoàn chỉnh cấp enterprise."
- "Case 4 đã là enterprise middleware stack."
- "Case 5 đã triển khai hạ tầng thật."

## 5. Nếu giảng viên muốn mở source

Mở nhanh 6 file này trước:

- `src/sa-server.js`
- `src/payroll-server.js`
- `src/dashboard-server.js`
- `src/controllers/employee.controller.js`
- `src/services/payrollMutationService.js`
- `scripts/prepare-dashboard-demo.js`

6 file này chứng minh nhanh:

- có 3 runtime riêng
- SA là source system
- Payroll sở hữu write path
- demo alert surface được chuẩn bị có chủ đích, không phải UI giả

## 6. Nếu giảng viên muốn mở bằng chứng chạy thật

Mở proof bundle:

- `docs/demo/evidence/2026-04-16/README.md`

Nếu cần nói rất ngắn:

- `verify:backend` pass
- `verify:frontend` pass
- `verify:case3` pass
- Dashboard lên `Ready for Memo`
- Payroll nhìn thấy evidence employee downstream

## 7. Câu kết 1 dòng

"Điểm mạnh của nhóm em là chọn scope vừa đủ để giao increment có thể chạy, có thể demo và có thể bảo vệ trung thực. Phần mạnh nhất là Case 2; Case 3 và Case 4 được mở rộng theo eventual consistency có kiểm soát, nhưng tụi em không overclaim hơn mức implementation hiện có."
