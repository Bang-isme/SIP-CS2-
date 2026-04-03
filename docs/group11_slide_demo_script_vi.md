# Group 11 - Kịch Bản Slide + Demo

> Last Updated: 2026-04-03
> Dùng để nói trên lớp. Câu ngắn, dễ hiểu, đúng với code nhóm đã làm.

## 1) Cách nói chung

- Nói ngắn và rõ.
- Nói đúng phần đã làm.
- Không nói quá.
- Nếu có phần chưa hoàn chỉnh thì nói thẳng là nhóm đang ở mức nào.
- Giữ giọng bình tĩnh, khiêm tốn, cầu tiến.

## 2) Cấu trúc buổi trình bày

- Phần slide: 5-6 phút
- Phần demo: 5-7 phút
- Hỏi đáp: 2-5 phút

## 3) Kịch bản slide

### Slide 1 - Giới thiệu đề tài

Tiêu đề gợi ý:
- `Group 11 - CEO Memo Executive Dashboard`

Cách nói:

"Nhóm em xin trình bày đề tài tích hợp dữ liệu HR và Payroll theo yêu cầu CEO Memo. Mục tiêu của nhóm em là làm một dashboard cho quản lý, có số liệu tổng hợp, có drill-down khi cần, có cảnh báo, và có phần theo dõi integration để giải thích được về mặt hệ thống."

### Slide 2 - Bài toán nhóm giải quyết

Ý chính trên slide:
- Dữ liệu nằm ở nhiều nơi
- Báo cáo thủ công mất thời gian
- Quản lý khó nhìn nhanh tình hình
- HR và Payroll bị gián đoạn vì phải hỗ trợ báo cáo

Cách nói:

"Nhóm em thấy bài toán chính là dữ liệu HR và Payroll đang tách rời. Khi cần ra quyết định thì phải gom thủ công, vừa chậm vừa dễ sai. Vì vậy nhóm em chọn làm một lớp dashboard ở trên, để quản lý nhìn nhanh, còn khi cần thì mới drill-down xuống chi tiết."

### Slide 3 - Hướng nhóm chọn

Ý chính trên slide:
- MongoDB local: dữ liệu HR
- MySQL: payroll, summary, sync log, integration events
- Dashboard đọc từ summary đã gom sẵn
- Sync theo hướng eventual consistency

Cách nói:

"Nhóm em chọn hướng làm thực tế và vừa sức. MongoDB giữ vai trò nguồn dữ liệu HR. MySQL dùng cho phần payroll, summary và log tích hợp. Dashboard không đọc trực tiếp 500 nghìn dòng theo thời gian thực, mà dùng dữ liệu đã gom sẵn để chạy ổn hơn. Phần đồng bộ thì nhóm em làm theo hướng eventual consistency, chứ không nói là ACID xuyên nhiều database."

### Slide 4 - Nhóm đã làm được gì

Ý chính trên slide:
- Summary: earnings, vacation, benefits
- Drill-down + export CSV
- 4 loại alerts
- Alert follow-up queue
- Integration queue: retry, replay, recover
- API contract rõ ràng

Cách nói:

"Phần mạnh nhất của nhóm em là Case Study 2. Dashboard đã có summary, drill-down, export CSV và 4 loại alert theo CEO Memo. Ngoài ra nhóm em có thêm follow-up queue để người dùng thấy phần nào cần xử lý trước. Với phần integration, nhóm em có queue monitor, retry, replay và recover cho các event bị lỗi."

### Slide 5 - Nhóm chưa claim điều gì

Ý chính trên slide:
- Chưa phải ACID xuyên hệ thống
- Chưa phải enterprise middleware
- Case 5 chủ yếu ở mức docs và plan

Cách nói:

"Nhóm em xin nói rõ phần giới hạn. Hệ thống hiện tại chưa phải ACID xuyên nhiều database. Đây cũng chưa phải middleware enterprise như Kafka hay RabbitMQ. Case Study 5 hiện chủ yếu là tài liệu, checklist và hướng triển khai an toàn. Nhóm em muốn nói đúng mức độ hoàn thiện, không nói quá."

### Slide 6 - Bài học nhóm rút ra

Ý chính trên slide:
- Chọn scope phù hợp
- Ưu tiên cái chạy được
- Biết trade-off
- Cải thiện dần qua từng bước

Cách nói:

"Điều nhóm em học được là phải chọn scope hợp lý. Nếu cố làm quá lớn ngay từ đầu thì khó có một hệ thống chạy ổn để demo. Nhóm em chọn cách làm từng phần, ưu tiên cái có thể chạy, kiểm tra được, rồi mới harden dần."

## 4) Kịch bản demo

### 4.1 Chuẩn bị trước khi demo

Chạy:

```powershell
npm run stack:local:start
npm run verify:all
```

Mở sẵn:
- Dashboard frontend
- OpenAPI docs: `http://localhost:4000/api/contracts/docs/`

### 4.2 Mở đầu phần demo

Cách nói:

"Bây giờ nhóm em xin demo hệ thống đang chạy trên local với baseline 500.000 records. Nhóm em dùng local Mongo và local MySQL để tránh quota cloud và để môi trường demo ổn định hơn."

### 4.3 Đăng nhập

Tài khoản demo:
- `admin@localhost`
- `admin_dev`

Cách nói:

"Nhóm em dùng tài khoản admin local để demo cả phần business và phần integration."

### 4.4 Dashboard tổng quan

Thao tác:
- mở trang dashboard
- chỉ KPI
- chỉ freshness badge

Cách nói:

"Đây là lớp nhìn nhanh cho quản lý. Ý của nhóm em là người dùng vào đây phải thấy ngay tình hình chung, chứ không phải đi qua nhiều màn hình nhỏ lẻ."

### 4.5 Alerts

Thao tác:
- mở `Action Items & Alerts`
- mở một alert
- nếu cần thì demo acknowledgement

Cách nói:

"Phần này thể hiện cách quản lý theo ngoại lệ. Hệ thống không bắt người dùng xem toàn bộ dữ liệu, mà ưu tiên các trường hợp đáng chú ý trước."

### 4.6 Drill-down

Thao tác:
- mở drill-down từ earnings hoặc vacation
- áp `minEarnings`
- search hoặc page
- export CSV

Cách nói:

"Khi cần đi sâu hơn thì nhóm em cho phép drill-down. Ở đây nhóm em demo filter, search, phân trang và export CSV. Phần export hiện tại chạy theo kiểu stream theo batch, nên phù hợp hơn với dữ liệu lớn."

### 4.7 Integration queue

Thao tác:
- mở integration panel
- chỉ metrics
- demo retry hoặc replay nếu có dữ liệu phù hợp

Cách nói:

"Đây là phần nhóm em dùng để thể hiện môn System Integration. Ngoài business alert, hệ thống còn có technical queue để theo dõi event lỗi. Nếu event lỗi thì admin có thể retry, replay hoặc recover."

### 4.8 OpenAPI docs

Thao tác:
- mở `/api/contracts/docs/`
- chỉ vài route chính

Cách nói:

"Phần này giúp nhóm em giải thích rõ backend contract. Frontend đi theo contract của backend, nên khi cần hỏi sâu thì nhóm em có thể mở thẳng phần này ra để trình bày."

### 4.9 Chốt demo

Cách nói:

"Tóm lại, nhóm em chọn hướng làm vừa sức nhưng chạy thật. Hệ thống hiện tại đáp ứng tốt phần dashboard và đã có nền tảng tích hợp, theo dõi lỗi, và kiểm tra lại hệ thống trước demo."

## 5) Chia vai cho 3 thành viên

### Thành viên 1 - Bang

Phần phụ trách:
- mở bài
- bài toán nhóm giải quyết
- hướng nhóm chọn
- slide 1, 2, 3

Cách nói ngắn:

"Phần đầu em xin trình bày bài toán và hướng nhóm triển khai. Nhóm em chọn cách làm thực tế: tách rõ nguồn HR, phần payroll/reporting, và làm dashboard ở lớp trên để quản lý dùng thuận tiện hơn."

### Thành viên 2 - Khiêm

Phần phụ trách:
- slide 4
- demo dashboard
- alerts
- drill-down

Cách nói ngắn:

"Phần tiếp theo em xin demo phần nhóm em làm mạnh nhất là dashboard. Ở đây có summary, drill-down, export CSV và alerts theo yêu cầu CEO Memo."

### Thành viên 3 - Hoa

Phần phụ trách:
- integration queue
- OpenAPI docs
- slide 5, slide 6
- kết luận

Cách nói ngắn:

"Phần cuối em xin trình bày phần integration và phần nhóm em còn giới hạn. Nhóm em đã có queue monitor, retry, replay và recover. Tuy nhiên nhóm em cũng xin nói rõ đây chưa phải middleware enterprise hoàn chỉnh."

## 6) Thứ tự nói gọn cho 3 người

1. Bang nói mở đầu và bối cảnh.
2. Khiêm nói phần dashboard và demo business flow.
3. Hoa nói phần integration, giới hạn hiện tại, và kết bài.

Nếu cần chia đều thời gian hơn:
- Bang: 2 phút
- Khiêm: 5 phút
- Hoa: 3 phút

## 7) Những câu nên dùng

- "Nhóm em chọn hướng này vì phù hợp với phạm vi môn học."
- "Nhóm em ưu tiên phần có thể chạy được và kiểm tra được."
- "Nhóm em xin nói đúng mức độ hoàn thiện của hệ thống."
- "Phần mạnh nhất của nhóm em là dashboard và contract backend."
- "Phần integration của nhóm em đang ở mức practical, chưa phải enterprise."

## 8) Những câu nên tránh

- "Hệ thống này đã production-ready."
- "Nhóm em đã làm full ACID giữa các database."
- "Đây là middleware enterprise hoàn chỉnh."
- "Case Study nào nhóm em cũng làm hoàn toàn xong."

## 9) Câu kết ngắn

"Nhóm em xin cảm ơn thầy. Qua bài này, nhóm em học được cách chọn hướng triển khai phù hợp, biết nói rõ trade-off, và biết làm một hệ thống có thể chạy thật, kiểm tra được, và cải thiện dần theo từng bước."
