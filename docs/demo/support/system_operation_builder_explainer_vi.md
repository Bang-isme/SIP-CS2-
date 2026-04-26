# Giai Thich He Thong Theo Goc Nhin Nguoi Xay

> Last Updated: 2026-04-15

## 1. Tom tat ngan nhat

Neu chi duoc noi 5 cau, hay noi:

1. He thong hien tai co 3 service: SA, Payroll va Dashboard.
2. SA la source system, ghi HR data vao MongoDB.
3. Payroll la downstream system, tu so huu write path cua `pay_rates` va `sync_log` trong MySQL.
4. Dashboard la reporting system, doc summary/read-model data de phuc vu CEO memo.
5. Consistency model la eventual consistency co kiem soat, khong phai ACID xuyen he thong.

## 2. Kien truc hien tai

### SA / HR Service

SA so huu:

- auth
- users
- employee CRUD
- integration outbox
- retry/replay/recover controls

SA can:

- MongoDB

MongoDB giu:

- `Employee`
- `User`
- `Role`
- `Alert`
- `IntegrationEvent`
- `IntegrationEventAudit`

### Payroll Service

Payroll so huu:

- internal payroll sync endpoint
- payroll read-only API
- payroll console
- write path cua `pay_rates` va `sync_log`

Payroll can:

- MySQL

Payroll khong can Mongo de verify auth nua, vi no verify JWT statelessly tu token claims.

### Dashboard Service

Dashboard so huu:

- executive brief
- summary APIs
- drilldown
- alerts
- dashboard UI

Dashboard can:

- MongoDB
- MySQL

Ly do:

- no doc ca alert configs/source data o Mongo
- va read models/summary tables o MySQL

## 3. Data ownership hien tai

### MongoDB

Day la noi luu:

- HR source-of-truth
- auth/session persistence cua SA
- SA-owned outbox va audit trail

### MySQL

Day la noi luu:

- payroll-side data
- sync log
- dashboard summaries
- dashboard read models

Luu y quan trong:

> Active outbox khong nam o MySQL nua.

## 4. Write path hien tai

Khi tao hoac sua employee:

1. request vao SA
2. SA verify auth va role
3. SA ghi employee vao MongoDB
4. SA enqueue `IntegrationEvent` vao MongoDB outbox
5. SA worker claim event va goi `syncService`
6. `PayrollAdapter` gui request HTTP noi bo sang Payroll service
7. Payroll service moi la noi ghi `pay_rates` va `sync_log`
8. ket qua duoc phan anh lai vao queue state va sync evidence

Day la ly do hien tai co the defend:

> SA khong con ghi thang bang payroll.

## 5. Read path hien tai

### Executive brief

Dashboard frontend goi Dashboard service de lay:

- freshness
- alert follow-up
- integration summary
- action center

Dashboard doc du lieu tu summary tables thay vi scan raw 500k records moi lan.

### Drilldown

Drilldown van la server-side:

- filter o backend
- pagination o backend
- frontend chi render ket qua

## 6. Vi sao dashboard startup nay on hon truoc

Case 2 truoc day de bi stale vi summary cu va acknowledgement cu.

Hien tai `case3:stack:start` lam them 2 viec:

1. warm dashboard summaries neu snapshot con stale
2. prepare current alert ownership baseline cho current snapshot

Nen khi mo dashboard trong demo:

- freshness mong muon la `fresh`
- action center mong muon la `Ready for Memo`

Day khong phai fake data. No la buoc prep de align summary va ownership note voi snapshot hien tai.

## 7. Consistency model

Ten dung de noi:

- `eventual consistency co kiem soat`

Khong nen noi:

- `ACID xuyen MongoDB va MySQL`
- `2PC`
- `transactional outbox chuan`

Ly do:

- source write va queue write khong nam trong mot transaction xuyen DB
- downstream sync co do tre ngan
- nhung he thong co queue visibility, retry, replay, recover-stuck va sync log

## 8. Middleware / queue story

Ten dung de noi:

- `DB-backed outbox + polling worker`
- `middleware-lite`

Noi dung co that:

- event duoc persist ben SA
- worker poll theo chu ky
- co backoff
- co dead state
- co recover-stuck
- co operator APIs de retry/replay

## 9. Khi bi hoi "vi sao khong dung Kafka?"

Tra loi ngan:

> Nhom em co can nhac, nhung trong scope mon hoc hien tai, DB-backed outbox + polling worker da du de the hien queue management, persistence, retry va recovery. Nhom em khong overclaim middleware enterprise stack.

## 10. Khi bi hoi "vi sao dashboard nhanh?"

Tra loi ngan:

> Vi executive brief va cac chart summary doc tu pre-aggregated tables. Drilldown moi di vao query chi tiet, va van co pagination phia server.

## 11. File nen mo khi giai thich sau

- `src/sa-server.js`
- `src/payroll-server.js`
- `src/dashboard-server.js`
- `src/controllers/employee.controller.js`
- `src/services/integrationEventService.js`
- `src/workers/integrationEventWorker.js`
- `src/adapters/payroll.adapter.js`
- `src/routes/payroll.routes.js`
- `src/services/payrollMutationService.js`
- `src/services/dashboardExecutiveService.js`
- `scripts/prepare-dashboard-demo.js`
- `scripts/verify-case3-stack.js`
