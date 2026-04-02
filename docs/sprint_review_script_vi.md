# Sprint Review Script - CEO Memo + Case Study 1-5

## 1. Mo dau

Muc tieu nhom em khong chi la lam mot dashboard dep, ma la giai mot bai toan System Integration theo dung tinh than CEO memo:

- Tong hop du lieu tu nhieu he thong HR va payroll
- Tao executive dashboard cho management
- Ho tro drilldown de ra quyet dinh
- Co co che alerts cho cac truong hop can uu tien xu ly
- Giai thich duoc kien truc tich hop, tinh nhat quan du lieu, security va kha nang van hanh

Neu noi theo Scrum, product increment ma nhom dang demo la:
"Mot dashboard executive co du lieu tong hop, co drilldown, co alerting backend, co monitoring cho integration, va co roadmap de nang cap cac phan con partial."

## 2. Cach trinh bay theo Scrum

### Sprint Goal

Trong sprint nay, nhom tap trung dat 4 ket qua:

1. Ket noi va tong hop du lieu de phuc vu CEO memo
2. Hien thi dashboard theo goc nhin executive, khong chi la giao dien CRUD
3. Chung minh duoc integration flow, retry/replay va queue health
4. Ghi nhan trung thuc cac phan da xong, partial, va backlog cho sprint tiep theo

### Product Backlog Items da duoc increment hoa

1. Executive KPIs
   - Total payroll YTD
   - Total vacation days
   - Average benefits cost
   - Action items and alerts

2. Drilldown va decision support
   - Breakdown theo department
   - Filter theo gender, ethnicity, employment type
   - Drilldown mo record detail

3. Alerting
   - Triggered alerts cho birthday, anniversary, vacation, benefits change
   - Alert settings UI cho moderator/admin/super admin
   - Backend authorization cho alert configuration

4. Integration operations
   - Outbox/integration queue
   - Retry/replay controls
   - Monitoring panel cho failed events

## 3. Phan demo nen noi the nao

### A. Business problem truoc

"CEO memo yeu cau management nhin duoc xu huong payroll, vacation, benefits, va cac alert quan trong ma khong can vao tung he thong rieng le. Vi vay nhom em uu tien mot executive dashboard la increment chinh."

### B. Demo increment chinh

1. Di tu 4 KPI cards o dau trang
   - Giai thich day la summary layer cho management
   - Chi ro freshness badge de noi den data timeliness

2. Mo Earnings Overview
   - So sanh current year va previous year theo department
   - Chi ra top growth va biggest decline
   - Nhan manh cac breakdown da co PY/current de khop yeu cau memo hon

3. Mo Time-off Overview
   - Chi ra phan concentration theo shareholder, gender, ethnicity, type
   - Nhan manh da them PY va YoY delta de dashboard giong business question hon, khong chi la chart dep

4. Mo Benefits Plan Distribution
   - Giai thich cost efficiency signal
   - Neu can, noi day la phan support decision, khong phai payroll truth source

5. Mo Action Items va Integration Exceptions
   - Mot ben la business alert
   - Mot ben la operational integration control
   - Day la cach tach "decision layer" va "operations layer"

### C. Noi ve integration architecture

"Nhom em chon huong lam theo increment. Dau tien la dashboard va pre-aggregation de tao gia tri nhanh. Sau do moi mo rong sang outbox, retry/replay, queue health, va security hardening. Cach nay phu hop Scrum vi moi sprint deu co mot increment co the demo."

## 4. Danh gia trung thuc theo Case Study

### Case Study 1

Co the noi manh:

- Nhom da phan tich it nhat hai huong kien truc
- Da chon huong phu hop voi scope va thoi gian
- Da uu tien "implementable increment" truoc "full enterprise middleware"

### Case Study 2

Day la phan manh nhat de bao ve:

- Executive dashboard da ton tai
- Co summary + drilldown + CSV/export path
- Co the demo duoc gia tri cho management

### Case Study 3

Nen noi trung thuc:

- Hien tai he thong nghieng ve eventual consistency, khong claim full ACID xuyen tat ca database
- Nhung nhom da giai thich ro khi nao co the inconsistent, va co retry/replay de recover

Neu thay hoi sau:
"Case 3 cua nhom em dat muc implementation practical cho mon hoc, con neu de dat ACID xuyen he thong thi can transaction coordinator hoac giai phap enterprise hon."

### Case Study 4

Nen noi:

- Da co middleware-lite pattern: outbox, worker, retry, replay, monitoring
- Chua claim day du nhu Kafka/RabbitMQ production stack
- Nhung du de chung minh tu duy integration middleware va van hanh

### Case Study 5

Nen noi:

- Da co RBAC, token auth, route protection, va phan security/network/DR docs
- Can tiep tuc cung co bang security patching va DR evidence neu muon claim "production ready"

## 5. Cau hoi thay co the hoi

### "Tai sao UI dep nhung chua giong yeu cau?"

Tra loi de xuat:

"Luc dau nhom em uu tien increment co the demo duoc nhanh, nen UI va chart duoc lam som. Sau khi doi chieu lai CEO memo, nhom em bo sung them previous-year cues, alert settings, authorization, va tach ro business alerts voi integration controls de giong de bai hon."

### "Tai sao khong dung middleware enterprise that?"

Tra loi de xuat:

"Vi scope mon hoc va sprint constraint, nhom em chon architecture co the implement end-to-end trong thoi gian mon hoc. Tuy khong phai full enterprise bus, nhung pattern outbox + retry/replay + monitoring van cho thay dung tu duy integration."

### "Case 3 co that su ACID khong?"

Tra loi de xuat:

"Neu dinh nghia ACID xuyen toan bo cac he thong khac nhau thi chua. Nhom em khong overclaim diem nay. Hien tai chung em dat muc eventual consistency co kiem soat, va co noi ro trade-off trong tai lieu."

### "Alert manager co the tu set khong?"

Tra loi de xuat:

"Ban increment hien tai da co backend support va UI settings cho moderator/admin/super admin. Nghia la rule khong con hard-code trong dashboard nua, ma da co control point ro rang hon va phu hop hon voi vai tro management."

## 6. Cach ket bai de tao an tuong

"Neu nhin dashboard nhu mot san pham UI thi thay co the thay no dep. Nhung neu nhin dung theo mon System Integration Practices, dieu nhom em muon bao ve la incremental delivery:

- Co business value increment cho management
- Co integration increment cho data movement
- Co operations increment cho retry/replay
- Co security increment cho access control
- Co backlog ro rang cho cac phan chua full enterprise

Nhom em khong noi qua nhung gi da lam. Dieu nhom em muon chung minh la biet chon scope, biet trade-off, va biet delivery theo Scrum."

## 7. Sprint Review close

Ban co the ket bang 3 cau:

1. "Increment hien tai dat gia tri demo ro nhat o Case Study 2."
2. "Case 3-4 da co nen tang implementation; Case 5 hien o muc tai lieu, demo, va rehearsal-safe, nen nhom em van giu cach claim trung thuc theo muc do hoan thien."
3. "Neu co them mot sprint nua, backlog uu tien cua nhom em se la previous-year consistency tren moi widget, security patching, va hardening cho integration operations."
