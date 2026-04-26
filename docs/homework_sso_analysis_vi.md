# Phân Tích Homework SSO Giữa HR Và Payroll

> Cập nhật: 2026-04-24
> Mục tiêu: map trực tiếp đề homework với codebase hiện tại để biết có thể nộp gì, nói gì, và cần nhấn mạnh phần nào.

## 1. Tóm Tắt Đề Bài

Đề yêu cầu:

- `Payroll` và `HR` là 2 hệ thống chạy độc lập
- cả 2 đều có cơ chế đăng nhập trước khi dùng
- cần phân tích 2 hệ thống
- cần xây dựng cơ chế `single sign-on (SSO)` để:
  - người dùng đăng nhập vào một hệ thống
  - sau đó có thể dùng hệ thống còn lại
  - vẫn giữ đúng danh tính đăng nhập trước đó
- cần nộp:
  - tài liệu phân tích + thiết kế SSO
  - thiết kế và xây dựng giải thuật SSO có bảo mật
  - mã nguồn demo
  - video quay minh họa hoạt động

Hiểu đúng bài toán:

- đây không bắt buộc phải là full enterprise OAuth2/OIDC như Google/Microsoft
- nhưng không được làm kiểu giả lập quá đơn giản như copy username giữa 2 app
- cần có:
  - một nơi xác thực trung tâm
  - cơ chế khôi phục phiên hợp lý
  - logout/session expiry đủ giải thích được
  - câu chuyện bảo mật đủ chặt để bảo vệ bài

## 2. Mapping Đề Bài Vào Codebase Hiện Tại

Trong repo này, cách map chính xác nhất để nộp bài là:

- `HR system` = `Dashboard` như HR workspace cho người dùng + `SA / HR Service` như auth authority và HR backend
- `Payroll system` = `Payroll console` + `Payroll Service`
- `SSO authority` = `SA / HR auth`

Cách kể này quan trọng vì đề yêu cầu hai hệ thống mà người dùng có thể thao tác. `Dashboard` là bề mặt HR để đăng nhập và sử dụng, còn `SA` là nơi giữ trách nhiệm xác thực và dữ liệu nguồn.

### 2.1 HR workspace và SA hiện có gì

`Dashboard` cung cấp bề mặt đăng nhập và workspace HR. `SA` cung cấp lõi xác thực:

- đăng nhập:
  - [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:295)
- refresh session:
  - [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:394)
- session probe:
  - [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:460)
- logout:
  - [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:522)
- route auth:
  - [auth.routes.js](D:\SIP_CS 2\SIP_CS\src\routes\auth.routes.js:29)

Điểm quan trọng:

- access token được ký bằng JWT
- refresh token được giữ qua cookie `httpOnly`
- session refresh chạy qua `/api/auth/refresh`
- có `/api/auth/session` để kiểm tra có khả năng restore phiên hay không

### 2.2 Payroll hiện có gì

`Payroll` là hệ thống downstream riêng. Nó không giữ password riêng, mà dựa trên phiên được xác thực bởi `SA`:

- app frontend:
  - [public/payroll-console/app.js](D:\SIP_CS 2\SIP_CS\public\payroll-console\app.js:1)
- sign in qua SA:
  - [public/payroll-console/app.js](D:\SIP_CS 2\SIP_CS\public\payroll-console\app.js:356)
- restore session:
  - [public/payroll-console/app.js](D:\SIP_CS 2\SIP_CS\public\payroll-console\app.js:251)
- fetch có retry sau restore:
  - [public/payroll-console/app.js](D:\SIP_CS 2\SIP_CS\public\payroll-console\app.js:330)
- logout shared session:
  - [public/payroll-console/app.js](D:\SIP_CS 2\SIP_CS\public\payroll-console\app.js:291)

Điểm quan trọng:

- Payroll gọi `SA /auth/signin`
- Payroll thử `SA /auth/session`
- nếu còn refresh cookie thì Payroll gọi `SA /auth/refresh`
- nếu restore thành công thì Payroll lấy được access token đúng user cũ
- như vậy về bản chất đây là mô hình `SSO-lite with centralized session authority`

### 2.3 SA đã tự mô tả đúng vai trò này trong app

Service landing của SA hiện đã nói rõ:

- `Session = JWT + refresh`
- `Dashboard and Payroll reuse SA sign-in`

Tham chiếu:

- [saApp.js](D:\SIP_CS 2\SIP_CS\src\apps\saApp.js:39)

## 3. Cách Kể Kiến Trúc Đúng Nhất Cho Bài Homework

Không nên nói:

- “em đã làm full OAuth2 server”
- “đây là OIDC hoàn chỉnh”

Nên nói:

- “em xây dựng cơ chế SSO tập trung phiên đăng nhập tại HR/SA”
- “Payroll là hệ thống độc lập nhưng tin cậy phiên xác thực do SA cấp”
- “sau khi đăng nhập ở SA, người dùng có thể dùng Payroll mà không cần nhập lại mật khẩu nếu refresh session còn hợp lệ”

Tên gọi kỹ thuật phù hợp:

- `centralized JWT + refresh-cookie SSO`
- hoặc `OIDC-lite / centralized session restore`

Đây là cách nói vừa đúng, vừa đủ mạnh, vừa không over-claim.

## 4. Luồng Hoạt Động Nên Viết Trong Tài Liệu

### 4.1 Luồng đăng nhập lần đầu

1. Người dùng mở `HR / SA`
2. Người dùng nhập tài khoản và mật khẩu
3. `SA` xác thực thông tin đăng nhập
4. `SA` cấp:
   - `access token` ngắn hạn
   - `refresh token` qua cookie `httpOnly`
5. Người dùng được xác thực trong `SA`

### 4.2 Luồng dùng Payroll sau khi đã đăng nhập SA

1. Người dùng mở `Payroll`
2. `Payroll` kiểm tra local token hiện tại
3. Nếu chưa có token:
   - `Payroll` gọi `SA /api/auth/session`
4. Nếu `refresh cookie` còn tồn tại:
   - `Payroll` gọi `SA /api/auth/refresh`
5. `SA` xác minh refresh token và cấp access token mới
6. `Payroll` dùng access token đó để thực hiện lookup/payroll proof

### 4.3 Luồng logout

1. Người dùng logout
2. `SA` revoke session token đã lưu
3. `SA` xóa refresh cookie
4. `Payroll` không thể restore lại phiên sau đó

### 4.4 Luồng session hết hạn

1. access token hết hạn
2. app thử restore qua refresh token
3. nếu refresh token còn hợp lệ thì vào tiếp
4. nếu refresh token hết hạn hoặc bị revoke thì người dùng phải đăng nhập lại

## 5. Phân Tích Bảo Mật Nên Trình Bày

Đây là phần rất dễ ăn điểm nếu nói đúng.

### 5.1 Điểm mạnh hiện có

- `access token` và `refresh token` tách vai trò
- refresh token không đưa thẳng vào localStorage của frontend, mà đi qua cookie `httpOnly`
- có route riêng cho:
  - signin
  - refresh
  - session status
  - logout
- có token rotation ở refresh flow
- có cơ chế revoke token khi logout

Tham chiếu:

- [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:295)
- [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:394)
- [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:460)
- [auth.controller.js](D:\SIP_CS 2\SIP_CS\src\controllers\auth.controller.js:522)

### 5.2 Lý do kiến trúc này an toàn hơn cách đơn giản

So với cách làm yếu như:

- dùng chung password giữa 2 hệ
- copy username qua query param
- lưu refresh token trong localStorage

cách hiện tại tốt hơn vì:

- `SA` là nơi xác thực duy nhất
- `Payroll` không cần biết password người dùng
- `Payroll` chỉ dùng token do `SA` cấp
- refresh token được giữ ở cookie `httpOnly`, khó bị JS đọc trực tiếp
- logout có thể revoke session thay vì chỉ xóa UI state

### 5.3 Hạn chế cần nói trung thực

Nên nói thật:

- đây chưa phải full SSO federation giữa nhiều domain độc lập
- hiện tại phù hợp với môi trường demo/local stack
- trong production thật có thể cần thêm:
  - CSRF hardening
  - stricter cookie/domain policy
  - audience validation giữa từng relying system
  - key rotation / JWKS
  - centralized IdP chuẩn OAuth2/OIDC hơn

Nói thật như vậy thường có lợi hơn là claim quá mức.

## 6. Bài Nộp Nên Tổ Chức Như Thế Nào

### 6.1 Tài liệu

Tài liệu nên có 6 mục:

1. `Giới thiệu bài toán`
2. `Phân tích 2 hệ thống HR và Payroll`
3. `Thiết kế kiến trúc SSO`
4. `Giải thuật/luồng xử lý`
5. `Phân tích bảo mật`
6. `Kịch bản demo và kết quả`

### 6.2 Sơ đồ nên có

Ít nhất nên có:

- `architecture diagram`
- `sequence diagram: sign in`
- `sequence diagram: restore session from Payroll`
- `sequence diagram: logout`

### 6.3 Mã nguồn

Khi nộp source:

- nhấn mạnh 2 runtime riêng:
  - `src/sa-server.js`
  - `src/payroll-server.js`
- auth/session logic:
  - `src/controllers/auth.controller.js`
- payroll reuse session:
  - `public/payroll-console/app.js`

## 7. Kịch Bản Video Demo 3-5 Phút

Flow ngắn nhất nhưng đủ mạnh:

1. Mở `SA` và `Payroll` ở 2 URL khác nhau
2. Chứng minh `Payroll` đang ở trạng thái chưa có session
3. Đăng nhập tại `SA`
4. Chuyển sang `Payroll`
5. Chứng minh `Payroll` restore được phiên và dùng đúng user đó
6. Lookup một `employeeId` để chứng minh Payroll hoạt động bằng phiên đã reuse
7. Logout
8. Quay lại `Payroll` và chứng minh session không còn restore được nữa

Nếu còn thời gian:

- reload Payroll sau khi sign in để chứng minh session persistence

## 8. Những Gì Repo Hiện Tại Đã Đủ Cho Đề

Hiện tại repo này đã đủ mạnh cho phần lõi homework ở các ý sau:

- có 2 hệ thống riêng:
  - `SA`
  - `Payroll`
- có auth authority tập trung ở `SA`
- có access token + refresh cookie
- có session restore từ `Payroll`
- có logout/revoke
- có thể demo được luồng `login một lần -> dùng Payroll`

Nói ngắn gọn:

> Nếu tập trung đúng vào `SA + Payroll`, repo hiện tại đã có nền rất tốt để làm bài homework này.

## 9. Những Gì Cần Tránh Khi Làm Bài

- không biến bài thành bài về `Dashboard analytics`
- không claim full OAuth/OIDC enterprise nếu không implement đủ
- không kể quá dài về middleware/outbox nếu đề chỉ hỏi SSO
- không để video lan man qua quá nhiều màn hình
- không quên demo `logout` hoặc `session restore`

## 10. Kết Luận

Câu chuyện kỹ thuật tốt nhất cho bài này là:

- `SA / HR` là hệ thống nguồn và nơi xác thực trung tâm
- `Payroll` là hệ thống độc lập nhưng tái sử dụng phiên xác thực do `SA` cấp
- SSO được thực hiện theo mô hình `JWT access token + refresh cookie + session restore`
- user chỉ cần đăng nhập một lần ở `SA`, sau đó có thể dùng `Payroll` dưới cùng danh tính
- cơ chế này đủ gần hệ thống thật, đủ an toàn cho bối cảnh bài tập, và đủ rõ để bảo vệ trước giảng viên
