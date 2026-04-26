# Demo Real Use Case - SA to Payroll to Dashboard

> Last Updated: 2026-04-15

## 1. Muc tieu cua use case

Use case nay duoc dung de demo 3 y chinh:

1. `SA / HR Service` la source system.
2. `Payroll Service` la downstream system rieng va tu so huu write path cua MySQL payroll.
3. `Dashboard Service` la reporting system rieng cho Case Study 2.

Day la same-repo multi-service runtime, nhung khong con la mot Express app duy nhat ghi vao hai database theo kieu monolith 2 DB.

## 2. Runtime hien tai

Ba service chay rieng:

| Service | Port | Vai tro |
| --- | --- | --- |
| SA / HR Service | `4000` | auth, users, employee CRUD, outbox, sync control |
| Payroll Service | `4100` | internal payroll sync endpoint, payroll read API, payroll console |
| Dashboard Service | `4200` | executive brief, summaries, drilldown, alerts, dashboard UI |

Lenh chay:

```powershell
npm run case3:stack:start
```

Lenh verify:

```powershell
npm run verify:case3
```

`case3:stack:start` hien tai se:

- start Mongo local neu can
- start 3 service rieng
- warm dashboard summaries neu snapshot con stale
- prepare current alert ownership cho demo, de executive brief khong bi ket o `Action Required` vi acknowledgement cu

## 3. Data ownership hien tai

### MongoDB local

MongoDB giu:

- `Employee`
- `User`
- `Role`
- `Alert`
- `IntegrationEvent`
- `IntegrationEventAudit`

Y nghia:

- employee source-of-truth nam o SA
- auth session persistence nam o SA
- outbox va audit trail cua integration nam o SA-owned Mongo collections

### MySQL local

MySQL giu:

- `pay_rates`
- `sync_log`
- `earnings_summary`
- `vacation_summary`
- `benefits_summary`
- `alerts_summary`
- `alert_employees`
- `earnings_employee_year`

Y nghia:

- Payroll service so huu write path cho `pay_rates` va `sync_log`
- Dashboard service doc read models va summary tables
- active outbox khong nam o MySQL nua

## 4. Luong xu ly use case chinh

### Buoc 1 - Dang nhap qua SA

Nguoi demo dang nhap bang:

- email: `admin@localhost`
- password: `admin_dev`

Route auth canonical:

- `POST /api/auth/signin`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Access token do SA phat se duoc dung lai o Payroll va Dashboard.

### Buoc 2 - Tao employee trong SA

Route:

```text
POST http://127.0.0.1:4000/api/employee
```

Khi request nay thanh cong:

1. employee duoc ghi vao MongoDB source-of-truth
2. controller tra `sync.status = QUEUED`
3. SA enqueue `IntegrationEvent` vao Mongo outbox

Phan nay chung minh source mutation chi xay ra o SA.

### Buoc 3 - SA worker xu ly outbox

Worker cua SA doc `integration_events` tu MongoDB.

No:

1. claim cac event `PENDING` hoac `FAILED`
2. goi `syncService`
3. forward mutation sang `PayrollAdapter`

Consistency model o day la:

- `eventual consistency`
- co retry/replay/recover
- khong claim ACID xuyen MongoDB va MySQL

### Buoc 4 - PayrollAdapter chi con la integration caller

Hien tai `src/adapters/payroll.adapter.js` khong ghi thang MySQL nua.

Nhiem vu cua adapter la:

1. build payload payroll sync
2. gui request HTTP noi bo sang Payroll service
3. chuyen ket qua thanh status de SA worker xu ly tiep

Noi dung nay rat quan trong khi bi hoi:

> SA khong con import model SQL cua Payroll de ghi truc tiep.
> Payroll service tu so huu write path cua minh qua internal API.

### Buoc 5 - Payroll service tu ghi MySQL

Route noi bo:

```text
POST http://127.0.0.1:4100/api/payroll/internal/sync
```

Payroll service nhan payload, roi:

1. ghi `pay_rates`
2. ghi `sync_log`
3. tra ket qua lai cho SA worker

Tai day database ownership da ro hon:

- SA so huu HR data va outbox
- Payroll so huu payroll write path

### Buoc 6 - Payroll console chung minh downstream system ton tai rieng

Browser:

```text
http://127.0.0.1:4100/
```

Console nay cho phep:

- nhap `employeeId`
- xem current pay rate
- xem history
- xem latest sync log

Vi vay khi demo, nhom co the cho giang vien thay:

- tao employee o SA
- doi vai giay
- mo Payroll console
- search `employeeId`
- thay record vua duoc dong bo

### Buoc 7 - Dashboard service chung minh reporting system rieng

Browser:

```text
http://127.0.0.1:4200/
```

Dashboard service hien tai:

- doc summary/read-model data
- tra executive brief
- tra alerts va drilldown
- khong so huu auth

Trang thai demo mong muon sau khi stack start:

- freshness = `fresh`
- action center = `Ready for Memo`
- alert ownership baseline da duoc lam moi cho current snapshot

## 5. Automated proof

Lenh:

```powershell
npm run verify:case3
```

Script nay se:

1. start 3 service
2. prepare dashboard demo baseline
3. sign in qua SA
4. create employee
5. poll Payroll den khi co pay rate moi
6. update employee va poll lai Payroll
7. check Dashboard freshness va action center
8. delete employee va xac nhan Payroll co `TERMINATED`
9. stop stack

Day la bang chung end-to-end manh nhat khi giang vien hoi:

> "Em co cach nao chung minh luong nay chay that khong?"

## 6. Nhung cau nen noi khi bi hoi kho

### Neu bi hoi: "Day co phai monolith 2 DB khong?"

Noi:

> Khong. Repo van dung chung code, nhung runtime da tach thanh 3 process va 3 port. SA, Payroll va Dashboard co route ownership rieng. Payroll write path khong nam trong SA nua.

### Neu bi hoi: "Consistency cua em la gi?"

Noi:

> Day la eventual consistency co kiem soat. Nhom em co outbox, worker, retry, replay, recover-stuck va sync log de giam rui ro va cho phep operator theo doi.

### Neu bi hoi: "Dashboard co phai real-time khong?"

Noi:

> Khong claim real-time. Dashboard dung pre-aggregated summaries va co freshness metadata. Demo stack se warm summaries truoc khi mo dashboard de tranh stale snapshot.

## 7. Nhung dieu khong nen overclaim

Khong nen noi:

- "Da co ACID xuyen MongoDB va MySQL"
- "Da co transactional outbox chuan"
- "Da co enterprise middleware nhu Kafka"
- "Case 5 da la production DR rollout"

Nen noi dung muc:

- same-repo multi-service runtime
- eventual consistency co kiem soat
- DB-backed outbox o SA Mongo
- Payroll service so huu payroll write path
- Dashboard service so huu reporting/read model layer

## 8. File evidence nen mo neu bi hoi sau

- `src/controllers/employee.controller.js`
- `src/services/integrationEventService.js`
- `src/workers/integrationEventWorker.js`
- `src/services/syncService.js`
- `src/adapters/payroll.adapter.js`
- `src/routes/payroll.routes.js`
- `src/controllers/payroll.controller.js`
- `src/services/payrollMutationService.js`
- `src/services/dashboardExecutiveService.js`
- `scripts/verify-case3-stack.js`
