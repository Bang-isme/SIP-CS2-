# Outline Báo Cáo Nộp: Homework SSO Giữa HR Và Payroll

> Mục tiêu: dùng outline này làm khung báo cáo hoàn chỉnh cho bài homework.
> Khuyến nghị độ dài: `10-15 trang` chưa tính phụ lục.

## Trang bìa

- Tên trường / môn học
- Tên bài: `Thiết kế và xây dựng cơ chế Single Sign-On giữa HR và Payroll`
- Sinh viên thực hiện
- Giảng viên
- Ngày nộp

## Mục lục

1. Giới thiệu bài toán
2. Mục tiêu và phạm vi
3. Phân tích hai hệ thống HR và Payroll
4. Yêu cầu của cơ chế SSO
5. Thiết kế kiến trúc SSO đề xuất
6. Giải thuật và luồng xử lý
7. Phân tích bảo mật
8. Cài đặt và mapping vào mã nguồn
9. Kiểm thử và kết quả demo
10. Đánh giá, hạn chế và hướng phát triển
11. Kết luận
12. Phụ lục

---

## 1. Giới thiệu bài toán

### 1.1 Bối cảnh

- HR và Payroll là hai hệ thống độc lập
- cả hai đều yêu cầu xác thực trước khi thao tác
- nếu mỗi hệ thống đăng nhập riêng thì trải nghiệm người dùng kém và khó quản trị

### 1.2 Bài toán đặt ra

- làm sao để người dùng chỉ cần đăng nhập một lần
- sau đó vẫn dùng được hệ thống còn lại với đúng danh tính đã đăng nhập

### 1.3 Mục tiêu của đề tài

- phân tích hai hệ thống
- thiết kế cơ chế SSO phù hợp
- cài đặt demo hoạt động thực tế
- giải thích được yếu tố bảo mật

---

## 2. Mục tiêu và phạm vi

### 2.1 Mục tiêu chức năng

- đăng nhập tại HR
- chuyển sang Payroll mà không cần nhập lại mật khẩu
- giữ đúng user identity
- logout làm mất hiệu lực phiên ở luồng dùng chung

### 2.2 Mục tiêu phi chức năng

- đơn giản để demo
- đủ an toàn cho bối cảnh bài tập
- dễ kiểm thử
- dễ giải thích trước giảng viên

### 2.3 Phạm vi thực hiện

- tập trung vào `HR/SA` và `Payroll`
- `Dashboard` chỉ là thành phần phụ, không phải trọng tâm bài

### 2.4 Ngoài phạm vi

- full OAuth2 / OIDC server chuẩn enterprise
- federation nhiều domain
- IAM production-grade

---

## 3. Phân tích hai hệ thống HR và Payroll

### 3.1 Phân tích hệ thống HR

- vai trò: quản lý người dùng, xác thực, quản lý nhân sự
- dữ liệu chính: user, employee, session/token
- trách nhiệm chính:
  - xác thực người dùng
  - cấp token
  - duy trì refresh session

### 3.2 Phân tích hệ thống Payroll

- vai trò: tra cứu và chứng minh dữ liệu payroll downstream
- dữ liệu chính: pay rate, sync log
- phụ thuộc:
  - không tự làm auth authority
  - tin cậy phiên đăng nhập do HR cấp

### 3.3 Điểm độc lập giữa hai hệ thống

- chạy ở runtime riêng
- URL riêng
- giao diện riêng
- chức năng riêng

### 3.4 Vấn đề nếu chưa có SSO

- người dùng phải đăng nhập hai lần
- quản lý phiên rời rạc
- trải nghiệm kém
- tăng khả năng sai lệch hoặc lặp thao tác

---

## 4. Yêu cầu của cơ chế SSO

### 4.1 Yêu cầu chức năng

- login một lần
- dùng được hệ thống còn lại
- vẫn nhận đúng user cũ
- có thể logout
- có thể khôi phục session nếu còn hợp lệ

### 4.2 Yêu cầu bảo mật

- không truyền password sang Payroll
- token phải có thời hạn
- refresh session phải được bảo vệ
- logout phải revoke được phiên

### 4.3 Yêu cầu demo

- nhìn thấy rõ 2 hệ thống riêng
- chứng minh được luồng:
  - signin
  - restore session
  - payroll lookup
  - logout

---

## 5. Thiết kế kiến trúc SSO đề xuất

### 5.1 Mô hình được chọn

- `Centralized JWT + Refresh-Cookie SSO`
- hoặc có thể gọi là:
  - `OIDC-lite centralized session restore`

### 5.2 Thành phần kiến trúc

- `HR / SA`
  - identity authority
  - sign in
  - refresh
  - logout
- `Payroll`
  - relying application
  - kiểm tra session
  - restore token
  - dùng token để gọi payroll API

### 5.3 Sơ đồ kiến trúc cần đưa vào báo cáo

- sơ đồ component:
  - User
  - HR/SA
  - Payroll
  - token/session store

### 5.4 Trust boundary

- password chỉ đi vào HR
- Payroll không giữ password
- Payroll chỉ chấp nhận token do HR cấp

---

## 6. Giải thuật và luồng xử lý

### 6.1 Thuật toán đăng nhập lần đầu

Mô tả:

1. nhập username/email + password tại HR
2. HR xác thực
3. HR tạo access token
4. HR tạo refresh token
5. HR lưu refresh token/session
6. HR trả access token và set refresh cookie

### 6.2 Thuật toán restore session từ Payroll

Mô tả:

1. mở Payroll
2. Payroll kiểm tra local token
3. nếu chưa có:
   - gọi `/auth/session`
4. nếu còn refresh cookie:
   - gọi `/auth/refresh`
5. nhận access token mới
6. dùng access token để thao tác Payroll

### 6.3 Thuật toán logout

Mô tả:

1. gửi logout request
2. HR xóa session/token liên quan
3. xóa refresh cookie
4. hệ còn lại không thể restore phiên nữa

### 6.4 Thuật toán khi access token hết hạn

Mô tả:

1. request thất bại do token hết hạn
2. thử refresh session
3. nếu thành công thì request lại
4. nếu thất bại thì yêu cầu sign in lại

### 6.5 Sequence diagram cần có

- Sign in
- Restore session from Payroll
- Logout
- Token expired then refresh

---

## 7. Phân tích bảo mật

### 7.1 Rủi ro chính

- lộ access token
- refresh token bị lạm dụng
- dùng lại phiên cũ sau logout
- giả mạo hệ thống downstream

### 7.2 Biện pháp đang áp dụng

- access token ngắn hạn
- refresh token tách riêng
- refresh token đi qua cookie `httpOnly`
- token rotation ở refresh
- revoke session ở logout

### 7.3 Vì sao thiết kế này phù hợp cho bài tập

- đủ gần mô hình thật
- đủ giải thích được security reasoning
- không quá phức tạp để demo

### 7.4 Hạn chế cần nêu trung thực

- chưa phải full OAuth2/OIDC enterprise
- chưa phải multi-domain federation
- chưa có audience/scope tách riêng theo từng hệ ở mức production-grade

---

## 8. Cài đặt và mapping vào mã nguồn

### 8.1 Các file chính của HR / SA

- `src/controllers/auth.controller.js`
- `src/routes/auth.routes.js`
- `src/apps/saApp.js`

### 8.2 Các file chính của Payroll

- `public/payroll-console/app.js`
- `public/payroll-console/sessionFlow.js`
- `src/routes/payroll.routes.js`

### 8.3 Các file hỗ trợ auth verification

- `src/middlewares/authJwt.js`

### 8.4 Mapping chức năng -> file

- signin -> auth controller
- refresh -> auth controller
- session status -> auth controller
- logout -> auth controller
- payroll restore -> payroll console app
- payroll protected API -> payroll routes + auth guard

---

## 9. Kiểm thử và kết quả demo

### 9.1 Kiểm thử chức năng

- login tại HR thành công
- mở Payroll và restore session thành công
- payroll lookup hoạt động
- logout xong không restore được nữa

### 9.2 Kiểm thử bảo mật cơ bản

- sai mật khẩu bị từ chối
- thiếu token bị từ chối
- token bị revoke thì request bị từ chối

### 9.3 Bằng chứng kỹ thuật nên trích

- `npm run verify:case3:browser-auth`
- `npm run demo:evidence:build`

### 9.4 Kết quả

- cơ chế SSO demo chạy được
- người dùng chỉ cần đăng nhập một lần
- Payroll tái sử dụng phiên từ HR

---

## 10. Đánh giá, hạn chế và hướng phát triển

### 10.1 Điểm đạt được

- 2 hệ thống độc lập
- auth tập trung
- session restore hoạt động
- logout hợp lý

### 10.2 Hạn chế

- chưa full OIDC
- còn giả định môi trường same-site / same-host local demo
- chưa có browser redirect-based login federation hoàn chỉnh

### 10.3 Hướng phát triển

- issuer/audience validation rõ hơn
- scope riêng cho từng hệ
- key rotation
- chuẩn hóa IdP theo OAuth2/OIDC hơn

---

## 11. Kết luận

Phần này viết ngắn:

- bài toán SSO giữa HR và Payroll đã được phân tích
- em đã chọn cơ chế `JWT + refresh-cookie` tập trung tại HR
- Payroll có thể tái sử dụng phiên đăng nhập từ HR
- giải pháp đáp ứng mục tiêu bài tập và đủ thuyết phục về mặt kỹ thuật

---

## 12. Phụ lục

### Phụ lục A: Lệnh chạy demo

- `npm run case3:stack:start`
- `npm run verify:case3:browser-auth`

### Phụ lục B: URL demo

- SA / HR
- Payroll

### Phụ lục C: Danh sách file nguồn chính

- liệt kê các file auth và payroll liên quan

### Phụ lục D: Ảnh chụp màn hình / log

- sign in
- restore session
- payroll proof
- logout
