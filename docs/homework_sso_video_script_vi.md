# Script Video Demo Từng Câu Nói: Homework SSO Giữa HR Và Payroll

> Mục tiêu: quay video `4-6 phút`, ngắn, rõ, đi thẳng vào SSO.
>
> Cách kể mạnh nhất: `HR system = Dashboard + SA auth`, `Payroll system = Payroll console + Payroll backend`.

## 0. Chuẩn bị trước khi quay

- bật stack:
  - `npm run case3:stack:start`
- nên mở sẵn 3 tab:
  - tab 1: `HR workspace` tại `http://127.0.0.1:4200/login`
  - tab 2: `Payroll` tại `http://127.0.0.1:4100/`
  - tab 3: `SA service home` tại `http://127.0.0.1:4000/` để chứng minh auth authority nếu cần
- tài khoản demo:
  - `admin@localhost`
  - `admin_dev`
- employee demo:
  - `EMP0000001`

---

## 1. Mở đầu

### Thao tác

- hiển thị tab `HR workspace`
- hiển thị tab `Payroll`

### Lời nói

“Trong bài homework này, em xây dựng cơ chế single sign-on giữa hai hệ thống độc lập là HR và Payroll.”

“Trong repo hiện tại, HR được thể hiện bằng HR workspace ở Dashboard kết hợp với backend SA, còn Payroll là một console và backend riêng.”

“Mục tiêu là người dùng chỉ cần đăng nhập một lần ở HR, sau đó vẫn có thể sử dụng Payroll dưới đúng danh tính đó mà không cần nhập lại mật khẩu.”

---

## 2. Chứng minh đây là hai hệ thống độc lập

### Thao tác

- chỉ vào URL `4200`
- chỉ vào URL `4100`
- nếu cần, chỉ thêm `4000`

### Lời nói

“Đầu tiên em chứng minh đây là các runtime tách biệt.”

“HR workspace chạy ở cổng 4200, Payroll chạy ở cổng 4100, còn SA backend xác thực chạy ở cổng 4000.”

“Như vậy đây không phải là một ứng dụng đổi màn hình, mà là các hệ thống có vai trò riêng và giao tiếp với nhau.”

---

## 3. Chứng minh Payroll ban đầu chưa có phiên

### Thao tác

- chuyển sang tab Payroll
- để nguyên trạng thái signed out

### Lời nói

“Hiện tại ở Payroll, người dùng chưa có phiên đăng nhập.”

“Nếu chưa có phiên hợp lệ từ HR, Payroll không thể thực hiện payroll lookup.”

“Điểm này cho thấy Payroll không tự bỏ qua xác thực.”

---

## 4. Đăng nhập tại HR workspace

### Thao tác

- quay lại tab Dashboard login
- nhập email và password
- bấm `Sign In`

### Lời nói

“Tiếp theo em đăng nhập tại HR workspace.”

“Ở bước này, SA là nơi xác thực duy nhất. Password chỉ đi vào HR, không đi thẳng sang Payroll.”

“Sau khi xác thực thành công, hệ thống tạo access token và refresh session để hệ còn lại có thể tái sử dụng.”

---

## 5. Chuyển sang Payroll và chứng minh session được tái sử dụng

### Thao tác

- chuyển sang tab Payroll
- chờ trạng thái signed in hoặc restored

### Lời nói

“Bây giờ em chuyển sang Payroll.”

“Payroll sẽ kiểm tra xem phía HR còn refresh session hợp lệ hay không.”

“Nếu còn, Payroll sẽ gọi cơ chế restore session để lấy access token mới cho đúng người dùng đó.”

“Ở đây có thể thấy người dùng không cần nhập lại mật khẩu nhưng vẫn vào được Payroll dưới cùng danh tính đã đăng nhập trước đó.”

---

## 6. Chứng minh dùng được chức năng nghiệp vụ sau khi SSO

### Thao tác

- nhập `EMP0000001`
- bấm mở record
- chỉ vào pay rate và sync evidence

### Lời nói

“Tiếp theo em chứng minh sau khi SSO thành công thì người dùng thực sự dùng được Payroll.”

“Em nhập mã nhân viên và mở payroll record.”

“Hệ thống trả về pay rate và sync evidence tương ứng.”

“Điều này cho thấy Payroll không chỉ nhận trạng thái đăng nhập, mà còn dùng được token đó để truy cập chức năng bảo vệ.”

---

## 7. Chứng minh reload và deep-link vẫn giữ được phiên

### Thao tác

- refresh lại tab Payroll
- nếu được thì mở thêm tab Payroll deep-link hoặc quay lại protected screen

### Lời nói

“Em refresh lại Payroll để chứng minh phiên vẫn có thể được khôi phục khi còn hợp lệ.”

“Trong hệ thống thật, người dùng thường reload tab hoặc mở lại đường dẫn trực tiếp, nên phần này rất quan trọng.”

“Repo hiện tại cũng có browser smoke để verify chính luồng reload và deep-link này.”

---

## 8. Chứng minh chiều ngược lại: Payroll sang HR

### Thao tác

- nếu cần clear tab, quay lại Payroll sign-in flow
- sau đó mở lại Dashboard route bảo vệ

### Lời nói

“Để tăng độ thuyết phục, em demo thêm chiều ngược lại.”

“Sau khi phiên được thiết lập và còn hợp lệ, em quay lại HR workspace và vẫn truy cập được route bảo vệ với cùng danh tính.”

“Như vậy cơ chế SSO không chỉ hoạt động một chiều, mà giữ được trust chain giữa hai hệ thống.”

---

## 9. Logout và chứng minh session không còn dùng được

### Thao tác

- logout ở HR hoặc clear session ở Payroll
- quay lại Payroll
- thử reload hoặc tra cứu lại

### Lời nói

“Bây giờ em thực hiện logout.”

“Ở bước này, HR sẽ thu hồi phiên dùng chung và xóa refresh session.”

“Sau khi logout, Payroll không còn khả năng restore lại phiên cũ nữa.”

“Như vậy cơ chế single sign-on không chỉ có sign in, mà còn có sign out hợp lệ.”

---

## 10. Kết luận video

### Lời nói

“Tóm lại, em đã xây dựng được cơ chế SSO giữa hai hệ thống độc lập là HR và Payroll.”

“HR workspace và SA backend đóng vai trò phía HR, còn Payroll có runtime và giao diện riêng nhưng tái sử dụng phiên xác thực từ HR.”

“Người dùng chỉ cần đăng nhập một lần, có thể dùng hệ còn lại với đúng danh tính, reload vẫn restore được khi session còn hợp lệ, và logout thì phiên dùng chung cũng bị thu hồi.”

“Đó là toàn bộ phần demo của bài homework.”

---

## 11. Câu dự phòng nếu giảng viên hỏi thêm

### Nếu hỏi: “Đây có phải OAuth2 hoặc OIDC hoàn chỉnh không?”

Trả lời:

“Chưa phải full enterprise OAuth2 hoặc OIDC. Em đang làm theo mô hình centralized JWT cộng với refresh-cookie SSO, đủ đúng và đủ an toàn cho phạm vi bài tập.”

### Nếu hỏi: “Tại sao em nói HR là Dashboard cộng SA?”

Trả lời:

“Vì với người dùng, Dashboard là giao diện workspace của HR. Còn SA là backend xác thực và nguồn dữ liệu HR. Nếu tách đúng theo trải nghiệm người dùng và trách nhiệm kỹ thuật thì đây là cách map sát đề bài nhất.”

### Nếu hỏi: “Bảo mật nằm ở đâu?”

Trả lời:

“Password chỉ đi vào HR. Payroll không giữ password. Access token có thời hạn, refresh session được giữ riêng, và logout có cơ chế revoke session.”

### Nếu hỏi: “Hạn chế là gì?”

Trả lời:

“Hạn chế là đây chưa phải multi-domain federation hay full production IAM. Nhưng trong phạm vi homework, giải pháp này đủ gần hệ thống thật và chứng minh được luồng SSO rõ ràng.”
