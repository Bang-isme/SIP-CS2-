# Demo Sequence Walkthrough - Theo Code Hien Tai

> Last Updated: 2026-04-15

Muc tieu cua file nay la:

- neu giang vien hoi "luong nay nam o dau trong code"
- mo dung file
- noi dung ten thanh phan
- giai thich dung boundary hien tai

## 1. Use case chinh: Employee CREATE

### Buoc 1 - Request vao SA

Route:

- `POST /api/employee`

File nen mo:

- `src/routes/employee.routes.js`
- `src/controllers/employee.controller.js`

Y can noi:

> Mutation bat dau o SA, khong bat dau o Dashboard hay Payroll.

### Buoc 2 - Auth va role check

File nen mo:

- `src/middlewares/authJwt.js`

Y can noi:

> SA verify JWT, resolve role, roi moi cho di qua employee mutation route.

### Buoc 3 - SA ghi source record vao MongoDB

File nen mo:

- `src/controllers/employee.controller.js`
- `src/models/Employee.js`

Y can noi:

> Employee duoc ghi vao MongoDB source-of-truth truoc. Day la boundary cua SA.

### Buoc 4 - SA enqueue outbox event

File nen mo:

- `src/services/integrationEventService.js`
- `src/models/IntegrationEvent.js`

Y can noi:

> Event duoc ghi vao MongoDB outbox cua SA. Active outbox hien tai khong nam o MySQL nua.

### Buoc 5 - SA worker nhat event

File nen mo:

- `src/workers/integrationEventWorker.js`

Y can noi:

> Worker poll outbox theo chu ky va claim event theo batch. Day la phan queue processing cua Case 4.

### Buoc 6 - Sync service goi adapter

File nen mo:

- `src/services/syncService.js`
- `src/adapters/payroll.adapter.js`

Y can noi:

> Adapter hien tai khong con ghi thang SQL. No chi la integration caller gui payload sang Payroll service.

### Buoc 7 - Payroll service nhan mutation

File nen mo:

- `src/routes/payroll.routes.js`
- `src/controllers/payroll.controller.js`
- `src/services/payrollMutationService.js`

Y can noi:

> Payroll service moi la noi ghi `pay_rates` va `sync_log`. Diem nay quan trong nhat de defend service boundary.

### Buoc 8 - MySQL giu evidence downstream

Bang evidence:

- `pay_rates`
- `sync_log`

Y can noi:

> Sau khi sync xong, Payroll console va Payroll read API co the doc duoc ket qua ma khong can mo source code cua SA.

## 2. Use case UPDATE va DELETE

File nen mo:

- `src/controllers/employee.controller.js`
- `src/services/payrollMutationService.js`

Y can noi:

- `UPDATE` tao active pay rate moi, rate cu khong con active
- `DELETE` tao evidence `TERMINATED` o payroll side

Neu can prove nhanh:

- dung `npm run verify:case3`

## 3. Read flow cua Dashboard

### Executive brief

File nen mo:

- `src/controllers/dashboard.controller.js`
- `src/services/dashboardExecutiveService.js`

Y can noi:

> Dashboard service doc summary/read-model data de tao executive brief. Frontend khong tu ghep 5-6 API roi tu suy ra action center.

### Alert follow-up

File nen mo:

- `src/controllers/alerts.controller.js`
- `src/utils/alertDashboard.js`

Y can noi:

> Alert follow-up queue la lop manage-by-exception. Hien tai startup demo se baseline lai ownership note cho current snapshot de tranh stale acknowledgement.

### Summary warming

File nen mo:

- `src/workers/dashboardAggregationWorker.js`
- `src/runtime/serviceRuntime.js`
- `scripts/prepare-dashboard-demo.js`

Y can noi:

> Dashboard startup hien tai co warm summary va prep demo baseline, nen executive brief trong live demo se o trang thai `fresh` va khong bi ket o `Action Required` do du lieu cu.

## 4. Correlation trace

Khi bi hoi "lam sao trace 1 request":

File nen mo:

- `src/middlewares/requestContext.js`
- `src/services/integrationEventService.js`
- `src/adapters/payroll.adapter.js`
- `src/services/payrollMutationService.js`

Y can noi:

> Cung mot correlation id co the duoc theo tu request context o SA, qua Mongo outbox event, roi xuong `sync_log` ben Payroll.

## 5. Route ownership can nho

### SA owns

- `/api/auth/*`
- `/api/users/*`
- `/api/employee/*`
- `/api/sync/*`
- `/api/integrations/*`

### Payroll owns

- `/api/payroll/health`
- `/api/payroll/pay-rates`
- `/api/payroll/sync-log`
- `/api/payroll/internal/*`

### Dashboard owns

- `/api/dashboard/*`
- `/api/alerts/*`

## 6. Cau tra loi ngan theo tung file

| Cau hoi | File nen mo | Cau ngan |
| --- | --- | --- |
| "Source write nam o dau?" | `src/controllers/employee.controller.js` | SA ghi MongoDB truoc |
| "Outbox nam o dau?" | `src/services/integrationEventService.js` | SA-owned MongoDB outbox |
| "Worker nam o dau?" | `src/workers/integrationEventWorker.js` | poll + claim + retry |
| "Payroll ghi SQL o dau?" | `src/services/payrollMutationService.js` | Payroll service so huu write path |
| "Adapter la gi?" | `src/adapters/payroll.adapter.js` | adapter chi goi Payroll internal API |
| "Dashboard nhanh vi sao?" | `src/services/dashboardExecutiveService.js` | doc summary/read-model data |
| "Demo tai sao khong stale?" | `scripts/prepare-dashboard-demo.js` | warm summary + baseline ownership |

## 7. Dieu khong nen noi

Khong nen noi:

- "SA ghi truc tiep bang pay_rates"
- "Outbox nam trong MySQL"
- "Dashboard la real-time dashboard"
- "Day la transactional outbox chuan"

Nen noi:

- "SA so huu source data va outbox"
- "Payroll so huu payroll write path"
- "Dashboard so huu reporting layer"
- "Consistency la eventual consistency co kiem soat"
