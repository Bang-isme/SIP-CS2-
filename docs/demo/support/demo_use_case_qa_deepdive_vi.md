# Demo Q&A Deep Dive - Phan Bien Sau Theo Use Case

> Nhom 11 | Cap nhat: 2026-04-15
> File nay bo sung cho `demo_qa_defense_vi.md`.
> Muc tieu: tra loi duoc cac cau hoi xoay sau ve boundary, consistency, data ownership, va vi sao nhom chon cach lam hien tai.

---

## Nhom 1 - Cau hoi ve service boundary

### Q1.1: "Day co phai van la 1 monolith noi voi 2 database khong?"

**Tra loi ngan:**

Khong trinh bay no nhu "1 app duy nhat" nua. Hien tai repo chay thanh **3 process / 3 port / 3 service**:

- `SA Service` tren port `4000`
- `Payroll Service` tren port `4100`
- `Dashboard Service` tren port `4200`

Moi service co app factory rieng, health rieng, route ownership rieng, va vai tro rieng.

**Diem quan trong de defend:**

- `SA` khong con ghi thang bang payroll.
- `Payroll` tu so huu write path cua MySQL qua internal API.
- `Dashboard` la reporting system rieng cho Case Study 2.

**Noi that ve trade-off:**

- Van la same repo va dung chung mot so module/framework.
- Nhung boundary runtime va ownership da ro rang hon dang ke so voi cach "1 Express app + 2 DB".

### Q1.2: "Neu la system integration, tai sao SA khong goi public API cua Payroll?"

**Tra loi:**

Nhom em dung **internal service API**, khong dung public read API, de tach 2 nhu cau:

- Public API cua Payroll chi de doc va demo console
- Internal API de Payroll nhan mutation tu SA worker

Endpoint noi bo hien tai:

- `GET /api/payroll/internal/health`
- `POST /api/payroll/internal/sync`

Internal API duoc bao ve boi `INTERNAL_SERVICE_SECRET`, nen boundary van ro hon so voi viec cho SA ghi truc tiep MySQL.

### Q1.3: "Tai sao Dashboard van doc database truc tiep thay vi goi API cua SA/Payroll?"

**Tra loi:**

Vi Case Study 2 la bai toan **reporting va decision support**, uu tien:

- response nhanh
- read-model tong hop
- drilldown co filter/pagination

Nen Dashboard Service duoc dat nhu mot **reporting system** doc:

- MongoDB cho employee/alert context
- MySQL cho summary/read-model

Nhom em khong claim Dashboard la middleware. No la reporting service rieng.

---

## Nhom 2 - Cau hoi ve luong Case Study 3

### Q2.1: "Luong xu ly employee create hien tai chay nhu the nao?"

**Tra loi tung buoc:**

1. User goi `POST /api/employee` vao SA.
2. SA ghi source record vao MongoDB `employees`.
3. SA enqueue event vao MongoDB `integration_events`.
4. Outbox worker cua SA poll event `PENDING`.
5. Worker goi Payroll internal API kem `correlationId`.
6. Payroll service tu ghi `pay_rates` va `sync_log` trong MySQL.
7. Worker cap nhat event thanh `SUCCESS`, `FAILED`, hoac `DEAD`.

**Thong diep can nhan manh:**

- Source-of-truth van la SA.
- Downstream ownership la Payroll.
- Kieu consistency duoc chon la **eventual consistency co kiem soat**.

### Q2.2: "Case 3 co lien quan gi den Case 2?"

**Tra loi:**

Case 2 va Case 3 lien quan theo chieu du lieu:

- Case 3 giai bai toan dong bo `SA -> Payroll`
- Case 2 dung du lieu da duoc tong hop de tao executive dashboard

Noi cach khac:

- Khong co Case 3, dashboard khong co dong du lieu payroll/reporting on dinh
- Khong co Case 2, nhom chi chung minh duoc sync ky thuat ma chua chung minh gia tri cho CEO

### Q2.3: "Khi demo, em can mo gi de chung minh Case 3?"

**Tra loi / runbook ngan:**

1. Mo SA UI hoac Swagger/Postman, tao employee.
2. Cho thay response `sync.status = QUEUED` va `mode = OUTBOX`.
3. Mo queue metrics hoac event list tren SA de thay event dang duoc xu ly.
4. Mo Payroll console o port `4100`.
5. Search `employeeId` vua tao de thay `pay_rates` va `sync_log`.
6. Neu can, update pay rate o SA va lam lai de thay row moi trong Payroll.

---

## Nhom 3 - Cau hoi ve consistency va outbox

### Q3.1: "Tai sao khong sync dong bo ngay trong request?"

**Tra loi:**

Co ho tro direct path, nhung normal path cua demo va cua design la outbox vi:

- Giup request cua SA ket thuc nhanh hon
- Giam coupling giua source write va downstream write
- Co retry/backoff/recover-stuck ro rang
- Co audit trail cho operator action

Trong response employee mutation, nhom em minh bach:

- `mode = OUTBOX` khi enqueue thanh cong
- `mode = DIRECT` neu tat outbox bang config
- `mode = DIRECT_FALLBACK` neu enqueue loi va controller buoc phai fallback

### Q3.2: "Neu save Mongo thanh cong ma enqueue event that bai thi sao?"

**Tra loi:**

Do day la bai toan dual-write giua source record va event queue, nhom em xu ly theo thu tu:

1. Thu enqueue vao Mongo outbox.
2. Neu enqueue fail, controller co `DIRECT_FALLBACK`.
3. Neu direct fallback cung fail, response tra `consistency = AT_RISK` va `requiresAttention = true`.

**Ly do khong rollback source record:**

- SA la source-of-truth cua HR
- Record co the da duoc user can dung ngay
- Rollback xuyen nhieu boundary se phuc tap hon va khong can thiet cho muc tieu mon hoc

### Q3.3: "Worker crash giua chung thi sao?"

**Tra loi:**

Neu worker bi crash khi event dang `PROCESSING`, service co co che:

- quet event `PROCESSING` qua timeout
- chuyen event ve `FAILED` hoac `DEAD` tuy so lan thu
- cho worker pick lai trong lan poll sau

Day la ly do nhom em de `OUTBOX_PROCESSING_TIMEOUT_MS` va operator flow `recover-stuck`.

### Q3.4: "Lam sao biet cuoi cung Payroll da nhan du lieu?"

**Tra loi:**

Co 3 tang evidence:

1. Outbox status tren SA: event tu `PENDING -> SUCCESS`
2. `sync_log` tren Payroll: co row `SUCCESS` theo `employeeId`
3. `correlationId`: cung mot trace id xuat hien o response, outbox, va Payroll sync evidence

---

## Nhom 4 - Cau hoi ve Payroll ownership

### Q4.1: "Tai sao hien tai co the noi Payroll la he thong rieng?"

**Tra loi:**

Vi Payroll da co du nhung yeu to sau:

- process rieng
- port rieng
- route rieng
- health rieng
- UI rieng
- write path rieng
- data evidence rieng (`pay_rates`, `sync_log`)

Quan trong nhat la:

- `SA` chi goi internal API cua Payroll
- `Payroll` moi la noi ghi MySQL payroll

### Q4.2: "Payroll co can Mongo nua khong?"

**Tra loi:**

Khong. Payroll service da chuyen sang `authMode = stateless`, dung role claims trong JWT.

Dieu nay giup defend tot hon:

- Payroll khong can Mongo auth storage de phuc vu public read API
- Dependency cua Payroll health gio tap trung vao MySQL

### Q4.3: "Neu muon nang cap tiep, nen lam gi?"

**Tra loi thang:**

Neu muon tien xa hon academic scope, nhom em se:

1. thay internal HTTP bang message broker that su
2. bo sung service-to-service observability/tracing
3. tach deployment artifact thanh tung project hoac container stack rieng

---

## Nhom 5 - Cau hoi ve Dashboard va memo readiness

### Q5.1: "Dashboard co the bi stale khong?"

**Tra loi:**

Co the, va nhom em khong che giau dieu do.

He thong co:

- aggregation worker cho summary tables
- freshness metadata trong executive brief
- startup warm-up cho dashboard summary
- script `prepare-dashboard-demo.js` de baseline alert ownership truoc khi demo

Nen trong local demo stack, executive brief hien tai duoc dua ve trang thai:

- `fresh`
- `needsAttentionCategories = 0`
- action center `Ready for Memo`

### Q5.2: "Tai sao phai co script prepare-dashboard-demo?"

**Tra loi:**

Vi dashboard khong chi co data freshness ma con co **alert ownership hygiene**.

Neu active alerts da ton tai nhung chua co owner/note current, executive brief se coi do la cong viec can xu ly. Script prepare:

- sign in bang admin demo
- doc `GET /alerts/triggered`
- acknowledge cac alert dang can review
- recheck executive brief

Muc tieu la de demo dung voi tinh than CEO memo: du lieu da duoc tong hop va da co nguoi phu trach alert hien tai.

### Q5.3: "Neu giang vien hoi dashboard nay co phai realtime khong?"

**Tra loi:**

Khong claim realtime streaming.

Day la:

- pre-aggregated reporting
- refresh theo worker/script
- co freshness indicator de nguoi xem biet du lieu moi den dau

Day la trade-off hop ly cho mon hoc va cho local dataset lon.

---

## Nhom 6 - Cau hoi ve auth va security

### Q6.1: "Ba service dung auth nhu the nao?"

**Tra loi:**

- `SA` dung `persistent` auth: JWT hop le + token phai ton tai trong `User.tokens[]`
- `Payroll` va `Dashboard` dung `stateless` auth mode de co the verify JWT tu role claims

Ly do:

- SA la noi quan ly session va revoke token
- Downstream service can don gian hoa dependency runtime

### Q6.2: "ALLOW_STATELESS_JWT_FALLBACK dung de lam gi?"

**Tra loi:**

Bien nay chi la safety valve cho development/test khi co su co Mongo token persistence, dac biet voi read-only routes.

No khong phai luong chinh de defend demo.

Luong chinh hien tai de defend la:

- SA quan ly session thuc
- Payroll/Dashboard su dung `authMode = stateless` mot cach chu dong trong service app

### Q6.3: "Tai sao internal API khong dung user JWT?"

**Tra loi:**

Vi day la service-to-service boundary, khong phai user-facing boundary.

Do do nhom em tach rieng:

- user JWT cho browser/client
- `INTERNAL_SERVICE_SECRET` cho `SA -> Payroll internal sync`

Nhu vay se de giai thich hon khi mo source va de gioi han write path vao mot kenh rieng.

---

## Nhom 7 - Cau hoi ve testing va evidence

### Q7.1: "Lam sao chung minh 3 process nay hoat dong that?"

**Tra loi:**

Co script `verify:case3` thuc hien flow:

1. sign in vao SA
2. create employee
3. poll Payroll cho den khi thay pay rate va sync log
4. update employee
5. poll lai Payroll
6. delete employee
7. poll Payroll de thay trang thai `TERMINATED`
8. verify executive brief cua Dashboard dang `fresh` va `Ready for Memo`

### Q7.2: "Neu thay mo source code, can chi file nao?"

**Tra loi nhanh:**

- Runtime tach service: `src/runtime/serviceRuntime.js`
- Entrypoint: `src/sa-server.js`, `src/payroll-server.js`, `src/dashboard-server.js`
- Outbox Mongo: `src/models/IntegrationEvent.js`, `src/services/integrationEventService.js`
- Payroll ownership: `src/routes/payroll.routes.js`, `src/services/payrollMutationService.js`
- Dashboard readiness: `src/services/dashboardExecutiveService.js`, `scripts/prepare-dashboard-demo.js`

---

## Nhom 8 - Cach tra loi khi bi hoi kho

### Q8.1: "Day co phai enterprise-grade microservice chua?"

**Tra loi thanh that:**

Chua. Nhom em khong claim nhu vay.

Dieu nhom em claim dung muc:

- service separation ro rang hon cho demo
- eventual consistency duoc implement va co evidence
- ownership write path da tach ro giua SA va Payroll
- dashboard reporting da san sang cho CEO memo flow

### Q8.2: "Diem yeu con lai la gi?"

**Tra loi thang:**

- Van la same repo, chua tach deployment artifact doc lap theo kieu enterprise
- Dashboard van doc ca Mongo va MySQL de phuc vu reporting
- Chua co message broker that su
- Chua co distributed tracing / enterprise observability

Neu noi duoc dung muc nay, bai defend se chac hon viec overclaim.

---

## Nguyen tac tra loi Q&A

1. Noi dung boundary truoc, implementation sau.
2. Luon nhac `correlationId`, `outbox`, `internal Payroll API`, `Ready for Memo` khi can.
3. Khong bao gio noi "SA ghi thang payroll DB" vi do khong con dung nua.
4. Khong claim ACID xuyen database.
5. Neu bi hoi future work, nhan manh broker, tracing, va deployment separation la buoc tiep theo.
