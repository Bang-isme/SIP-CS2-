# Group 11 - Dashboard Hiện Có Gì Và Người Dùng Thao Tác Được Gì

> Tài liệu này chỉ mô tả những gì đang có thật trong codebase hiện tại. Không thêm claim ngoài phạm vi runtime hiện có.

## 1. Mục đích của Dashboard trong bài của nhóm 11

Dashboard hiện tại không phải là nơi ghi trực tiếp payroll. Vai trò chính của nó là:

1. Là reporting system riêng cho Case Study 2.
2. Là bề mặt quan sát và follow-up cho Case Study 3.
3. Là lớp trình bày giúp management và operator nhìn được dữ liệu tổng hợp từ nhiều nguồn mà không phải mở trực tiếp SA hoặc Payroll.

Ở mức runtime, Dashboard chạy riêng trên:

- `http://127.0.0.1:4200/login`

Các service liên quan:

- `SA / HR Service`: `http://127.0.0.1:4000/`
- `Payroll Service`: `http://127.0.0.1:4100/`
- `Dashboard Service`: `http://127.0.0.1:4200/`

## 2. Liên hệ với Case 1 đến Case 3

### Case 1 - Đề xuất kiến trúc

Dashboard đang nằm trong phương án kiến trúc "same repo, separate runtime systems":

- SA là source system
- Payroll là downstream system
- Dashboard là reporting/presentation system

Điểm quan trọng:

- Dashboard không sở hữu employee source CRUD
- Dashboard không sở hữu payroll write path
- Dashboard dùng shared auth/session từ SA nhưng route và service runtime là riêng

### Case 2 - Presentation / Reporting Integration

Dashboard là phần thể hiện Case 2 rõ nhất. Nó đang có:

- executive brief
- KPI cards
- chart analytics
- page-level drilldown
- alerts review
- CSV export
- quick navigation theo workflow

### Case 3 - Data Consistency / Functional Integration

Dashboard không trực tiếp chạy đồng bộ SA sang Payroll, nhưng nó hiển thị được các bằng chứng và điểm follow-up của luồng đó:

- action center trên Overview
- alert review và owner note
- integration queue / metrics / retry / replay / recover-stuck
- employee administration để tạo hoặc sửa source record ở SA

Tức là Dashboard vừa là bề mặt đọc dữ liệu tổng hợp, vừa là bề mặt thao tác dành cho operator/admin.

## 3. Quyền theo role hiện có trong codebase

Dashboard hiện dùng role-based permissions ở frontend:

- `user`
- `moderator`
- `admin`
- `super_admin`

Phân quyền hiện tại:

### 3.1. `user`

- đăng nhập và vào dashboard
- xem Overview
- xem Analytics
- xem Alert Review ở mức read/follow-up
- không vào được Integration Queue
- không vào được Employee Administration
- không vào được User Administration

### 3.2. `moderator`

- làm được mọi thứ của `user`
- được quản lý alert settings
- được lưu hoặc cập nhật owner note / acknowledgement cho alert

### 3.3. `admin`

- làm được mọi thứ của `moderator`
- vào được Integration Queue
- xem metrics queue
- retry từng event
- retry dead events
- recover stuck events
- replay events theo filter

### 3.4. `super_admin`

- làm được mọi thứ của `admin`
- quản lý employee source records
- quản lý user access
- promote user lên admin
- demote admin về user

Lưu ý:

- `super_admin` không được phép tự hạ quyền chính mình trong màn User Administration
- root admin account và super admin account được bảo vệ khỏi các thao tác promote/demote tùy tiện

## 4. Các màn hình hiện có và thao tác của người dùng

### 4.1. Màn Login

Route:

- `/login`

Người dùng thao tác được:

- đăng nhập bằng email + password
- nhận thông báo session restore nếu có lỗi hạ tầng thật
- bấm `Forgot password?` để xem hướng dẫn reset ngoài dashboard
- nếu self-signup đang bật thì có thể đi sang `/register`

### 4.2. Màn Register

Route:

- `/register`

Trạng thái hiện tại:

- UI self-signup đang bật mặc định nếu không tắt cờ `VITE_ENABLE_SELF_SIGNUP`

Người dùng thao tác được:

- tạo account mới với `username`, `email`, `password`
- account mới mặc định mang role `user`

Nếu cờ self-signup bị tắt:

- màn này chuyển sang trạng thái "request access" thay vì form đăng ký mở

### 4.3. Overview

Route:

- `/dashboard`

Dashboard Overview hiện có:

1. Executive brief
- hiển thị trạng thái tổng quát của workspace
- hiển thị freshness của summary/read-model
- hiển thị action center

2. KPI grid
- `Total Payroll YTD`
- `Total Vacation Days`
- `Avg Benefits Cost`
- `Active Alerts`

3. Quick navigation
- vào Analytics
- vào Alerts
- vào Operations nếu role cho phép

Người dùng thao tác được:

- refresh toàn dashboard
- đi tiếp sang Analytics, Alerts, Operations từ quick nav hoặc executive brief
- mở các follow-up path như review alerts, review queue, open analytics

### 4.4. Analytics

Route:

- `/dashboard/analytics`

Analytics page hiện có:

1. Filter bar
- chọn `Reporting year`
- chọn `Default drilldown scope` theo department
- clear scope

2. Charts
- Earnings
- Time Off
- Benefits

3. Drilldown triggers
- mỗi card chart có nút `Open drilldown`

Người dùng thao tác được:

- đổi năm báo cáo
- đổi scope department mặc định cho drilldown
- mở drilldown theo ngữ cảnh earnings / vacation / benefits
- retry từng data slice nếu endpoint đó lỗi

### 4.5. Analytics Drilldown

Route:

- `/dashboard/analytics/drilldown`

Drilldown page hiện có:

1. Export
- `Export CSV` cho selection hiện tại

2. Quick Views
- mở preset nhanh cho câu hỏi thường gặp
- mở saved views
- lưu saved view mới
- xóa saved view

3. Bộ lọc chính
- search theo employee ID hoặc tên
- filter theo department
- filter theo employment type
- mở `More Filters`

4. Bộ lọc nâng cao
- gender
- ethnicity
- shareholder status

5. Bộ lọc theo ngữ cảnh
- `Min Earnings`
- quick filter `Over 100k / 150k / 200k`
- benefit plan filter khi ở benefits context

6. Data grid
- xem selection totals
- xem table nhân viên
- đổi số dòng mỗi trang
- nhập page trực tiếp
- `Previous / Next`

Người dùng thao tác được:

- lọc employee records theo nhiều điều kiện
- lưu lại các câu hỏi lặp lại dưới dạng saved view
- export CSV
- phân trang dữ liệu lớn

### 4.6. Alert Review

Route:

- `/dashboard/alerts`

Alert Review hiện có:

1. Alert follow-up queue
- owner gaps
- re-review
- employees affected
- CTA mở alert detail

2. Alert detail summary
- total affected
- highest priority
- largest queue
- impact share

3. Alert cards
- `High Vacation Balance`
- `Benefits Payroll Impact`
- `Anniversaries`
- `Birthday Alert`

4. Detail modal cho từng alert
- search employee
- đổi page size
- xem danh sách employee trúng alert
- pagination trong modal

Người dùng thao tác được ở mức read:

- mở chi tiết của từng alert card
- xem employee list của từng alert
- tìm kiếm trong alert detail

Nếu role có quyền quản lý alert (`moderator`, `admin`, `super_admin`):

- lưu owner note / acknowledgement
- cập nhật owner note
- mở `Alert Settings`
- xem và chỉnh rule cấu hình alert

### 4.7. Operations - Integration Queue

Route:

- `/dashboard/integration`

Chỉ `admin` và `super_admin` mới vào được.

Màn này hiện có:

1. Queue summary
- backlog
- actionable items
- oldest pending age
- processing health

2. Filter trạng thái
- `FAILED`
- `DEAD`
- `PROCESSING`
- `PENDING`
- `SUCCESS`
- `ALL`

3. Event list
- xem event theo status
- xem metadata thời gian và trạng thái

4. Recovery controls
- retry một event
- retry dead events
- recover stuck processing events
- replay events theo filter

Người dùng thao tác được:

- theo dõi queue và metrics
- trigger retry / recover / replay
- đọc notice/error của queue
- để auto-refresh nền quan sát queue

### 4.8. Employee Administration

Route:

- `/dashboard/admin/employees`

Chỉ `super_admin` mới vào được.

Màn này hiện có:

1. Source record workspace
- search theo employee ID hoặc tên
- filter theo department
- filter theo employment type
- pagination

2. Employee list
- xem thông tin nhân viên
- xem department
- xem role info
- xem employment type
- xem compensation

3. Editor panel
- `New Employee`
- `Edit`
- `Delete`
- `Hide Editor`
- `Switch to Create`

4. Employee ID logic
- create: `employeeId` được hệ thống gợi ý và backend tự cấp
- edit: `employeeId` bị khóa
- lý do: Payroll dùng `employeeId` như downstream integration key

Người dùng thao tác được:

- tạo source record mới ở SA
- sửa source record
- xóa source record
- sau mutation, dashboard refresh lại executive snapshot / alerts / reporting liên quan

### 4.9. User Administration

Route:

- `/dashboard/admin/users`

Chỉ `super_admin` mới vào được.

Màn này hiện có:

1. User list
- username
- email
- roles
- updated time

2. Access actions
- `Promote to Admin`
- `Demote to User`

Các bảo vệ hiện có:

- không tự hạ quyền chính tài khoản đang đăng nhập
- root admin account được bảo vệ
- super admin account được bảo vệ khỏi promote/demote tùy tiện

Người dùng thao tác được:

- xem toàn bộ account hiện có
- xem account nào đang là admin
- promote user lên admin
- demote admin về user

## 5. Những cơ chế nổi bật từ codebase hiện tại

### 5.1. Shared auth nhưng service runtime tách riêng

Frontend đang chia API theo ownership:

- auth, users, employees, integrations -> SA
- executive reporting, alerts -> Dashboard

Điều này giúp dashboard vừa dùng chung session/auth, vừa không gom tất cả về một service duy nhất.

### 5.2. Session restore và refresh token

Dashboard hiện có:

- restore session khi mở app
- refresh access token qua SA
- xử lý signed-out bình thường nếu session cũ không còn hợp lệ

Điều này giúp UX đăng nhập đỡ gãy khi access token hết hạn.

### 5.3. Drilldown page-level workflow

Drilldown hiện không còn là modal nặng nhét vào chart card. Nó là route riêng, có:

- filter
- preset
- saved view
- export
- data pagination

Điểm này quan trọng vì nó biến analytics từ demo surface thành workspace thật sự dùng được.

### 5.4. Alert follow-up có owner note

Alert review hiện không chỉ là bảng đọc cảnh báo. Nó còn có:

- owner note
- acknowledgement status
- needs re-review
- alert settings

Nghĩa là dashboard đang hỗ trợ follow-up chứ không chỉ hiển thị số liệu.

### 5.5. Operations có recovery controls thật

Màn Operations hiện có đủ các thao tác operator quan trọng:

- retry một event
- retry dead queue
- recover stuck processing
- replay theo filter

Điểm này giúp Case 3 có bề mặt quan sát và can thiệp thực tế.

### 5.6. Employee Administration là source-record workspace

Màn quản lý employee hiện không chỉ là CRUD form:

- có search
- có filter
- có pagination
- có source record editor
- có logic employeeId ổn định
- có sync feedback sau mutation

Điều này hữu ích vì người vận hành có thể vừa xem danh sách vừa thao tác trên source system trong cùng một workspace.

## 6. Những giới hạn cần nói đúng khi trình bày

1. Dashboard không phải nơi chạy payroll thật
- payroll write path vẫn thuộc Payroll service

2. Dashboard không claim ACID xuyên hệ thống
- consistency model hiện tại là eventual consistency có kiểm soát

3. Một số thao tác chỉ xuất hiện theo role
- không phải user nào cũng thấy Operations hoặc Administration

4. Self-signup có trong UI hiện tại
- nhưng đây là feature flag của frontend, không phải điểm cốt lõi của Case 1-3

## 7. Cách nói ngắn gọn khi giảng viên hỏi "Dashboard hiện có gì?"

Có thể trả lời:

> Dashboard hiện là một reporting và operator workspace riêng. Người dùng có thể xem executive brief, KPI, chart analytics, page-level drilldown, alert review, integration queue, quản lý employee source records và quản lý user access, tùy theo role. Nó không ghi payroll trực tiếp, nhưng nó cho phép quan sát và điều phối các phần quan trọng của luồng SA sang Payroll.

## 8. Cách nói ngắn gọn khi giảng viên hỏi "Người dùng thao tác được gì?"

Có thể trả lời:

> Ở mức cơ bản, người dùng đăng nhập, xem overview, xem analytics, mở drilldown, xem alert detail và follow-up. Nếu có quyền cao hơn thì họ có thể quản lý alert settings, điều hành integration queue, tạo hoặc sửa employee source records, và quản lý quyền truy cập user. Toàn bộ những thao tác đó đang có thật trong frontend và route backend hiện tại.
