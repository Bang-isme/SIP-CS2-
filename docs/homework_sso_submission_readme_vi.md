# README Nộp Bài Cá Nhân: Homework SSO HR Và Payroll

> Cập nhật: 2026-04-24
>
> Mục tiêu: dùng file này như hướng dẫn cuối trước khi upload bài lên hệ thống môn học.

## 1. Nội dung cần nộp

- Báo cáo chính: `docs/homework_sso_report_vi.md`
- Source code demo đã loại thư viện sinh ra: `dist/homework-sso-submission/<timestamp>/SIP_CS-homework-sso.zip`
- Video demo: `docs/homework-sso-assets/video/homework-sso-demo.webm`

Nếu hệ thống nộp bài chỉ cho upload một file, nên nén báo cáo đã xuất PDF/DOCX, source zip, và video `.webm` vào một file nén riêng để nộp.

## 2. Cách kể chính xác khi bảo vệ

- `HR system` là `Dashboard` như HR workspace cộng với `SA / HR Service` như auth authority và backend nguồn.
- `Payroll system` là `Payroll console` cộng với `Payroll Service`.
- `SA / HR auth` là nơi xác thực trung tâm.
- Người dùng đăng nhập một lần, sau đó hệ còn lại restore session bằng refresh-cookie SSO.

Không nên nói đây là full enterprise `OAuth2/OIDC`. Cách gọi đúng hơn là `centralized JWT + refresh-cookie SSO`.

## 3. Bằng chứng source cần nhấn mạnh

- `src/controllers/auth.controller.js`: signin, refresh, session probe, logout.
- `src/routes/payroll.routes.js`: Payroll API được bảo vệ bằng `verifyToken`.
- `public/payroll-console/app.js`: Payroll restore session từ auth authority.
- `dashboard/src/services/api.js`: HR workspace restore session cùng cơ chế.
- `scripts/verify-case3-browser-auth.ps1`: browser smoke cho SSO.
- `scripts/build-homework-submission.ps1`: đóng gói source sạch.

## 4. Verification đã dùng cho bản audit này

- `npm run lint`: pass.
- `npm --prefix dashboard run verify:frontend`: pass.
- Targeted backend contracts cho auth/session/runtime/rate-limit/payroll console: `41/41` pass.
- `npm run verify:case3`: pass end-to-end.

Không claim full `npm run verify:backend` đã pass nếu chưa chạy lại thành công trong máy hiện tại, vì lệnh tổng hợp này có thể lâu hơn và từng bị timeout.

## 5. Việc phải làm thủ công trước khi nộp

- Điền tên môn học, giảng viên, họ tên sinh viên, mã sinh viên, ngày nộp trong báo cáo.
- Mở video `.webm` xem lại một lượt.
- Tạo lại source zip sau lần sửa cuối bằng `npm run homework:sso:package`.
- Kiểm tra zip mới nhất không có `node_modules`, `.git`, `.env`, `dist`, `coverage`, `test-results`.
