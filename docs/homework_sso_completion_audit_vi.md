# Audit Mức Độ Hoàn Thiện Homework SSO

> Ngày audit: 2026-04-24
>
> Mục tiêu: đối chiếu codebase hiện tại với đúng yêu cầu homework, chấm mức hoàn thiện thực tế, và xác định những việc có ROI cao nhất để vượt kỳ vọng của giảng viên.

---

## 1. Kết luận nhanh

Nếu chỉ xét **lõi kỹ thuật SSO**, repo hiện tại đã ở mức **mạnh**.

Nếu xét **bài nộp cá nhân hoàn chỉnh** theo đúng yêu cầu môn học, repo hiện đã ở mức **rất sát trạng thái nộp điểm cao**. Những khoảng trống lớn trước đó như `zip source`, `screenshot`, và `video webm` đã được khóa bằng artifact thật; phần còn lại chủ yếu là điền thông tin sinh viên thật và rà video lần cuối.

Kết luận ngắn:

- `Kỹ thuật SSO`: mạnh
- `Chứng minh bằng runtime`: rất mạnh
- `Khả năng bảo vệ bằng code`: mạnh
- `Tài liệu`: mạnh
- `Deliverable nộp bài`: gần hoàn chỉnh, cần cập nhật zip cuối sau mỗi lần sửa docs/source

---

## 2. Cách map đúng nhất giữa codebase và đề homework

Đây là cách map **mạnh hơn** và đúng hơn so với việc chỉ nói `HR = SA`.

### 2.1 Cách map nên dùng khi bảo vệ

- `HR system` = `Dashboard` (giao diện người dùng cho workspace HR) + `SA / HR Service` (auth authority + source-of-truth backend)
- `Payroll system` = `Payroll console` + `Payroll Service`
- `SSO authority` = `SA / HR auth`

### 2.2 Vì sao cách kể này mạnh hơn

Nếu chỉ nói:

- `HR = SA service`

thì đúng ở backend, nhưng hơi yếu ở góc nhìn người chấm vì `SA` root hiện tại thiên về service landing và auth/source authority hơn là một giao diện người dùng HR đầy đủ.

Nếu nói:

- `Dashboard là HR workspace của người dùng`
- `SA là backend/auth authority của HR`
- `Payroll là hệ còn lại`

thì câu chuyện homework rõ hơn rất nhiều:

- người dùng đăng nhập vào HR workspace
- sau đó sang Payroll vẫn dùng được cùng danh tính
- hoặc đăng nhập từ Payroll trước rồi hệ còn lại khôi phục phiên

Đây là cách kể nên dùng trong báo cáo, video, và lúc trả lời vấn đáp.

---

## 3. Chấm điểm hiện tại

### 3.1 Điểm theo góc độ kỹ thuật

- `Kiến trúc 2 hệ độc lập`: `9.4/10`
- `Cơ chế SSO`: `9.5/10`
- `Bảo vệ API bằng token`: `9.3/10`
- `Session restore / deep-link / reload`: `9.5/10`
- `Logout / revoke`: `9.2/10`
- `Verification`: `9.5/10`

### 3.2 Điểm theo góc độ bài nộp

- `Code đáp ứng đề`: `9.5/10`
- `Tài liệu giải thích`: `9.5/10`
- `Video demo`: `9.2/10`
- `Source zip đúng yêu cầu`: `9.4/10`
- `Mức sẵn sàng nộp ngay`: `9.4/10`

### 3.3 Điểm theo góc độ “vượt mong đợi”

- `Hiện tại`: `9.5/10`
- `Nếu chốt thêm phần điền thông tin sinh viên + rà video cuối`: `9.7/10`

---

## 4. Ma trận đối chiếu với yêu cầu homework

## 4.1 Yêu cầu: Có hai hệ thống độc lập

Trạng thái: `Đạt`

Bằng chứng:

- `SA / HR Service` chạy riêng
- `Payroll Service` chạy riêng
- `Dashboard` là runtime riêng cho user workspace
- port tách biệt:
  - `4000` SA / HR
  - `4100` Payroll
  - `4200` Dashboard

Nhận xét:

Phần này đủ chắc để bảo vệ.

---

## 4.2 Yêu cầu: Một hệ đăng nhập xong vẫn dùng được hệ còn lại

Trạng thái: `Đạt`

Bằng chứng:

- `SA` có:
  - `POST /api/auth/signin`
  - `GET /api/auth/session`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
- `Payroll` có luồng restore session thật
- smoke browser auth pass:
  - `npm run verify:case3:browser-auth`

Runtime audit ngày `2026-04-24`:

- `npm run lint`: `passed`
- `npm --prefix dashboard run verify:frontend`: `passed`
- targeted backend contracts: `6 suites passed`, `41 tests passed`
- `npm run verify:case3`: `passed`

Ghi chú kiểm chứng: không claim full `npm run verify:backend` là đã pass trong lần audit này vì lệnh tổng hợp từng bị timeout ở môi trường local. Thay vào đó, bằng chứng nộp bài dùng các contract trọng tâm liên quan trực tiếp đến SSO/auth/session/runtime.

Nhận xét:

Đây là phần mạnh nhất của bài.

---

## 4.3 Yêu cầu: Giữ đúng tên đăng nhập / danh tính đã xác thực

Trạng thái: `Đạt`

Bằng chứng:

- `Payroll` không yêu cầu lưu password riêng
- token được cấp từ `SA`
- route payroll bảo vệ bằng token qua `verifyToken`
- refresh session quay lại trust chain của `SA`

Nhận xét:

Đủ chắc để nói đây là shared identity, không phải copy username thủ công.

---

## 4.4 Yêu cầu: Có tài liệu phân tích và thiết kế

Trạng thái: `Đạt`

Đã có:

- `docs/homework_sso_analysis_vi.md`
- `docs/homework_sso_report_outline_vi.md`
- `docs/homework_sso_report_vi.md`
- `docs/homework_sso_video_script_vi.md`
- `docs/homework_sso_gap_audit_vi.md`
- `docs/homework_sso_submission_checklist_vi.md`
- `docs/homework_sso_submission_readme_vi.md`
- `docs/homework_sso_viva_talking_points_vi.md`

Nhận xét:

Phần này đã hơn mức “có tài liệu”.

---

## 4.5 Yêu cầu: Thiết kế và xây dựng giải thuật SSO bảo đảm bảo mật

Trạng thái: `Đạt`

Bằng chứng:

- access token riêng
- refresh token bằng cookie `httpOnly`
- session probe riêng
- logout có thu hồi phiên
- protected API không mở công khai

Nhận xét:

Đủ tốt cho homework. Không nên over-claim thành full enterprise OIDC.

---

## 4.6 Yêu cầu: Có mã nguồn demo

Trạng thái: `Đạt`

Artifact:

- script đóng gói source:
  - `npm run homework:sso:package`
- zip sạch:
  - `dist/homework-sso-submission/.../SIP_CS-homework-sso.zip`

Nhận xét:

Phần này không còn chỉ là “có code”, mà đã có đường đóng gói nộp lặp lại được.

---

## 4.7 Yêu cầu: Có video quay demo

Trạng thái: `Đạt`

Artifact:

- video `.webm`:
  - `docs/homework-sso-assets/video/homework-sso-demo.webm`
- script tạo lại video:
  - `npm run homework:sso:record`

Nhận xét:

Phần này không còn là blocker kỹ thuật nữa. Việc còn lại chỉ là xem lại nội dung quay có đúng nhịp và đủ sắc hay không.

---

## 5. Những gì hiện tại đã làm tốt hơn mức “đủ an toàn”

Repo hiện tại không chỉ có login đơn giản. Nó đã có thêm các điểm này:

- browser smoke cho auth restore
- deep-link protected route sau login
- reload protected route mà vẫn giữ phiên
- revoke/logout có kiểm tra
- evidence pack builder
- script tạo screenshot thật
- script tạo video `.webm` thật
- script đóng gói source zip sạch cho bài nộp
- tách runtime rõ giữa SA, Payroll, Dashboard

Đây là các điểm giúp bài của bạn **trông giống hệ thống thật hơn** so với một bài homework SSO mức cơ bản.

---

## 6. Điểm yếu thực sự còn lại

## 6.1 Điểm yếu lớn nhất không còn nằm ở auth core

Auth core đã khá chắc.

Điểm còn lại giờ nằm ở:

- cách kể chuyện hệ thống sao cho thật sắc
- độ gọn và mượt của video cuối cùng
- việc điền đủ thông tin sinh viên, môn học, ngày nộp vào báo cáo chính

---

## 6.2 Chỗ lệch dễ bị thầy hỏi

### a. Nếu nói `HR = SA service` quá cứng

Nguy cơ:

- thầy có thể hỏi “giao diện HR cho người dùng ở đâu?”

Cách xử lý đúng:

- nói `Dashboard là HR workspace frontend`
- `SA` là auth authority + HR backend

### b. Nếu chỉ demo một chiều

Nguy cơ:

- thầy có thể hỏi “đăng nhập từ Payroll trước rồi quay lại HR có được không?”

Khuyến nghị:

- chuẩn bị cả 2 chiều:
  - `HR -> Payroll`
  - `Payroll -> HR`

### c. Nếu nói quá mức enterprise

Nguy cơ:

- bài bị hỏi sâu vào `OIDC discovery`, `JWKS`, `federation`

Khuyến nghị:

- nói đúng mức:
  - `centralized JWT + refresh-cookie SSO`
  - `OIDC-lite centralized session restore`

---

## 7. Việc cần làm để tiến gần mức 100 nhất

## 7.1 P0 - Nên làm ngay

### 1. Điền đầy đủ thông tin sinh viên vào báo cáo

Cần điền:

- môn học
- giảng viên
- họ tên sinh viên
- mã sinh viên
- ngày nộp

### 2. Xem lại video cuối cùng trước khi nộp

Artifact đã có:

- `docs/homework-sso-assets/video/homework-sso-demo.webm`

Điều cần rà lại:

- câu nói có khớp với script không
- có đủ `HR -> Payroll -> logout -> mất phiên` không
- có cần quay thêm chiều `Payroll -> HR` thủ công để tăng độ thuyết phục không

### 3. Dùng đúng gói source zip sạch

Artifact đã có:

- `npm run homework:sso:package`
- file zip sạch trong `dist/homework-sso-submission/...`

---

## 7.2 P1 - Nên làm nếu còn thời gian

### 1. Gắn screenshot thật vào bài nộp hoặc slide

Artifact đã có:

- `docs/homework-sso-assets/screenshots/01-hr-dashboard-signed-in.png`
- `docs/homework-sso-assets/screenshots/02-payroll-restored-record.png`
- `docs/homework-sso-assets/screenshots/03-payroll-after-logout.png`

### 2. Chuẩn bị 1 trang slide hoặc viva notes

Đã có nền:

- `docs/homework_sso_viva_talking_points_vi.md`

### 3. Duyệt lại checklist nộp bài một lần cuối

- `docs/homework_sso_submission_checklist_vi.md`

---

## 8. Artifact đã có thể dùng ngay

- Báo cáo chính:
  - `docs/homework_sso_report_vi.md`
- Script video:
  - `docs/homework_sso_video_script_vi.md`
- Checklist nộp bài:
  - `docs/homework_sso_submission_checklist_vi.md`
- README nộp bài cá nhân:
  - `docs/homework_sso_submission_readme_vi.md`
- Talking points vấn đáp:
  - `docs/homework_sso_viva_talking_points_vi.md`
- Screenshot:
  - `docs/homework-sso-assets/screenshots/...`
- Video:
  - `docs/homework-sso-assets/video/homework-sso-demo.webm`
- Source zip sạch:
  - `dist/homework-sso-submission/.../SIP_CS-homework-sso.zip`

---

## 9. Khuyến nghị cuối cùng

Nếu chỉ được chọn **một** việc cuối để tiến gần mức 100 nhất, hãy chọn:

### `Rehearsal`

Tức là:

- điền đầy đủ thông tin sinh viên vào báo cáo
- xem lại video `.webm`
- nói thử theo talking points một lượt
- kiểm tra zip cuối cùng trước khi upload

Đến đây, phần còn lại mang tính trình bày và kỷ luật nộp bài nhiều hơn là khoảng trống kỹ thuật.
