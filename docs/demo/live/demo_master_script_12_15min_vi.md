# Demo Master Script 12-15 Phút

> Cập nhật: 2026-04-17
> Mục tiêu: đây là bản script đầy đủ để một người có thể demo, giải thích, và tự bảo vệ bài một cách liền mạch trong khoảng 12-15 phút.
> Cách dùng: không cần đọc nguyên từng chữ như học thuộc lòng, nhưng nên bám đúng thứ tự các core và giữ đúng các claim an toàn trong tài liệu này.

## 1. Cách hiểu cấu trúc của buổi demo

Buổi demo này không nên đi theo kiểu "mở gì thấy gì thì nói nấy". Nếu làm như vậy, người nghe sẽ thấy hệ thống chạy nhưng sẽ không chắc nhóm hiểu bài toán System Integration ở mức nào. Cách có lợi nhất là đi theo các `core` chính, vì mỗi core tương ứng với một ý mà nhóm cần bảo vệ trước giảng viên.

Trong bản script này, mỗi core luôn có bốn lớp:

1. `Core cần chứng minh gì`
   Đây là ý chính mà phần đó phải làm rõ. Nếu phần trình bày đi lệch khỏi ý này thì nên kéo lại ngay.

2. `Thao tác demo`
   Đây là các bước thao tác cụ thể trên hệ thống để tạo ra bằng chứng trực tiếp.

3. `Lời nói mẫu`
   Đây là phần câu văn nên nói thành tiếng. Tôi viết theo kiểu liền mạch, đủ ngữ cảnh, để bạn có thể dùng gần như nguyên văn nếu muốn.

4. `Vì sao làm như vậy và trade-off`
   Đây là phần giúp bạn không chỉ "show sản phẩm" mà còn chứng minh nhóm hiểu lý do thiết kế, giới hạn của cách làm, và lý do vì sao cách chọn hiện tại hợp với môn học.

Nếu phải cắt bớt thời gian, bạn vẫn giữ đủ năm core chính sau:

1. Bài toán và boundary
2. Dashboard cho CEO Memo
3. Luồng SA -> Payroll
4. Monitoring / integration control
5. Kết luận và claim boundary

## 2. Preflight trước khi vào lớp

Trước khi bắt đầu buổi demo, nên chuẩn bị theo đúng thứ tự dưới đây:

```powershell
cd "D:\SIP_CS 2\SIP_CS"
npm run verify:all
npm run case3:stack:start
```

Nếu ngay trước lúc trình bày bạn muốn chắc rằng panel alert nhìn đủ bốn loại để nói về CEO Memo, chạy thêm:

```powershell
npm run demo:dashboard:prepare
```

Mở sẵn ba tab:

- SA: `http://127.0.0.1:4000/`
- Payroll: `http://127.0.0.1:4100/`
- Dashboard login: `http://127.0.0.1:4200/login`

Điều cần tự nhớ trước khi nói:

- `verify:all` hiện là root gate thật, vì nó đã bao gồm backend, frontend, và luôn cả proof của Case 3.
- `case3:stack:start` là lệnh để mở stack demo live. Nó khác với `verify:case3` vì `verify:case3` tự chạy xong rồi tự tắt stack.
- `demo:dashboard:prepare` là bước prep để giữ demo ổn định, không phải claim rằng mọi dataset production luôn tự sinh đủ bốn loại alert.

## 3. Mở đầu 45-60 giây

### Core cần chứng minh gì

Phần mở đầu phải giúp giảng viên hiểu ngay rằng đây không phải bài CRUD đơn giản. Nhóm đang giải một bài toán tích hợp hệ thống cho CEO Memo, và bản hiện tại đã tách rõ vai trò giữa source system, downstream system, và reporting system.

### Thao tác demo

Chưa cần thao tác sâu. Chỉ cần đứng ở ba tab đã mở sẵn hoặc chỉ nhanh vào ba URL/ba service.

### Lời nói mẫu

> Hôm nay em demo bài toán CEO Memo theo hướng System Integration. Điểm em muốn làm rõ ngay từ đầu là bản hiện tại không còn là một backend duy nhất nối với hai database, mà đã tách ra thành ba runtime riêng để thể hiện rõ boundary của từng hệ.

> Cụ thể, SA là source system, Payroll là downstream system, và Dashboard là reporting system phục vụ management. Vì vậy trong buổi demo này, em không chỉ show giao diện, mà em sẽ đi lần lượt qua năm ý chính: bài toán cần giải là gì, Dashboard giải quyết được gì cho CEO Memo, luồng dữ liệu đi từ SA sang Payroll như thế nào, nhóm đang kiểm soát integration ra sao, và cuối cùng là nhóm claim đến mức nào, không overclaim đến mức nào.

### Vì sao làm như vậy và trade-off

Bạn mở đầu theo cách này vì giảng viên sẽ nghe bằng tư duy kiến trúc trước khi nhìn vào UI. Nếu bạn chỉ đăng nhập Dashboard và bấm vài chart, giảng viên dễ đánh giá đây là bài web app bình thường. Còn nếu bạn mở đúng bằng boundary và vai trò của ba service, bạn đã đặt khung nhìn đúng cho cả buổi demo.

Trade-off ở đây là: mở đầu kiểu này ít "wow" hơn mở UI ngay, nhưng nó có lợi hơn rất nhiều cho môn System Integration, vì bạn chủ động xác định tiêu chí chấm bài ngay từ đầu.

## 4. Core 1: Bài toán và boundary hệ thống

### Core cần chứng minh gì

Bạn cần chứng minh rằng hệ thống hiện tại có boundary rõ ràng và nhóm hiểu ai là owner của source data, ai là owner của downstream payroll write path, và ai là owner của reporting/read model.

### Thao tác demo

1. Chỉ vào ba tab hoặc ba service đang mở.
2. Nếu giảng viên muốn thấy nhanh runtime sống thật, mở thêm ba health endpoint:
   - `http://127.0.0.1:4000/api/health/live`
   - `http://127.0.0.1:4100/api/health/live`
   - `http://127.0.0.1:4200/api/health/live`

### Lời nói mẫu

> Trước hết em muốn làm rõ boundary hiện tại. SA chạy ở port 4000 và là source-of-truth cho employee, auth, và integration outbox. Payroll chạy ở port 4100 và là downstream system, đồng thời là nơi sở hữu write path của MySQL payroll. Dashboard chạy ở port 4200 và là reporting system cho executive brief, summaries, alerts, drilldown, và các surface phục vụ CEO Memo.

> Điều quan trọng ở đây là boundary không chỉ nằm ở mặt giao diện hay ở việc mở ba cổng khác nhau. Boundary này còn nằm ở ownership của dữ liệu và ownership của hành vi ghi dữ liệu. SA không còn ghi trực tiếp vào bảng payroll nữa. Payroll service mới là nơi sở hữu write path của `pay_rates` và `sync_log`. Dashboard cũng không sở hữu auth flow; nó chỉ dùng auth contract chung để đọc reporting routes của riêng nó.

### Vì sao làm như vậy và trade-off

Lý do nhóm làm như vậy là để hệ thống dễ giải thích hơn cho bài Case Study 3 và Case Study 4. Khi mỗi vai trò nằm ở một service rõ ràng, bạn có thể nói rất rành mạch đâu là source mutation, đâu là downstream persistence, đâu là reporting read model. Điều này tốt hơn nhiều so với một app duy nhất tự làm mọi việc và chỉ chia database ở bên dưới.

Trade-off là nhóm chưa đi tới microservices production-grade. Đây vẫn là `same-repo multi-service runtime`, không phải một hệ phân tán hoàn chỉnh trên hạ tầng production. Cách nói an toàn là: nhóm đã tách runtime và boundary để chứng minh kiến trúc tích hợp, nhưng không claim đã hoàn tất mọi đặc tính của một production microservices platform.

## 5. Core 2: Dashboard giải quyết gì cho CEO Memo

### Core cần chứng minh gì

Phần này phải chứng minh rằng Case Study 2 là phần mạnh nhất của nhóm. Dashboard không chỉ là giao diện đẹp mà thực sự giải quyết nhu cầu tổng hợp management information cho CEO Memo.

### Thao tác demo

1. Đăng nhập Dashboard bằng:
   - email: `admin@localhost`
   - password: `admin_dev`
2. Dừng ở `Executive Overview`.
3. Chỉ lần lượt vào:
   - freshness status
   - action center
   - KPI row
   - executive brief
   - alerts panel
4. Nếu có thời gian, mở thêm drilldown hoặc analytics.

### Lời nói mẫu

> Đây là Dashboard service, và đây cũng là phần implemented mạnh nhất của nhóm trong toàn bộ bài. Bài toán của CEO Memo không phải là nhìn raw operational data, mà là nhìn management information đã được tổng hợp lại để ra quyết định nhanh. Vì vậy nhóm em tập trung xây dựng executive brief, KPI, alerts, drilldown, và export ở tầng reporting này.

> Ở góc độ kỹ thuật, Dashboard không cố giả vờ là realtime. Nhóm em chủ động dùng pre-aggregated summaries và read-model để ưu tiên tốc độ đọc, độ ổn định của giao diện, và khả năng phục vụ use case báo cáo. Vì vậy ở đây em luôn chỉ vào freshness metadata trước. Nó giúp người dùng hiểu dữ liệu mới đến mức nào, thay vì giả định rằng mọi con số trên màn hình luôn là realtime tuyệt đối.

> Ở trạng thái demo mong muốn, Dashboard đang ở trạng thái `Fresh` và action center ở trạng thái `Ready for Memo`. Điều đó có nghĩa là executive brief đang ở baseline đủ tốt để management đọc và tiếp tục drill xuống các khu vực cần chú ý như earnings, vacation, benefits, hay follow-up alerts.

> Phần alerts ở đây cũng rất quan trọng, vì nó là một phần của CEO Memo workflow. Nhóm em đang show bốn loại alert chính là anniversary, vacation, benefits_change, và birthday. Nếu trước giờ demo dataset bị lệch, em có thể re-baseline bằng `npm run demo:dashboard:prepare` để đảm bảo surface demo ổn định.

### Vì sao làm như vậy và trade-off

Lý do nhóm chọn Dashboard theo hướng read-model là vì đây là bài toán reporting. Nếu mỗi lần mở dashboard mà query thẳng từ dữ liệu vận hành theo kiểu nặng, giao diện sẽ khó ổn định, khó đảm bảo tốc độ, và khó giải thích về freshness. Read-model và summary tables giúp nhóm có một câu chuyện kỹ thuật nhất quán hơn: hệ thống phục vụ báo cáo quản trị thì phải tối ưu theo hướng đọc nhanh, rõ metadata, và cho phép drilldown khi cần.

Trade-off cần nói thật rõ là: nhóm không claim dashboard realtime và cũng không claim đây là BI platform hoàn chỉnh. Nhóm đang giải một bài toán reporting phục vụ CEO Memo với summary/read-model hợp lý cho phạm vi môn học. Đây là trade-off đúng, không phải thiếu sót phải giấu đi.

## 6. Core 3: Luồng SA -> Payroll là bằng chứng của Case Study 3

### Core cần chứng minh gì

Bạn cần chứng minh rằng source mutation xảy ra ở SA, sau đó hệ thống đồng bộ sang Payroll bằng một consistency model có kiểm soát. Đây là phần trọng tâm nhất của Case Study 3.

### Thao tác demo

1. Ở SA, dùng Swagger hoặc Postman gọi `POST /api/employee`.
2. Dùng payload demo như sau:

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

3. Chỉ vào response, đặc biệt là phần `sync.status`, `sync.mode`, hoặc correlation-related metadata nếu hiện ra.
4. Chuyển sang Payroll console ở `http://127.0.0.1:4100/`.
5. Tìm theo `employeeId` vừa tạo.
6. Chỉ vào pay rate, pay type, và sync evidence.
7. Quay lại SA và update employee:
   - `payRate` từ `41.5` sang `55`
   - `payType` từ `SALARY` sang `HOURLY`
8. Refresh Payroll console để cho thấy downstream update tiếp tục chạy.

### Lời nói mẫu

> Ở bước này em muốn chứng minh Case Study 3 bằng một luồng end-to-end thật. Em tạo employee ở SA trước. Điều quan trọng là source mutation chỉ xảy ra tại SA, vì SA là source-of-truth cho employee data.

> Khi request này thành công, SA sẽ ghi source record vào MongoDB trước. Sau đó hệ thống không cố làm strong consistency xuyên nhiều database, mà trả về trạng thái cho thấy sync đã được queue và sẽ được worker xử lý tiếp. Điều này thể hiện rất rõ consistency model hiện tại là eventual consistency có kiểm soát.

> Bây giờ em chuyển sang Payroll console. Đây là downstream system riêng, không phải cùng một UI giả lập. Khi worker của SA xử lý event và gọi internal API, Payroll service sẽ tự ghi `pay_rates` và `sync_log` vào MySQL của chính nó. Ở đây mình thấy record downstream xuất hiện, nghĩa là luồng tích hợp không chỉ nằm trên lý thuyết mà đang chạy thật.

> Em update employee thêm một lần nữa để chứng minh đây không chỉ là một lần sync đầu tiên. Sau khi đổi `payRate` và `payType` ở SA, Payroll tiếp tục nhận thay đổi và cập nhật downstream evidence của nó. Từ đó nhóm em có thể bảo vệ rằng data được nhập một lần ở source system, rồi được propagate sang downstream system với trace và recovery path rõ ràng.

### Vì sao làm như vậy và trade-off

Lý do nhóm chọn mô hình này là vì nó phù hợp với bài toán tích hợp giữa hai hệ thống có ownership khác nhau. Nếu SA ghi thẳng vào database của Payroll, boundary sẽ rất yếu và khi defend sẽ khó trả lời câu hỏi ownership dữ liệu nằm ở đâu. Còn khi SA chỉ chịu trách nhiệm source mutation và integration dispatch, còn Payroll tự chịu trách nhiệm write path của nó, toàn bộ câu chuyện hệ thống trở nên nhất quán hơn nhiều.

Trade-off phải nói rất rõ là: đây là `eventual consistency có kiểm soát`, không phải `ACID xuyên MongoDB và MySQL`, cũng không phải `2PC`. Nhóm dùng outbox-style event flow, worker, sync log, retry và replay để kiểm soát rủi ro của async integration. Cách nói này vừa đúng bản chất hiện tại, vừa đủ mạnh để bảo vệ bài, lại không overclaim.

## 7. Core 4: Monitoring và khả năng kiểm soát integration

### Core cần chứng minh gì

Phần này phải cho thấy nhóm không chỉ đồng bộ "trong happy path", mà còn có tư duy vận hành: biết nhìn queue state, biết retry, replay, và recovery path.

### Thao tác demo

1. Mở khu vực `Integration Exceptions`, `Operations`, hoặc panel queue monitoring nếu có.
2. Nếu muốn chủ động tạo tình huống demo:

```powershell
npm run demo:queue:warning
npm run demo:queue:critical
npm run demo:queue:cleanup
```

3. Chỉ vào backlog, trạng thái event, retry/replay actions, hoặc recover-stuck flow nếu UI/support screen cho phép.

### Lời nói mẫu

> Phần này là cách nhóm em bảo vệ Case Study 4. Nhóm em không nói rằng mình đã xây một enterprise middleware stack như Kafka hay RabbitMQ production cluster. Điều nhóm em đang chứng minh là ở mức coursework, hệ thống đã có đủ các thành phần cần thiết để quản lý async integration một cách có kiểm soát.

> Cụ thể, nhóm em có outbox-style event, có worker để xử lý nền, có khả năng retry khi downstream lỗi, có replay để phát lại event, và có recovery path cho các event bị kẹt. Điều này cho phép người vận hành không bị mù trước lỗi đồng bộ. Tức là integration ở đây không chỉ là “gửi request rồi cầu may”, mà là có trạng thái, có audit trail, có can thiệp vận hành khi cần.

> Em cố tình để phần này ở sau happy path, vì đây không phải core business flow cho CEO Memo. Nhưng nếu giảng viên hỏi sâu hơn về middleware hoặc operational control, đây là bằng chứng để cho thấy nhóm có nghĩ tới resilience và operability, chứ không chỉ nghĩ tới UI và CRUD.

### Vì sao làm như vậy và trade-off

Lý do làm phần này là để bài không bị đánh giá là “có đồng bộ nhưng không biết quản lý đồng bộ”. Trong thực tế, integration không chỉ có lúc thành công mà còn có lúc queue kẹt, downstream lỗi, hoặc event phải chạy lại. Nếu không có phần monitor và recovery, bạn khó bảo vệ Case Study 4.

Trade-off là nhóm chưa dùng enterprise broker thực thụ. Cách nói an toàn là `middleware-lite` hoặc `DB-backed outbox + worker + operator controls`. Bạn tuyệt đối không nên nói đây là enterprise middleware production-grade, vì điều đó vượt quá implementation hiện có.

## 8. Core 5: Giải thích vì sao nhóm chọn cách này thay vì cách khác

### Core cần chứng minh gì

Phần này giúp bạn chuyển từ mức “có làm” sang mức “hiểu tại sao làm như vậy”. Đây là phần ăn điểm lớn khi giảng viên hỏi sâu.

### Thao tác demo

Không cần thao tác thêm nhiều. Đây là đoạn nói khi đứng ở Dashboard hoặc quay về slide/tổng quan.

### Lời nói mẫu

> Nếu nhìn toàn bộ bài toán, nhóm em chủ động chọn kiến trúc theo hướng đủ rõ boundary để defend, chứ không chọn hướng làm thật nhiều thứ nhưng khó giải thích. Vì vậy nhóm em tách SA, Payroll và Dashboard thành ba runtime; dùng eventual consistency thay vì cố over-engineer strong consistency; và dùng read-model cho dashboard thay vì ép mọi thứ về realtime.

> Với CEO Memo, điều quan trọng nhất là management nhìn được bức tranh tổng hợp, thấy được khu vực cần follow-up, và có thể drill xuống bằng chứng chi tiết khi cần. Với System Integration, điều quan trọng nhất là cho thấy dữ liệu đi qua các hệ đúng owner, đúng đường, có trace, có monitoring, và có trade-off rõ ràng. Nhóm em chọn cách hiện tại vì nó cân bằng được hai mục tiêu đó trong phạm vi thời gian và scope của môn học.

### Vì sao làm như vậy và trade-off

Bạn nói phần này để biến trade-off thành một quyết định có chủ đích, thay vì để giảng viên coi đó là điểm yếu. Khi bạn nói rõ “nhóm em chọn eventual consistency vì phù hợp boundary và scope”, bạn đang chủ động làm chủ cuộc đối thoại. Còn nếu bạn né không nói, giảng viên sẽ là người nêu điểm yếu trước, và lúc đó bạn rơi vào thế bị động.

Trade-off phải nói trung thực:

- Không claim realtime dashboard.
- Không claim ACID xuyên hệ thống.
- Không claim transactional outbox chuẩn enterprise.
- Không claim Case Study 5 đã rollout production.

Nhưng đồng thời cũng phải nói rõ điểm mạnh:

- Dashboard cho CEO Memo đã chạy được và có evidence thật.
- Case Study 3 có runtime proof thật.
- Case Study 4 có monitor/recovery path thật.
- Root gate `verify:all` đã bao gồm cả proof Case 3, nên demo không chỉ dựa vào tay người dùng.

## 9. Core 6: Kết bài 45-60 giây

### Core cần chứng minh gì

Phần kết phải gom lại đúng ba điều mạnh nhất, để giảng viên ra khỏi buổi demo với kết luận đúng mà bạn muốn họ nhớ.

### Thao tác demo

Đứng ở Dashboard hoặc trở lại góc nhìn tổng quan. Không cần bấm thêm quá nhiều.

### Lời nói mẫu

> Tóm lại, phần nhóm em muốn bảo vệ mạnh nhất là thế này. Thứ nhất, Case Study 2 đã được hiện thực hóa thành một executive dashboard phục vụ CEO Memo, có KPI, alerts, drilldown, executive brief và các chỉ báo freshness rõ ràng. Thứ hai, Case Study 3 đã có bằng chứng runtime thật cho luồng SA sang Payroll theo mô hình eventual consistency có kiểm soát, với source system, downstream system và reporting system tách bạch. Thứ ba, Case Study 4 đã có mức middleware-lite đủ để theo dõi và can thiệp vận hành cho integration flow.

> Nhóm em không overclaim những phần chưa tới mức production-grade. Nhưng với phạm vi môn học, nhóm em tin rằng giải pháp hiện tại là hợp lý, chạy được, giải thích được, và bảo vệ được bằng cả code, runtime, lẫn verification gate.

### Vì sao làm như vậy và trade-off

Bạn chốt như vậy để giảng viên nhớ đúng “ba ý mạnh nhất” thay vì nhớ các chi tiết lẻ. Một buổi demo tốt không phải là buổi demo nói nhiều nhất, mà là buổi demo khiến người nghe rời đi với đúng kết luận bạn muốn họ giữ lại.

## 10. Nếu bị hỏi vặn ngay sau phần demo

### Câu hỏi: "Đây có phải monolith 2 DB không?"

> Không. Repo vẫn dùng chung codebase, nhưng runtime hiện tại đã tách thành ba process và ba port riêng. Quan trọng hơn, ownership của write path cũng đã tách rõ: SA không còn ghi trực tiếp vào payroll tables nữa.

### Câu hỏi: "Case 3 có ACID hay strong consistency không?"

> Không. Nhóm em không claim điều đó. Case 3 hiện được implement theo eventual consistency có kiểm soát, có outbox-style flow, worker, sync log, retry, replay, và recovery path.

### Câu hỏi: "Tại sao không dùng Kafka hay middleware enterprise thật?"

> Vì scope môn học. Nhóm em ưu tiên một increment chạy được, chứng minh được end-to-end, có monitoring và recovery path, thay vì dựng một broker stack lớn nhưng không kịp chứng minh vận hành thực sự trong bài.

### Câu hỏi: "Dashboard có realtime không?"

> Không claim realtime. Dashboard dùng pre-aggregated summaries và có freshness metadata để người dùng biết snapshot mới đến đâu.

### Câu hỏi: "Bốn loại alert có phải mock không?"

> Logic alert là thật. Với live demo, nhóm em có thể dùng `demo:dashboard:prepare` để re-baseline dataset demo cho ổn định. Đó là bước prep cho demo, không phải claim business runtime luôn tự sinh đủ bốn loại trong mọi dataset.

## 11. Những câu tuyệt đối không nên nói

Không nên nói:

- "Hệ thống này đã là microservices production-ready."
- "Case 3 của nhóm em là ACID xuyên MongoDB và MySQL."
- "Đây là transactional outbox chuẩn enterprise."
- "Case 4 của nhóm em là enterprise middleware stack."
- "Case 5 đã triển khai thật HA/DR/network production."

Nên nói:

- "same-repo multi-service runtime"
- "eventual consistency có kiểm soát"
- "Payroll service sở hữu write path của MySQL"
- "Dashboard là reporting system riêng"
- "middleware-lite đủ cho coursework"
- "Case 5 đang ở mức readiness/design evidence"

## 12. Nếu buổi demo bị hụt thời gian còn 7-8 phút

Nếu bị ép rút ngắn ngay tại lớp, hãy giữ nguyên thứ tự sau:

1. Mở đầu và boundary 30-45 giây
2. Dashboard 2 phút
3. SA -> Payroll 3 phút
4. Monitoring/queue 1 phút
5. Kết bài 30-45 giây

Trong trường hợp đó, bạn bỏ bớt phần giải thích dài, nhưng vẫn phải giữ đúng câu sau:

> Dashboard là reporting system cho CEO Memo. SA là source system. Payroll là downstream system. Luồng hiện tại là eventual consistency có kiểm soát, không phải ACID xuyên hệ thống. Phần monitoring hiện ở mức middleware-lite, và nhóm em không overclaim beyond implementation.

## 13. File nên mở kèm để hỗ trợ buổi demo

- Runbook ngắn: `docs/demo/live/demo_runbook_one_page_vi.md`
- Viva ngắn: `docs/demo/live/viva_defense_one_page_vi.md`
- Script ngắn: `docs/demo/live/demo_script_simple_vi.md`
- Talk track E2E: `docs/demo/live/demo_end_to_end_talk_track_vi.md`
- Cheatsheet claim/evidence: `docs/viva_claim_evidence_cheatsheet_vi.md`

Nếu chỉ mở đúng một file để cầm nói trong buổi demo 12-15 phút, hãy mở chính file này.
