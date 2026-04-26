# Viva Talking Points + Q&A

> Cập nhật: 2026-04-15
> Mục tiêu: nói ngắn, đúng bản chất, không overclaim

## 1. Mở bài 1 phút

"Đề tài nhóm em không chỉ là làm một dashboard đẹp. Mục tiêu của nhóm em là giải một bài toán System Integration theo CEO Memo: tổng hợp dữ liệu HR và Payroll, tạo executive dashboard cho management, hỗ trợ drilldown để ra quyết định, và có cơ chế manage-by-exception bằng alerts và integration monitoring.

Nếu nhìn theo Scrum, increment hiện tại của nhóm em mạnh nhất ở Case Study 2. Ngoài ra nhóm em đã mở rộng sang Case 3 và Case 4 bằng hướng eventual consistency, hàng đợi tích hợp kiểu outbox-style, retry/replay, và monitoring. Runtime hiện tại cũng đã tách rõ thành SA, Payroll, và Dashboard thay vì chỉ một app nói chuyện với hai database. Nhưng nhóm em không overclaim: hiện tại đây chưa phải ACID xuyên hệ thống, chưa phải transactional outbox chuẩn, chưa phải enterprise middleware stack, và Case 5 vẫn ở mức design và rehearsal-safe."

## 2. Khung nói 2 phút

"Nhóm em đi theo incremental delivery.

Increment thứ nhất là giải bài toán business của CEO Memo:
- tổng payroll YTD
- tổng vacation days
- average benefits cost
- action items và alerts

Increment thứ hai là decision support:
- breakdown theo department, gender, ethnicity, employment type, shareholder status
- drilldown từ summary xuống record detail
- export và filter để management điều tra nhanh

Increment thứ ba là integration operations:
- DB-backed integration queue theo kiểu outbox-style
- worker xử lý bất đồng bộ
- payroll internal API để giữ write path thuộc về Payroll
- retry và replay
- queue monitor
- stale-processing recovery

Increment thứ tư là hardening:
- tách quyền cho alert management và integration controls
- làm rõ employee mutation contract
- audit production dependencies
- đồng bộ test và docs

Điểm nhóm em muốn bảo vệ là: biết chọn scope, biết trade-off, và biết giao increment có thể chạy, có thể demo, có thể giải thích, thay vì cố claim một hệ thống enterprise hoàn chỉnh."

## 3. Các nguyên lý cốt lõi phải hiểu

### 3.1 Presentation-style integration là gì?

- Không thay toàn bộ legacy system.
- Lấy dữ liệu từ nhiều nguồn, tổng hợp thành một lớp trình bày cho người ra quyết định.
- Giá trị nằm ở việc nhìn nhanh, drilldown được, và giảm thao tác thủ công.

### 3.2 Eventual consistency trong hệ thống này là gì?

- Source record ở SA được ghi trước.
- Sau đó hệ thống mới dispatch tích hợp sang Mongo outbox rồi đi tiếp sang Payroll.
- Vì hai bước này không nằm trong cùng một transaction ACID xuyên MongoDB và MySQL, nên có thể có khoảng thời gian dữ liệu chưa đồng bộ hoàn toàn.
- Đó là lý do nhóm em dùng từ `eventual consistency`, không dùng từ `strict consistency`.

### 3.3 “Outbox” trong repo này nên hiểu thế nào cho đúng?

- Về thực hành demo, repo đang dùng một hàng đợi tích hợp lưu trong MongoDB của SA và worker polling để xử lý.
- Về nguyên lý chặt chẽ, đây là `outbox-style queue`, chưa phải `transactional outbox` chuẩn, vì source write và queue write không cùng một transaction boundary.
- Vì vậy nhóm em nên nói: "Hệ thống áp dụng pattern bất đồng bộ kiểu outbox-style để giảm coupling và hỗ trợ retry/replay", thay vì nói quá mạnh là "đã có transactional outbox hoàn chỉnh".

### 3.4 Runtime split hiện tại nên nói thế nào cho đúng?

- Repo vẫn là same repo.
- Nhưng runtime đã tách thành 3 service nhìn thấy được:
  - `SA / HR Service`
  - `Payroll Service`
  - `Dashboard Service`
- Vì vậy khi bảo vệ, nhóm em nên nói đây là `same-repo multi-service runtime`, không nên tự gọi là microservices production-grade.

### 3.5 Retry/replay khác nhau thế nào?

- `Retry`: thử xử lý lại một event đã fail hoặc dead.
- `Replay`: phát lại một nhóm event theo filter sau khi đã kiểm tra phạm vi ảnh hưởng.
- Ý nghĩa vận hành là giúp phục hồi tích hợp mà không phải sửa tay từng bản ghi.

### 3.6 Manage-by-exception là gì?

- Management không đọc toàn bộ dữ liệu thô.
- Hệ thống ưu tiên hiển thị các trường hợp bất thường hoặc cần hành động trước.
- Trong repo này, lớp business exception là `Alerts`, còn lớp technical exception là `Integration Exceptions`.

### 3.7 Benefits-change alert hiện hiểu đúng bản chất ra sao?

- Ban đầu nó chỉ gần nghĩa "có thay đổi benefits gần đây".
- Hiện tại nhóm em đã nâng cấp để alert mang `payroll-impact cues`: plan nào liên quan, annual paid amount, effective date, last change date, và lý do impact.
- Nghĩa là hệ thống chưa phải payroll recalculation engine, nhưng đã giải thích được vì sao thay đổi benefits này đáng chú ý từ góc nhìn payroll.

## 4. Flow demo 5-7 phút

### 4.1 Mở bài toán business

"CEO Memo muốn management nhìn một màn hình tổng hợp thay vì đi qua nhiều hệ thống riêng lẻ. Vì vậy nhóm em ưu tiên executive dashboard trước."

### 4.2 Đi từ 4 KPI cards

Nói:
- đây là summary layer cho management
- có freshness state để tránh quyết định dựa trên dữ liệu cũ
- UI không chỉ để đẹp mà để nhìn nhanh tình hình

### 4.3 Mở Earnings Overview

Nói:
- so sánh current year và previous year theo department
- có drilldown từ summary xuống detail
- đây là phần đáp ứng mạnh nhất của CEO Memo trong Case 2

### 4.4 Mở Time-off Overview

Nói:
- có phân tích theo shareholder, gender, ethnicity, employment type
- đã thêm previous-year cues và YoY context để dashboard gần business question hơn

### 4.5 Mở Benefits Plan Distribution

Nói:
- đây là lớp cost-efficiency signal
- không thay payroll truth source, mà hỗ trợ quyết định ở tầng management

### 4.6 Mở Action Items & Alerts

Nói:
- alert rules không còn hard-code trong UI
- role management phù hợp hơn có thể cấu hình alerts
- benefits-change alert giờ không chỉ nói "có thay đổi", mà nói rõ payroll-impact cues

### 4.7 Mở Integration Exceptions

Nói:
- đây là operations layer, khác với business alert layer
- queue hiện nằm ở MongoDB của SA
- Payroll service mới là nơi ghi `pay_rates` và `sync_log`
- có retry, replay, monitor
- có stale-processing recovery khi worker bị kẹt giữa chừng

### 4.8 Kết lại

"Nếu nhìn theo Scrum, increment hiện tại đã giao được business value, integration value, và operations value, dù chưa phải full enterprise stack."

## 5. Những câu nên claim

- "Case 2 là phần implemented mạnh nhất."
- "Case 3 đang ở mức eventual consistency có kiểm soát."
- "Case 4 đã có middleware-lite pattern: queue kiểu outbox-style, worker, retry/replay, monitoring, recovery path."
- "Case 5 hiện ở mức design, checklist, và rehearsal-safe."
- "Nhóm em ưu tiên increment có thể demo và giải thích được."

## 6. Những câu không nên claim

- "Case 1-5 đã hoàn thiện toàn diện."
- "Hệ thống đã ACID xuyên tất cả database."
- "Đây là transactional outbox hoàn chỉnh."
- "Đây là enterprise middleware như Kafka/RabbitMQ production stack."
- "Alerts là realtime."
- "Hệ thống production-ready."

## 7. Q&A phản biện

### Q1. "Tại sao giao diện đẹp nhưng trước đây thầy thấy chưa giống đề?"

Trả lời:

"Lúc đầu nhóm em ưu tiên increment có thể demo nhanh nên phần UI và chart đi trước. Sau khi audit lại theo CEO Memo, nhóm em bổ sung previous-year cues, alert settings, tách quyền rõ hơn, làm benefits-change alert có payroll-impact explanation, và tách business alerts khỏi integration controls. Nên bản hiện tại gần yêu cầu môn học hơn, không chỉ đẹp hơn."

### Q2. "Case 2 của nhóm em có thực sự đúng CEO Memo không?"

Trả lời:

"Đúng ở phần cốt lõi: earnings, vacation, benefits, alerts, drilldown. Đây là phần nhóm em tự tin nhất. Nếu nói chính xác hơn, ad-hoc query hiện tại đang ở mức practical business filtering, chưa phải natural-language analytics."

### Q3. "Case 3 có ACID không?"

Trả lời:

"Nếu hiểu ACID xuyên toàn bộ HR và Payroll trên nhiều database khác nhau thì chưa. Nhóm em không claim điều đó. Hệ thống hiện tại ghi source trước, rồi mới dispatch tích hợp sau, nên bản chất là eventual consistency có kiểm soát. Đổi lại, nhóm em có retry/replay, có sync state rõ ràng, và có mô tả failure mode."

### Q4. "Vậy tại sao vẫn gọi là integrated system?"

Trả lời:

"Vì dữ liệu không dừng ở một CRUD app đơn lẻ nữa. Nó đã có source system, downstream sync, trạng thái đồng bộ, failure handling, và operational controls. Quan trọng hơn, runtime hiện tại còn tách rõ SA, Payroll, và Dashboard thành các hệ chạy riêng. Tức là integrated theo nghĩa workflow và dữ liệu đã đi qua nhiều hệ thống, nhưng chưa integrated tới mức strong consistency enterprise."

### Q5. "Nếu worker chết giữa chừng thì sao?"

Trả lời:

"Nhóm em đã thêm stale-processing recovery. Queue monitor phân biệt PROCESSING bình thường với PROCESSING bị kẹt quá ngưỡng thời gian. Admin có thể recover stale events. Nghĩa là nhóm em không chỉ demo happy path mà còn nghĩ tới operational recovery."

### Q6. "Tại sao không dùng Kafka hay middleware enterprise thật?"

Trả lời:

"Vì scope môn học và sprint constraint. Nhóm em chọn kiến trúc implement được end-to-end trong thời gian thực tế. Hiện tại nó chứng minh được tư duy bất đồng bộ, retry/replay, monitoring, và recovery. Còn để lên enterprise-grade thì cần broker, observability, DLQ operations, và deployment maturity cao hơn."

### Q7. "Manager có tự set alerts được không?"

Trả lời:

"Có, ở mức hiện tại `moderator/admin/super_admin` có thể cấu hình alert rules. Nhưng integration retry/replay vẫn tách riêng cho admin path. Nhóm em cố ý tách business control khỏi operations control."

### Q8. "Benefits change thì liên quan payroll ở đâu?"

Trả lời:

"Điểm này là chỗ nhóm em đã sửa gần đây. Trước đây alert chỉ phản ánh recent change. Bây giờ alert detail có plan, annual paid amount, effective date, last change date, và impact code. Nghĩa là management thấy không chỉ có thay đổi, mà thấy vì sao thay đổi đó có thể làm payroll cần chú ý."

### Q9. "Như vậy có phải hệ thống đã tự tính lại payroll chưa?"

Trả lời:

"Chưa. Đây là chỗ cần nói rất đúng bản chất. Alert này cung cấp `explainable payroll-impact cues`, chưa phải payroll recalculation engine. Tức là nó giúp phát hiện và ưu tiên kiểm tra, chứ chưa tự động tái tính toàn bộ payroll."

### Q10. "Save alert settings thì dashboard có cập nhật ngay không?"

Trả lời:

"Có. Ở increment hiện tại, save alert settings sẽ refresh alert summaries ngay trong session hiện tại. Điều đó làm control này trở thành control point thật, không chỉ là cấu hình hình thức."

### Q11. "Case 4 của nhóm em đã full integrated chưa?"

Trả lời:

"Chưa nếu dùng chuẩn enterprise full integrated. Nhóm em bảo vệ theo mức partial nhưng implemented thật: queue kiểu outbox-style, worker, retry, replay, monitoring, stale-processing recovery. Nhóm em ưu tiên nói đúng mức hoàn thiện hơn là overclaim."

### Q12. "Case 5 đã làm được gì?"

Trả lời:

"Case 5 hiện ở mức design và rehearsal-safe. Nhóm em đã có network/security/DR docs, checklist, và script rehearsal an toàn. Nếu để claim production network rollout thì chưa."

### Q13. "Tại sao lại làm thêm login, register, manage users?"

Trả lời:

"Nhóm em xem đó là increment hỗ trợ cho security và role-based access. Nhưng khi bảo vệ, nhóm em không đặt phần đó làm trung tâm. Trung tâm vẫn là business dashboard và integration flow."

### Q14. "Nếu có thêm một sprint nữa, nhóm em ưu tiên gì?"

Trả lời:

"Nếu có thêm một sprint nữa, nhóm em ưu tiên:
1. tăng test coverage cho executive flows và alert configuration
2. tăng chiều sâu observability và recovery metrics
3. tiếp tục hardening docs, DR evidence, và operational rehearsal

Tức là nhóm em sẽ harden increment hiện tại trước khi mở rộng scope."

## 8. Câu trả lời cực ngắn khi bị hỏi dồn

- "Case 2 là increment implemented mạnh nhất."
- "Case 3: eventual consistency, không claim ACID."
- "Case 4: middleware-lite, có monitor và recovery."
- "Case 5: design và rehearsal level."
- "Nhóm em có ý thức rõ về trade-off, nên không overclaim."

## 9. Câu chốt cuối

"Điều nhóm em muốn thầy thấy không phải chỉ là một UI đẹp, mà là một increment có giá trị và có kỷ luật engineering:
- có business value
- có reasoning về integration
- có vận hành và recovery
- có ranh giới security
- có docs và backlog trung thực

Nhóm em có thể chưa đạt enterprise-grade, nhưng nhóm em đã delivery đúng tinh thần Scrum và đúng tinh thần của môn System Integration Practices."
