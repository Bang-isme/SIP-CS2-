# Slide Content Revised - Theo Codebase Hien Tai

> Last Updated: 2026-04-15

File nay la noi dung goi y cho slide, da canh lai theo runtime hien tai.

## Slide 1 - Problem

Tieu de:

- `HR & Payroll Analytics`

Y chinh:

- doanh nghiep dang co HR data va Payroll data o hai noi khac nhau
- ban quan ly can management information, khong chi raw operational data
- neu doi soat thu cong thi cham, kho trace va kho phuc hoi khi co sai lech

## Slide 2 - Vi sao can System Integration

Y chinh:

- can `presentation integration` de gom thong tin len mot noi
- can `data integration` de tao executive summaries va drilldown
- can `functional integration` de day thay doi tu SA sang Payroll

Mot cau nen noi:

> Bai nay khong chi la dashboard. Day la bai toan tong hop thong tin, dong bo thay doi va theo doi trang thai tich hop giua cac he thong.

## Slide 3 - Kien truc hien tai

Y chinh:

- `SA / HR Service` tren `4000`
- `Payroll Service` tren `4100`
- `Dashboard Service` tren `4200`

Boundary can noi ro:

- SA so huu auth, employee CRUD, outbox va sync control
- Payroll so huu payroll write path
- Dashboard so huu reporting va alert review

## Slide 4 - Data ownership

### MongoDB

- employee source-of-truth
- users / roles
- alerts
- integration events
- integration event audits

### MySQL

- pay_rates
- sync_log
- earnings_summary
- vacation_summary
- benefits_summary
- alerts_summary
- alert_employees
- earnings_employee_year

Mot cau nen noi:

> Active outbox hien tai nam o SA-owned MongoDB collections, khong nam o MySQL nua.

## Slide 5 - Dashboard giai quyet gi cho CEO Memo

Y chinh:

- executive brief
- earnings / vacation / benefits summaries
- alert follow-up queue
- drilldown
- export CSV

Mot cau nen noi:

> Dashboard la reporting system rieng, dung de tra loi CEO Memo nhanh hon, khong thay the source systems.

## Slide 6 - Consistency model

Y chinh:

- eventual consistency co kiem soat
- queue visibility
- retry / replay / recover-stuck
- sync log va correlation trace

Khong nen ghi:

- ACID xuyen MongoDB va MySQL
- 2PC
- transactional outbox chuan

## Slide 7 - Integration path

Y chinh:

1. SA ghi employee vao MongoDB
2. SA enqueue integration event vao MongoDB outbox
3. SA worker xu ly event
4. PayrollAdapter goi Payroll internal API
5. Payroll service tu ghi `pay_rates` va `sync_log`

Mot cau nen noi:

> PayrollAdapter hien tai chi la integration caller. Payroll service moi la noi tu so huu SQL write path.

## Slide 8 - Dashboard freshness va demo readiness

Y chinh:

- dashboard dung pre-aggregated summaries
- co freshness metadata
- startup script warm summaries
- startup script baseline lai current alert ownership cho demo

Mot cau nen noi:

> Vi vay trong demo, executive brief mong muon o trang thai `fresh` va `Ready for Memo`, khong bi ket o `Action Required` vi acknowledgement cu.

## Slide 9 - Security va Operations

Y chinh:

- auth va RBAC
- health / readiness
- OpenAPI contract
- queue metrics
- DR rehearsal-safe docs

## Slide 10 - Ket luan

Y chinh:

- he thong da co 3 service rieng
- case 2 va case 3 da co evidence chay that
- case 4 o muc middleware-lite co the defend duoc
- case 5 chi nen claim o muc docs + rehearsal-safe

Mot cau chot:

> Nhom em khong xem day chi la mot dashboard. Day la bai System Integration co boundary ro, co trade-off ro, va co the chung minh bang code, API va local runtime that.
