# Demo Spoken Script Theo Case Study 1-5

> Cập nhật: 2026-04-17
> Mục tiêu: đây là bản lời nói trực tiếp dành cho một người báo cáo trên lớp. Bản này dùng câu rõ chủ ngữ, rõ vị ngữ, đi thẳng vào ý chính, nhưng vẫn giữ đủ ngữ cảnh để bảo vệ bài.
> Cách dùng: bạn có thể nói gần như nguyên văn. Nếu bạn cần rút ngắn, bạn giữ lại phần `Câu chốt` ở cuối mỗi case.

## 1. Mở đầu 45-60 giây

### Câu nên nói trực tiếp

> Hôm nay em báo cáo bài System Integration Practice của nhóm em theo đúng trục Case Study 1 đến Case Study 5. Nhóm em chọn bài toán CEO Memo. Bài toán này yêu cầu nhóm em tích hợp dữ liệu HR và Payroll để ban quản lý có thể xem earnings, vacation, benefits, alerts, và trạng thái đồng bộ trên cùng một bức tranh tổng hợp.

> Điểm đầu tiên em muốn nói rõ là bản hiện tại không còn là một backend duy nhất nối với hai database. Nhóm em đã tách hệ thống thành ba runtime rõ ràng. SA là source system. Payroll là downstream system. Dashboard là reporting system. Vì vậy, trong phần trình bày này, em sẽ không chỉ nói nhóm em làm gì. Em sẽ nói rõ nhóm em làm đến mức nào, vì sao nhóm em chọn cách làm đó, và trade-off của cách làm đó là gì.

### Thao tác kèm theo

- Mở sẵn ba tab:
  - SA: `http://127.0.0.1:4000/`
  - Payroll: `http://127.0.0.1:4100/`
  - Dashboard: `http://127.0.0.1:4200/login`

### Ý phải chốt

- Bài này được trình bày theo đúng `Case Study 1 -> 5`.
- Hệ thống này là `same-repo multi-service runtime`.
- Bài báo cáo này sẽ nêu rõ `giải pháp`, `lý do`, và `trade-off`.

## 2. Case Study 1 - The Proposal

### Câu nên nói trực tiếp

> Với Case Study 1, nhóm em phải xác định đúng vấn đề tích hợp và phải đề xuất được hướng triển khai hợp lý. Nhóm em không nhìn bài này như một bài CRUD thông thường. Nhóm em nhìn bài này như một bài toán tích hợp giữa ba vai trò rõ ràng. Vai trò thứ nhất là source system, tức là nơi HR data được nhập và quản lý. Vai trò thứ hai là downstream system, tức là nơi payroll data được xử lý và lưu đúng ownership. Vai trò thứ ba là reporting system, tức là nơi management đọc dữ liệu tổng hợp để ra quyết định.

> Ở giai đoạn proposal, nhóm em cân nhắc hai hướng chính. Hướng thứ nhất là chỉ làm dashboard để giải nhanh bài toán CEO Memo. Hướng thứ hai là vừa làm dashboard, vừa làm một luồng tích hợp thật giữa SA và Payroll để chứng minh đây là integrated system. Cuối cùng, nhóm em chọn hướng kết hợp. Nhóm em không dừng ở dashboard. Nhóm em cũng không đẩy bài toán lên mức quá nặng như strong consistency hay enterprise middleware ngay từ đầu.

> Nhóm em chọn một hướng vừa đủ cho môn học. Dashboard phải giải được bài toán management reporting. Luồng SA sang Payroll phải có evidence thật. Hệ thống phải trace được trạng thái đồng bộ. Hệ thống cũng phải giải thích được failure mode khi có lỗi.

### Vì sao nhóm em chọn như vậy

> Nhóm em chọn cách này vì nếu nhóm em chỉ làm dashboard, bài sẽ thiếu phần integration. Ngược lại, nếu nhóm em cố làm full enterprise architecture ngay từ đầu, scope của bài sẽ vỡ. Khi scope vỡ, demo sẽ khó chạy. Khi demo khó chạy, phần bảo vệ sẽ yếu. Vì vậy, nhóm em chọn một proposal vừa đủ sâu để triển khai được và vừa đủ rõ để bảo vệ được.

### Trade-off phải nói rõ

> Trade-off của Case Study 1 là nhóm em ưu tiên tính triển khai được và tính bảo vệ được. Nhóm em không ưu tiên một proposal quá tham vọng nhưng không thể chứng minh bằng code, bằng runtime, và bằng verification.

### Câu chốt

> Với Case Study 1, nhóm em xác định đúng bài toán tích hợp và chọn một hướng triển khai vừa đủ sâu để đi tiếp sang Case Study 2, 3 và 4 bằng evidence thật.

## 3. Case Study 2 - The Dashboard

### Câu nên nói trực tiếp

> Với Case Study 2, đây là phần mạnh nhất của nhóm em. Mục tiêu của nhóm em không phải là làm một giao diện đẹp. Mục tiêu của nhóm em là làm một executive dashboard thực sự phục vụ CEO Memo. Dashboard này phải giúp management nhìn được earnings, vacation, benefits, alerts, và drilldown detail khi cần.

> Ở đây em đăng nhập vào Dashboard để cho thấy cách nhóm em giải bài toán này. Sau khi vào trang tổng quan, em luôn chỉ vào ba phần trước. Phần thứ nhất là freshness status. Phần thứ hai là action center. Phần thứ ba là executive brief. Em làm như vậy vì Dashboard của nhóm em không claim realtime. Nhóm em dùng pre-aggregated summary và read-model. Vì vậy, người dùng phải biết dữ liệu mới đến đâu, hệ thống đang ở trạng thái nào, và executive brief có đang sẵn sàng cho memo hay không.

> Sau đó em mới chỉ vào KPI, alerts, và drilldown. Em nói theo thứ tự đó vì CEO Memo cần management information, chứ không cần raw operational data. Dashboard của nhóm em là reporting system. Dashboard này không phải source write path. Dashboard này cũng không phải auth service. Dashboard này là tầng đọc, tầng tổng hợp, và tầng giải thích dữ liệu cho management.

> Phần alerts cũng rất quan trọng. Nhóm em đang show bốn loại alert chính là anniversary, vacation, benefits_change, và birthday. Em nói rõ một điểm ở đây để tránh hiểu nhầm. Logic alert là logic thật. Nếu dataset demo bị lệch ngay trước giờ vào lớp, nhóm em có thể chạy `npm run demo:dashboard:prepare` để re-baseline surface demo. Bước đó là bước chuẩn bị demo. Bước đó không có nghĩa là production runtime luôn tự hiển thị đủ bốn loại alert trong mọi dataset.

### Thao tác kèm theo

1. Đăng nhập:
   - email: `admin@localhost`
   - password: `admin_dev`
2. Dừng ở `Executive Overview`.
3. Chỉ vào:
   - freshness
   - action center
   - KPI
   - executive brief
   - alerts panel
4. Nếu còn thời gian, mở drilldown hoặc analytics.

### Vì sao nhóm em làm như vậy

> Nhóm em chọn cách làm này vì CEO Memo là bài toán reporting. Nếu Dashboard query trực tiếp dữ liệu vận hành theo kiểu nặng ở mỗi lần render, giao diện sẽ khó ổn định và khó giải thích. Khi nhóm em dùng summary/read-model, Dashboard đọc nhanh hơn. Dashboard ổn định hơn. Dashboard cũng giải thích freshness rõ hơn.

### Trade-off phải nói rõ

> Trade-off của Case Study 2 là nhóm em ưu tiên tính ổn định và tính giải thích. Vì vậy, nhóm em không claim dashboard realtime. Nhóm em cũng không claim đây là BI platform hoàn chỉnh. Nhóm em chỉ claim đúng những gì đang có evidence thật: executive brief, KPI, alerts, drilldown, export, và follow-up cues cho CEO Memo.

### Câu chốt

> Với Case Study 2, nhóm em đã hiện thực hóa được một Dashboard phục vụ management theo đúng tinh thần CEO Memo, và đây là phần implemented mạnh nhất của hệ thống hiện tại.

## 4. Case Study 3 - Integrated System

### Câu nên nói trực tiếp

> Với Case Study 3, đây là phần em cần chứng minh mạnh nhất rằng hệ thống của nhóm em là integrated system chứ không chỉ là một dashboard đứng riêng. Điểm cốt lõi ở đây là dữ liệu được nhập một nơi ở source system, sau đó dữ liệu được đồng bộ sang downstream system theo một consistency model có kiểm soát.

> Cách nhóm em làm hiện tại như sau. SA là source-of-truth cho employee data. Khi em tạo employee ở SA, SA ghi source record vào MongoDB trước. Sau đó SA enqueue integration event vào Mongo outbox của chính SA. Tiếp theo, worker của SA xử lý event và forward mutation sang Payroll internal API. Cuối cùng, Payroll service tự ghi `pay_rates` và `sync_log` vào MySQL payroll của nó.

> Bây giờ em làm trực tiếp luồng này. Em tạo một employee ở SA trước. Sau khi request thành công, em không nói hệ thống đã strong consistency ngay lập tức. Em chỉ vào `sync.status` để nói rõ rằng model hiện tại là eventual consistency có kiểm soát. Sau đó em chuyển sang Payroll console và em tìm đúng `employeeId` vừa tạo. Khi record downstream xuất hiện ở Payroll, đó là bằng chứng thật rằng integration path đang chạy.

> Em update employee thêm một lần nữa để cho thấy đây không phải một lần sync giả lập. Sau khi em đổi `payRate` và `payType` ở SA, Payroll tiếp tục nhận thay đổi và cập nhật dữ liệu downstream. Luồng này cho phép nhóm em bảo vệ một ý rất rõ. Dữ liệu được nhập một lần ở source system. Downstream system nhận thay đổi qua một cơ chế tích hợp có state, có trace, và có recovery path.

### Thao tác kèm theo

1. Ở SA, gọi `POST /api/employee`.
2. Payload mẫu:

```json
{
  "employeeId": "EMP-DEMO-2026-01",
  "firstName": "Case",
  "lastName": "Study",
  "employmentType": "Full-time",
  "payRate": 41.5,
  "payType": "SALARY",
  "vacationDays": 5,
  "paidToDate": 1000,
  "paidLastYear": 1200
}
```

3. Chỉ vào `sync.status`, `sync.mode`, hoặc correlation metadata.
4. Mở Payroll console và tìm `employeeId`.
5. Chỉ vào pay rate, pay type, sync evidence.
6. Quay lại SA và update:
   - `payRate` -> `55`
   - `payType` -> `HOURLY`
7. Refresh Payroll console.

### Vì sao nhóm em làm như vậy

> Nhóm em chọn mô hình này vì ownership rất quan trọng trong môn System Integration. Nếu SA ghi thẳng vào database của Payroll, boundary sẽ rất yếu. Khi boundary yếu, phần bảo vệ sẽ khó. Còn khi SA chỉ chịu trách nhiệm source mutation và integration dispatch, còn Payroll tự sở hữu write path của nó, toàn bộ câu chuyện kỹ thuật trở nên rõ và đúng bản chất hơn.

### Trade-off phải nói rõ

> Trade-off của Case Study 3 là nhóm em chọn eventual consistency có kiểm soát. Nhóm em không chọn strong consistency. Nhóm em không claim 2PC. Nhóm em cũng không claim ACID xuyên MongoDB và MySQL. Nhóm em ưu tiên một integrated path chạy thật, trace thật, và recover được, hơn là một mô hình consistency mạnh hơn nhưng vượt quá scope hiện tại.

### Câu chốt

> Với Case Study 3, nhóm em đã chứng minh được một integrated path thật từ SA sang Payroll theo mô hình eventual consistency có kiểm soát, với boundary rõ giữa source write path và downstream write path.

## 5. Case Study 4 - Fully Integrated System / Middleware-Lite

### Câu nên nói trực tiếp

> Với Case Study 4, nhóm em không bảo vệ theo hướng "đây đã là enterprise middleware stack". Nhóm em bảo vệ theo hướng trung thực hơn. Hệ thống hiện tại đã có một lớp middleware-lite đủ để quản lý integration flow theo kiểu có trạng thái, có monitor, có retry, có replay, và có recovery path.

> Điều đó có nghĩa là nhóm em không chỉ chứng minh happy path của đồng bộ. Nhóm em còn chứng minh rằng khi integration có vấn đề thì hệ thống vẫn có cách nhìn thấy vấn đề và có cách can thiệp. Ở đây em mở phần Integration Exceptions hoặc Operations để chỉ ra backlog, trạng thái event, và các thao tác như retry, replay, hoặc recover-stuck. Em muốn nhấn mạnh một ý rất rõ. Integration ở đây không phải là kiểu gửi request xong rồi hy vọng nó thành công. Integration ở đây là một flow có trạng thái và có khả năng vận hành.

> Phần này rất quan trọng trong môn System Integration Practice. Nếu một hệ tích hợp chỉ chạy được lúc mọi thứ thuận lợi, hệ đó chưa đủ mạnh để bảo vệ. Vì vậy, nhóm em làm thêm lớp operator control này để chứng minh rằng nhóm em có nghĩ tới failure mode và có nghĩ tới cách xử lý.

### Thao tác kèm theo

1. Mở `Integration Exceptions` hoặc panel monitoring.
2. Nếu cần dựng state demo:

```powershell
npm run demo:queue:warning
npm run demo:queue:critical
npm run demo:queue:cleanup
```

3. Chỉ vào backlog, trạng thái event, retry/replay/recover.

### Vì sao nhóm em làm như vậy

> Nhóm em làm phần này vì integrated system trong thực tế luôn có failure mode. Queue có thể kẹt. Downstream có thể lỗi. Event có thể phải chạy lại. Nếu hệ thống không có queue state, không có retry, không có replay, và không có recovery path, bài sẽ rất khó bảo vệ khi giảng viên hỏi sâu hơn về vận hành.

### Trade-off phải nói rõ

> Trade-off của Case Study 4 là nhóm em dừng ở mức middleware-lite. Nhóm em không claim Kafka. Nhóm em không claim RabbitMQ production stack. Nhóm em không claim DLQ hay observability enterprise-grade. Nhóm em chỉ claim đúng phần đã làm thật: DB-backed outbox, worker, retry, replay, recovery, monitor API/UI, và operator evidence.

### Câu chốt

> Với Case Study 4, nhóm em đã đi từ mức "có đồng bộ" sang mức "có thể theo dõi và can thiệp vào đồng bộ", dù hệ thống mới ở mức middleware-lite chứ chưa phải enterprise middleware.

## 6. Case Study 5 - Network Integration / DR / Security Readiness

### Câu nên nói trực tiếp

> Với Case Study 5, phần này em sẽ nói rất trung thực để tránh overclaim. Nhóm em hiện chưa triển khai một network integration hay DR rollout production thật. Điều nhóm em đang có ở Case Study 5 là readiness và design evidence. Cụ thể, nhóm em có kiến trúc mạng, có định hướng backup/recovery, có security boundary, và có rehearsal-safe script để tạo evidence mà không phá dữ liệu vận hành.

> Em nói thẳng như vậy vì nhóm em muốn bảo vệ bài dựa trên đúng mức implementation hiện có. Với Case Study 5, nhóm em có tài liệu. Nhóm em có checklist. Nhóm em có rehearsal-safe evidence. Nhóm em cũng có security/network/DR thinking đủ để chứng minh rằng nhóm em hiểu bài toán. Tuy nhiên, nhóm em không nói rằng phần này đã được rollout đầy đủ trên production infrastructure.

> Cách nói này có lợi hơn cho bài. Cách nói này cho giảng viên thấy rằng nhóm em hiểu rõ mình đã làm đến đâu và chưa làm đến đâu. Cách nói này cũng giúp nhóm em tránh một claim quá mạnh mà không có runtime evidence tương xứng.

### Thao tác kèm theo

- Nếu cần, mở nhanh:
  - `docs/case_study_5_network_dr_security.md`
  - `scripts/case5-readiness-safe.js`
  - `Memory/DR/*`

### Vì sao nhóm em làm như vậy

> Nhóm em chọn cách bảo vệ này vì Case Study 5 rất dễ bị nói quá mức. Nếu nhóm em nói quá mức hạ tầng hiện có, giảng viên chỉ cần hỏi sang chứng cứ runtime hoặc deployment topology là bài sẽ yếu ngay. Vì vậy, nhóm em giữ claim ở mức readiness/design evidence, nhưng nhóm em nói rất rõ giới hạn.

### Trade-off phải nói rõ

> Trade-off của Case Study 5 là nhóm em ưu tiên tài liệu, rehearsal-safe evidence, và security/network thinking, thay vì cố mô phỏng một production DR rollout không đủ thời gian và không đủ scope để chứng minh hết.

### Câu chốt

> Với Case Study 5, nhóm em có readiness/design evidence đủ để chứng minh rằng nhóm em hiểu bài toán network, DR, và security, nhưng nhóm em không overclaim thành hạ tầng production đã triển khai thật.

## 7. Phần kết 45-60 giây

### Câu nên nói trực tiếp

> Nếu em tóm tắt toàn bộ bài theo đúng Case Study 1 đến 5, em sẽ chốt như sau. Với Case Study 1, nhóm em xác định đúng vấn đề và chọn hướng triển khai hợp lý cho scope môn học. Với Case Study 2, nhóm em hiện thực hóa được một executive dashboard phục vụ CEO Memo, và đây là phần mạnh nhất của hệ thống. Với Case Study 3, nhóm em có integrated path thật từ SA sang Payroll theo eventual consistency có kiểm soát. Với Case Study 4, nhóm em có middleware-lite đủ để monitor và can thiệp vào integration flow. Với Case Study 5, nhóm em có readiness/design evidence cho network, backup, recovery và security boundary, nhưng nhóm em không overclaim beyond current implementation.

> Điểm mà nhóm em muốn bảo vệ mạnh nhất là thế này. Giải pháp hiện tại chạy được. Giải pháp hiện tại giải thích được. Giải pháp hiện tại có trade-off rõ ràng. Mức claim của nhóm em luôn bám theo evidence thật trong codebase. Em cho rằng đó là cách tiếp cận phù hợp nhất cho môn System Integration Practice.

### Ý phải chốt

- Case 2 mạnh nhất.
- Case 3 là `eventual consistency có kiểm soát`.
- Case 4 là `middleware-lite`.
- Case 5 là `readiness/design evidence`.

## 8. Những câu ngắn nên dùng khi bị hỏi nhanh

### "Bài này có phải chỉ là dashboard không?"

> Không. Dashboard chỉ là reporting system. Hệ thống này còn có source system là SA và downstream system là Payroll, kèm theo luồng tích hợp và operator control.

### "Đây có phải monolith 2 DB không?"

> Không. Repo là same-repo, nhưng runtime đã tách thành SA, Payroll và Dashboard. Quan trọng hơn, write path ownership cũng đã tách rõ.

### "Case 3 có ACID không?"

> Không. Nhóm em bảo vệ theo eventual consistency có kiểm soát. Nhóm em không claim ACID xuyên MongoDB và MySQL.

### "Case 4 có phải enterprise middleware không?"

> Không. Nhóm em chỉ claim middleware-lite đủ để retry, replay, recover và monitor integration flow.

### "Case 5 đã production-ready chưa?"

> Chưa. Case 5 hiện ở mức readiness/design evidence, không phải rollout production infrastructure thật.

## 9. Những câu tuyệt đối không nên nói

Không nên nói:

- "Hệ thống này đã production-ready microservices."
- "Case Study 3 của nhóm em là ACID xuyên hệ thống."
- "Đây là transactional outbox chuẩn enterprise."
- "Case Study 4 là enterprise middleware stack."
- "Case Study 5 đã triển khai production DR thật."

Nên nói:

- "same-repo multi-service runtime"
- "eventual consistency có kiểm soát"
- "Payroll service sở hữu write path của MySQL"
- "Dashboard là reporting system riêng"
- "middleware-lite ở mức coursework"
- "readiness/design evidence cho Case Study 5"

## 10. File nên mở kèm khi báo cáo

- Bản nói trực tiếp theo case study: `docs/demo/live/demo_spoken_case_study_1_5_vi.md`
- Bản master theo core: `docs/demo/live/demo_master_script_12_15min_vi.md`
- Runbook ngắn: `docs/demo/live/demo_runbook_one_page_vi.md`
- Viva ngắn: `docs/demo/live/viva_defense_one_page_vi.md`
- Cheatsheet claim/evidence: `docs/viva_claim_evidence_cheatsheet_vi.md`
