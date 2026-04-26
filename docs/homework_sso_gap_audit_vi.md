# Gap Audit: Còn Thiếu Gì Để Claim Homework SSO Thật Chắc

> Mục tiêu: rà lại repo hiện tại và phân loại rõ:
> - cái gì đã đủ mạnh để claim
> - cái gì còn thiếu trước khi nộp
> - cái gì không nên over-claim

## 1. Kết Luận Nhanh

Nếu chỉ xét đúng đề homework `SSO giữa HR và Payroll`, codebase hiện tại đã có nền rất tốt.

Mức đánh giá hiện tại:

- `Lõi kỹ thuật SSO`: mạnh
- `Khả năng demo`: mạnh
- `Khả năng bảo vệ bằng code`: mạnh
- `Tài liệu homework chuyên biệt`: vừa được bổ sung
- `Mức claim enterprise`: chưa nên đẩy quá cao

Nói ngắn gọn:

> Repo này đủ tốt để làm bài homework này chắc tay, miễn là claim đúng mức và chuẩn bị report + video đúng trọng tâm.

---

## 2. Những Gì Đã Đủ Mạnh Để Claim

### 2.1 Có hai hệ thống độc lập thật

Trạng thái: `Đạt`

Bằng chứng:

- `SA / HR` chạy riêng
- `Payroll` chạy riêng
- script start riêng:
  - [package.json](D:\SIP_CS 2\SIP_CS\package.json:1)

Claim an toàn:

- “HR và Payroll là hai runtime độc lập”

Claim mạnh hơn nhưng vẫn ổn:

- “Đây là mô hình same-repo multi-service runtime với auth tập trung”

### 2.2 Có auth authority tập trung ở HR / SA

Trạng thái: `Đạt`

Bằng chứng:

- signin:
  - [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:295)
- refresh:
  - [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:394)
- session probe:
  - [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:460)
- logout:
  - [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:522)

Claim an toàn:

- “HR là nơi xác thực trung tâm”

### 2.3 Payroll thực sự dùng lại session từ HR

Trạng thái: `Đạt`

Bằng chứng:

- restore session:
  - [public/payroll-console/app.js](D:\SIP_CS 2\SIP_CS\public\payroll-console\app.js:251)
- sign in qua SA:
  - [public/payroll-console/app.js](D:\SIP_CS 2\SIP_CS\public\payroll-console\app.js:356)
- shared logout:
  - [public/payroll-console/sessionFlow.js](D:\SIP_CS 2\SIP_CS\public\payroll-console\sessionFlow.js:1)

Claim an toàn:

- “Sau khi đăng nhập ở HR, Payroll có thể restore và tái sử dụng phiên đăng nhập đó”

### 2.4 Payroll API thật sự được bảo vệ bởi token

Trạng thái: `Đạt`

Bằng chứng:

- payroll protected routes:
  - [payroll.routes.js](D:\SIP_CS 2\SIP_CS\src\routes\payroll.routes.js:1)
- token verification:
  - [authJwt.js](D:\SIP_CS 2\SIP_CS\src\middlewares\authJwt.js:79)

Claim an toàn:

- “Payroll không chỉ hiển thị giao diện, mà còn bảo vệ API bằng token đã xác thực”

### 2.5 Có gate kiểm thử cho browser auth restore

Trạng thái: `Đạt`

Bằng chứng:

- script:
  - [verify-case3-browser-auth.ps1](D:\SIP_CS 2\SIP_CS\scripts\verify-case3-browser-auth.ps1:1)
- npm command:
  - [package.json](D:\SIP_CS 2\SIP_CS\package.json:1)

Claim an toàn:

- “Luồng login, reload, deep-link, restore session đã có smoke verification”

---

## 3. Những Gì Còn Thiếu Nếu Muốn Claim Thật Chắc Khi Nộp

### 3.1 Sơ đồ kiến trúc và sequence diagram đã có trong báo cáo chính

Trạng thái: `Đã có`

Ảnh hưởng:

- người chấm có thể nhìn nhanh kiến trúc và luồng xử lý thay vì chỉ đọc mô tả code

Có trong:

- [homework_sso_report_vi.md](D:\SIP_CS 2\SIP_CS\docs\homework_sso_report_vi.md:250)
- các sequence diagram:
  - signin
  - restore session
  - logout

Mức ưu tiên: `Đã xử lý`

### 3.2 Video demo đã có, nhưng vẫn cần xem lại trước khi nộp

Trạng thái: `Đã có artifact`

Ảnh hưởng:

- bài nộp đã có video `.webm`, nhưng vẫn nên xem lại nhịp trình bày và nội dung trước khi upload

Cần kiểm:

- video hiện có:
  - `docs/homework-sso-assets/video/homework-sso-demo.webm`
- script lời nói:
  - [homework_sso_video_script_vi.md](D:\SIP_CS 2\SIP_CS\docs\homework_sso_video_script_vi.md:1)

Mức ưu tiên: `P0 - rà lần cuối`

### 3.3 Gói source nộp đã có script, cần tạo lại sau lần sửa cuối

Trạng thái: `Đã có quy trình`

Ảnh hưởng:

- nếu sửa docs/source xong mà không chạy lại package thì zip nộp có thể cũ

Cần làm:

- chạy lại:
  - `npm run homework:sso:package`
- kiểm tra bản source nộp:
  - không kèm `node_modules`
  - không kèm `.git`, `.env`, `dist`, `coverage`, `test-results`
  - có docs homework
  - có script verify chính

Mức ưu tiên: `P0`

### 3.4 Screenshot/evidence đã có, nhưng nên dùng như phụ lục

Trạng thái: `Đã có artifact`

Ảnh hưởng:

- screenshot giúp chứng minh nhanh khi không muốn chạy lại demo trước mặt giảng viên

Hiện trạng:

- đã có evidence pack builder:
  - [build-demo-evidence-pack.mjs](D:\SIP_CS 2\SIP_CS\scripts\build-demo-evidence-pack.mjs:1)
- đã có screenshot:
  - `docs/homework-sso-assets/screenshots/01-hr-dashboard-signed-in.png`
  - `docs/homework-sso-assets/screenshots/02-payroll-restored-record.png`
  - `docs/homework-sso-assets/screenshots/03-payroll-after-logout.png`

Cần làm nếu muốn chắc hơn:

- đính kèm screenshot vào phụ lục hoặc slide bảo vệ nếu giảng viên cho phép

Mức ưu tiên: `P1`

---

## 4. Những Gì Không Nên Over-Claim

### 4.1 Không nên claim “full OAuth2 / OIDC enterprise”

Trạng thái: `Không nên nói`

Vì sao:

- hiện tại chưa có:
  - authorization server chuẩn
  - discovery endpoint
  - JWKS / key rotation
  - audience/issuer enforcement production-grade

Nên nói:

- “centralized JWT + refresh-cookie SSO”
- hoặc “OIDC-lite centralized session restore”

### 4.2 Không nên claim “cross-domain SSO production-ready”

Trạng thái: `Không nên nói`

Vì sao:

- hiện tại flow local dựa trên cùng host `127.0.0.1` khác port
- cookie/session assumptions đang phù hợp local demo hơn production internet-scale

Nên nói:

- “phù hợp cho mô hình local/intranet demo với auth tập trung”

### 4.3 Không nên claim “Payroll hoàn toàn tách rời trust chain của HR”

Trạng thái: `Không nên nói`

Vì sao:

- Payroll đang tin cậy token do SA cấp
- đó là chủ ý của SSO

Nên nói:

- “Payroll là hệ độc lập về runtime và chức năng, nhưng dùng chung trust chain xác thực từ HR”

---

## 5. Những Gì Có Thể Nói Mạnh Khi Bảo Vệ

Bạn có thể nói khá chắc các câu sau:

- “Em không làm hai app đăng nhập riêng lẻ, mà tập trung xác thực tại HR rồi cho Payroll tái sử dụng phiên đăng nhập đó.”
- “Password chỉ đi vào HR, Payroll không cần giữ password người dùng.”
- “Session restore có route kiểm tra và route refresh riêng, không phải copy username qua frontend.”
- “Logout không chỉ xóa giao diện mà còn revoke session.”
- “Em có smoke verification cho browser auth restore trước khi demo.”

---

## 6. Mức Độ Sẵn Sàng Hiện Tại

### 6.1 Mức sẵn sàng kỹ thuật

`8.8/10`

Lý do:

- lõi SSO đã chạy được
- flow signin / restore / logout đã có
- browser auth smoke đã có

### 6.2 Mức sẵn sàng để nộp homework

`7.8/10`

Lý do:

- phần code ổn
- nhưng cần hoàn thiện nốt:
  - report theo format học thuật
  - video quay thật
  - source zip đúng yêu cầu

### 6.3 Mức sẵn sàng để bảo vệ miệng

`8.5/10`

Lý do:

- nếu nói đúng mức claim thì khá chắc
- nếu lỡ claim full OIDC enterprise thì dễ bị hỏi ngược

---

## 7. Checklist Cuối Cùng Trước Khi Nộp

- [ ] Hoàn thiện báo cáo theo outline
- [ ] Vẽ sơ đồ kiến trúc và sequence diagram
- [ ] Quay video theo script
- [ ] Chạy lại:
  - `npm run verify:case3:browser-auth`
- [ ] Nếu muốn chắc hơn:
  - `npm run demo:evidence:build`
- [ ] Đóng gói source không kèm thư viện
- [ ] Zip và kiểm tra lại tên file nộp

---

## 8. Kết Luận

Codebase hiện tại **đủ mạnh để làm bài homework SSO này rất chắc**, với điều kiện:

- tập trung đúng vào `SA/HR` và `Payroll`
- gọi đúng tên kỹ thuật của giải pháp
- không over-claim mức enterprise
- hoàn thiện nốt phần `report + video + source package`
