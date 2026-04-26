# Talking Points Vấn Đáp Homework SSO

## 1. Câu mở đầu 20 giây

“Bài của em giải quyết bài toán single sign-on giữa hai hệ thống độc lập là HR và Payroll. Trong repo hiện tại, HR được thể hiện bằng HR workspace ở Dashboard cùng backend SA, còn Payroll có console và backend riêng. SA là nơi xác thực trung tâm, còn Payroll tái sử dụng phiên đăng nhập từ SA thay vì yêu cầu nhập lại mật khẩu.”

## 2. Ba ý phải nói thật chắc

### Ý 1. Đây là hai hệ thống độc lập

- khác runtime
- khác port
- khác giao diện
- khác trách nhiệm nghiệp vụ

### Ý 2. Password chỉ đi vào HR

- HR / SA xác thực
- Payroll không giữ password
- Payroll chỉ dùng token do SA cấp

### Ý 3. SSO không chỉ là sign in

- có restore session
- có reload / deep-link
- có logout / revoke

## 3. Câu trả lời ngắn cho các câu hỏi dễ bị hỏi

### “Vì sao nói đây là SSO?”

“Vì người dùng đăng nhập một lần ở HR nhưng vẫn dùng được Payroll với cùng danh tính mà không nhập lại password.”

### “Vì sao không để Payroll tự login luôn?”

“Nếu Payroll cũng tự login độc lập thì đó không còn là single sign-on. Em tập trung auth ở HR để đảm bảo một trust chain chung.”

### “Bảo mật nằm ở đâu?”

“Password chỉ đi vào HR. Access token có thời hạn, refresh session được tách riêng, và logout có cơ chế revoke session.”

### “Đây có phải OIDC hoàn chỉnh không?”

“Chưa phải full enterprise OIDC. Đây là centralized JWT cộng refresh-cookie SSO, phù hợp với phạm vi homework nhưng vẫn bám sát mô hình thật.”

### “Điểm mạnh hơn bài cơ bản là gì?”

“Em không chỉ login được, mà còn có protected API thật, browser smoke cho reload và deep-link, cùng logout khiến hệ còn lại không restore được nữa.”
