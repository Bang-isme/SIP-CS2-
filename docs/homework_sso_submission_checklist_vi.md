# Checklist Nộp Homework SSO

> Mục tiêu: dùng như checklist cuối trước khi nộp để đưa `deliverable nộp ngay` lên mức gần hoàn chỉnh.

## 1. Checklist kỹ thuật

- [x] `npm run lint` pass
- [x] targeted backend contracts pass `41/41`
- [x] `npm --prefix dashboard run verify:frontend` pass
- [x] `npm run verify:case3` pass
- [x] browser auth smoke pass trong luồng `verify:case3`
- [x] `SA`, `Payroll`, `Dashboard` có readiness/health trong luồng Case 3
- [ ] nếu còn thời gian, chạy lại full `npm run verify:backend`; không bắt buộc để claim SSO vì lệnh này có thể lâu hơn targeted contracts

## 2. Checklist báo cáo

- [ ] dùng [homework_sso_report_vi.md](D:\SIP_CS 2\SIP_CS\docs\homework_sso_report_vi.md:1) làm bản báo cáo chính
- [ ] kiểm tra lại tên môn, sinh viên, mã sinh viên, ngày nộp
- [ ] giữ nguyên mapping:
  - `HR system = Dashboard workspace + SA auth/backend`
  - `Payroll system = Payroll console + Payroll backend`
  - `SA auth = centralized SSO authority`
- [x] không claim full enterprise OAuth2/OIDC trong tài liệu chính

## 3. Checklist video

- [x] có video `.webm` trong `docs/homework-sso-assets/video/homework-sso-demo.webm`
- [ ] xem lại video cuối để chắc có đủ tab `HR workspace`
- [ ] xem lại video cuối để chắc có đủ tab `Payroll`
- [ ] xem lại video cuối để chắc chứng minh ban đầu Payroll chưa có session
- [ ] xem lại video cuối để chắc có sign in ở HR
- [ ] xem lại video cuối để chắc Payroll restore session thành công
- [ ] xem lại video cuối để chắc mở được `EMP0000001`
- [ ] xem lại video cuối để chắc logout làm Payroll không restore được nữa
- [ ] nếu muốn nâng điểm trình bày, quay thêm chiều ngược lại `Payroll -> HR`
- [ ] nếu muốn tạo video demo nhanh, chạy:
  - `npm run homework:sso:record`

## 4. Checklist artifact tăng độ thuyết phục

- [x] có ít nhất 3 screenshot:
  - [x] HR signed in
  - [x] Payroll restored session
  - [x] logout rồi Payroll mất session
- [ ] nếu muốn tạo screenshot nhanh, chạy:
  - `npm run homework:sso:capture`
- [ ] nếu có thời gian, build evidence pack có capture thật
- [ ] chuẩn bị 1 trang talking points để vấn đáp

## 5. Checklist đóng gói source

- [x] script package loại `node_modules`
- [x] script package loại `.git`
- [x] script package loại `dist`, `coverage`, `test-results`
- [x] có docs homework trong source zip
- [x] có script verify chính trong source zip
- [x] chạy script đóng gói:
  - `npm run homework:sso:package`
- [x] kiểm tra file zip mới nhất đã tạo được sau lần sửa cuối
  - `dist/homework-sso-submission/<timestamp>/SIP_CS-homework-sso.zip`

## 6. Checklist câu trả lời vấn đáp

- [ ] trả lời được vì sao đây là 2 hệ thống độc lập
- [ ] trả lời được vì sao password không đi vào Payroll
- [ ] trả lời được vì sao reload / deep-link vẫn dùng được
- [ ] trả lời được logout làm gì
- [ ] trả lời được giới hạn của giải pháp

## 7. Điều không được quên

- [ ] video không lan man sang analytics
- [ ] nếu nhắc Dashboard, chỉ nhắc nó như `HR workspace`
- [ ] nếu bị hỏi sâu, nói đúng mức:
  - `centralized JWT + refresh-cookie SSO`
  - không phải `full enterprise OIDC`
