# SIP Course Alignment Notes

> Last Updated: 2026-04-04
> Mục đích: giữ lại khung tư duy của môn System Integration Practices để khi viết tài liệu demo, Q&A, vision, hoặc viva notes không bị trôi sang kiểu mô tả sản phẩm chung chung.

## 1) Tinh thần môn học cần giữ

Theo các bài giảng trong `D:\SIP_CS 2\SystemIntegrationPractics`, phần trình bày của nhóm nên luôn bám vào câu hỏi:

- Vì sao phải tích hợp?
- Hệ thống đang tích hợp theo kiểu nào?
- Coupling đang được giảm hay tăng?
- Consistency requirement thực tế là gì?
- Hệ thống có reliable và recoverable không?
- Nhóm đã chọn trade-off nào và vì sao?

Các keyword gốc của môn nên ưu tiên dùng đúng chỗ:
- `adaptable systems and processes`
- `management information`
- `data consistency`
- `process consistency`
- `exception reporting`
- `historical data analysis`
- `integrated security`
- `reliable and recoverable systems`
- `minimize coupling`
- `minimize intrusiveness`
- `data timeliness`
- `eventual consistency`
- `middleware`
- `message persistence`
- `queue management`
- `defense in depth`
- `accountability and recovery`

## 2) Các bài giảng đang bám sát nhất với codebase nhóm

### SIP1

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP1.md`

Ý quan trọng:
- tích hợp không chỉ là nối API
- mục tiêu là management information, exception reporting, reliable and recoverable systems
- cần nói rõ vì sao tích hợp chứ không chỉ trình bày mình đã làm gì

Áp dụng vào nhóm:
- dashboard nên được mô tả là `management information layer`
- alerts nên được mô tả là `exception reporting`
- health, runbook, backup/recovery nên được mô tả là `reliable and recoverable systems`

### SIP3

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP3.md`

Ý quan trọng:
- có 3 integration models: `presentation`, `data`, `functional`
- presentation integration phù hợp với executive dashboard
- data integration phù hợp khi gom dữ liệu nhiều nguồn để phân tích
- functional integration phù hợp khi dữ liệu/chức năng thật sự đi xuyên các hệ

Áp dụng vào nhóm:
- CEO dashboard của nhóm có thể mô tả là `presentation integration` ở lớp trên
- executive brief + drilldown + summary tables là `data integration`
- employee mutation + outbox + sync + worker là phần gần với `functional integration`

### SIP5

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP5.md`

Ý quan trọng:
- integrated system services gồm `naming`, `security`, `reliability`
- security không chỉ là login, mà còn là access control, logging, accountability, recovery

Áp dụng vào nhóm:
- auth nên gắn với `authentication` và `authorization`
- requestId, audit trail, sync log, integration audit nên gắn với `accountability and recovery`
- backup/recovery docs không nên mô tả như phần phụ, mà là một phần của operational readiness

### SIP6

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP6.md`

Ý quan trọng:
- consistency là vấn đề về `timing`
- consistency requirement phải dựa trên user requirement
- consistency càng nhanh thì hệ thống càng đắt và phức tạp
- không phải mọi integrated system đều cần cross-system ACID

Áp dụng vào nhóm:
- phải nói rõ nhóm đang ở `eventual consistency`
- không claim `distributed ACID`
- nếu bị hỏi vì sao không ACID xuyên MongoDB và MySQL, trả lời theo hướng:
  - bài toán hiện tại ưu tiên visibility, retry, recovery
  - consistency requirement của dashboard/reporting không bắt buộc strong consistency tức thì

### SIP8

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP8.md`

Ý quan trọng:
- integration guidelines: `minimize coupling`, `minimize intrusiveness`, chú ý `data format`, `timeliness`, `reliability`
- messaging là một integration style quan trọng, nhưng không phải style duy nhất

Áp dụng vào nhóm:
- khi giải thích vì sao không chọn Kafka/RabbitMQ, nên nói:
  - nhóm có cân nhắc messaging middleware
  - nhưng ở scope hiện tại, outbox + worker đủ chứng minh integration thinking
  - nhóm ưu tiên clarity và kiểm chứng được end-to-end hơn là tăng hạ tầng

### SIP10

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP10.md`

Ý quan trọng:
- data integration rất khó vì mỗi nguồn dữ liệu có view khác nhau về cùng một thực thể
- tránh các lỗi như:
  - tạo thêm một DB vô nghĩa
  - chờ perfect schema
  - assume documentation đúng hoàn toàn
  - test thiếu real data
- luôn có trade-off giữa normalization và performance

Áp dụng vào nhóm:
- summary tables và executive snapshot nên được giải thích là trade-off có chủ đích giữa normalization và query performance
- seed 500k records là bằng chứng nhóm có chú ý đến `test with sufficient real data`
- Mongo HR source + MySQL reporting/integration side cần được mô tả như một quyết định data integration có trade-off, không phải “chia đại”

### SIP11

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP11.md`

Ý quan trọng:
- security design phải theo risk, due diligence, defense-in-depth, least privilege
- logging integration là một phần rất quan trọng

Áp dụng vào nhóm:
- role-based routes nên gắn với `least privilege`
- auth guard + canonical error code + requestId + audit trail nên gắn với `defense in depth` và `logging integration`
- không nên nói bảo mật chỉ là “có login”

### SIP13

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP13.md`

Ý quan trọng:
- MOM là middleware phổ biến
- queue management gồm response time, message size, queue volume, timeouts, persistence
- message persistence quan trọng vì queue failure, recipient failure, requester failure
- MOM không đảm bảo ACID

Áp dụng vào nhóm:
- `integration_events` nên được mô tả là `DB-backed outbox queue`
- `OUTBOX_POLL_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_ATTEMPTS`, `OUTBOX_PROCESSING_TIMEOUT_MS` là các `queue management parameters`
- audit trail và durable event rows là bằng chứng của `message persistence`

### SIP15

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP15.md`

Ý quan trọng:
- network integration phải tính đến remote access, authentication differences, local resources, disaster recovery
- cần justify integration decisions
- cần address layer 2, layer 3, apps, access path, disaster scenario

Áp dụng vào nhóm:
- case study 5 của nhóm nên được trình bày là `network integration plan + operational constraints`, không nên nói như đã triển khai hạ tầng thật toàn bộ
- DR docs, backup docs, runbook có thể được mô tả là phần nhóm chuẩn bị để thỏa phạm vi network integration của môn

### SIP17

File:
- `D:\SIP_CS 2\SystemIntegrationPractics\SIP17.md`

Ý quan trọng:
- tổng kết môn nhấn vào heuristics:
  - simplify
  - question the original problem statement
  - build and maintain options
  - partition into relatively independent elements

Áp dụng vào nhóm:
- cách kể chuyện demo nên nói rõ:
  - nhóm không cố claim enterprise stack
  - nhóm chọn partition rõ giữa Mongo source, MySQL reporting/integration, backend orchestration, frontend presentation
  - nhóm chọn giải pháp đơn giản hơn nhưng chạy được và giải thích được

## 3) Cách mô tả codebase nhóm theo đúng giọng SIP

### Nên nói

- dashboard là `management information layer`
- alerts là `exception reporting`
- executive brief là `backend-owned read model`
- drilldown là `server-side data access path`
- employee CRUD + outbox + worker là `functional integration path`
- summary tables là `performance-oriented read model`
- sync log + audit trail là `accountability and recovery evidence`
- local stack + doctor + health + recovery docs là `reliable and recoverable system operations`

### Không nên nói

- production-ready
- fully enterprise
- real-time tuyệt đối
- ACID xuyên nhiều database
- fully automated DR
- zero downtime architecture

## 4) Mapping nhanh giữa lý thuyết SIP và codebase

### Presentation Integration

Trong codebase:
- dashboard UI
- executive cards
- alert review surface

Giải thích:
- người dùng thấy một màn thống nhất
- nhưng dữ liệu đến từ nhiều tầng backend/read model

### Data Integration

Trong codebase:
- executive snapshot
- summary tables
- drilldown filters
- export CSV

Giải thích:
- nhóm đang aggregate dữ liệu từ nhiều nguồn vào read model dùng cho phân tích và ra quyết định

### Functional Integration

Trong codebase:
- employee mutation
- integration event
- worker
- sync log
- retry/replay/recover

Giải thích:
- thay đổi ở source kéo theo một quy trình đồng bộ xuống integration side

## 5) Cách trả lời theo đúng phạm vi môn học

Nếu bị hỏi “vì sao không làm hơn nữa?”, nên bám công thức:

1. nhóm có cân nhắc
2. nhóm chủ động chọn trade-off
3. nhóm ưu tiên giải pháp phù hợp với user requirement và phạm vi môn học
4. nhóm giữ phần mình làm ở mức kiểm chứng được

Ví dụ nên dùng:

> Theo cách nhóm em hiểu môn SIP, phần quan trọng là chọn đúng kiểu tích hợp và giải thích rõ trade-off, chứ không phải thêm càng nhiều công nghệ càng tốt.

> Nhóm em chủ động giữ hệ thống ở mức practical nhưng có evidence rõ, thay vì thêm hạ tầng nặng mà không kiểm chứng đủ sâu.

## 6) Những ý này phải nhớ khi viết lại docs hoặc script

- luôn mở đầu từ `why integrate`
- luôn gắn dashboard với `management information`
- luôn gắn alerts với `exception reporting`
- luôn gắn health/log/audit/recovery với `reliable and recoverable systems`
- luôn nói rõ `consistency requirement`
- luôn phân biệt `presentation`, `data`, `functional` integration
- luôn nhắc `minimize coupling` và `minimize intrusiveness`
- luôn tránh overclaim về ACID, middleware enterprise, DR automation

## 7) Hành động tiếp theo khi cập nhật tài liệu demo

Khi viết lại demo docs, nên ưu tiên sửa các file:
- `docs/demo/slide/group11_slide_demo_script_vi.md`
- `docs/demo/live/demo_end_to_end_talk_track_vi.md`
- `docs/demo/slide/demo_role_split_talk_track_vi.md`
- `docs/demo/support/demo_qa_defense_vi.md`
- `docs/demo/support/system_operation_builder_explainer_vi.md`
- `docs/demo/support/tunables_cheat_sheet_vi.md`

Mục tiêu:
- lời văn giống sinh viên đang học môn SIP
- có keyword đúng bài giảng
- có trade-off rõ
- có evidence path rõ
- không “nói như AI generic”

Từ 2026-04-05, bộ demo docs được tách theo đúng cách sử dụng:
- `docs/demo/slide/*` cho phần thuyết trình slide
- `docs/demo/live/*` cho phần bấm demo trực tiếp
- `docs/demo/support/*` cho Q&A, giải thích sâu, tunables và recovery
