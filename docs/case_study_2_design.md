# Case Study 2 - Design (Dashboard)

> Last Updated: 2026-02-03

## 1) Ki?n tr?c t?ng quan
H? th?ng Dashboard ???c x?y theo m? h?nh presentation-style integration, l?y d? li?u t? MongoDB (HR) v? MySQL (Payroll), sau ?? t?ng h?p v?o c?c b?ng summary ?? tr? k?t qu? nhanh cho l?nh ??o.

## 2) Ngu?n d? li?u & b?ng li?n quan
MongoDB (HR):
- Employees, Departments, Alerts, Users.
- D? li?u d?ng cho drilldown, filter, demographics, v? hi?n th? danh s?ch chi ti?t.

MySQL (Payroll):
- Earning, VacationRecord, EmployeeBenefit, BenefitPlan, PayRate.
- D? li?u d?ng ?? t?nh earnings/vacation/benefits theo n?m hi?n t?i v? n?m tr??c.

Summary tables (MySQL):
- EarningsSummary, VacationSummary, BenefitsSummary, AlertsSummary, AlertEmployee.
- EarningsEmployeeYear (b?ng snapshot theo n?m, h? tr? drilldown nhanh).

Derived fields (Mongo):
- Employee.annualEarnings, Employee.annualEarningsYear ?? l?c minEarnings nhanh.

## 3) Batch Aggregation (scripts/aggregate-dashboard.js)
M?c ti?u: t?ng h?p d? li?u v? b?ng summary ?? API tr? nhanh.

Khi ch?y batch:
- Theo l?ch h?ng ng?y (cron) ho?c sau khi import d? li?u l?n.
- Ph? h?p cho demo ho?c khi d? li?u payroll c?p nh?t theo l?.

C?c b??c ch?nh c?a batch:
1. L?y d? li?u raw t? MySQL (earnings, vacation, benefits) theo current year + previous year.
2. T?nh to?n t?ng theo: department, shareholder, gender, ethnicity, employmentType.
3. Ghi v?o EarningsSummary, VacationSummary, BenefitsSummary.
4. T?o AlertsSummary v? AlertEmployee (anniversary, vacation threshold, benefits change, birthday).
5. C?p nh?t snapshot sang Mongo: annualEarnings + annualEarningsYear.
6. Ghi b?ng EarningsEmployeeYear ?? h? tr? drilldown nhanh.

L?u ? v?n h?nh:
- Batch c? th? ch?y l?i nhi?u l?n (idempotent theo d? li?u ngu?n).
- Sau khi import d? li?u l?n, c?n ch?y batch ?? s? li?u tr?n dashboard ch?nh x?c.

## 4) API Layer
C?c endpoint ch?nh:
- `GET /api/dashboard/earnings`
- `GET /api/dashboard/vacation`
- `GET /api/dashboard/benefits`
- `GET /api/dashboard/drilldown`
- `GET /api/dashboard/drilldown/export`
- `GET /api/dashboard/departments`
- `GET /api/alerts/triggered`
- `GET /api/alerts/:type/employees`

Lu?ng x? l?:
- Summary API ??c t? b?ng summary ?? tr? nhanh.
- Drilldown ??c t? Mongo + snapshot earnings trong Mongo/MySQL ?? filter hi?u qu?.
- N?u thi?u summary tables, API tr? 404 k?m h??ng d?n ch?y batch.

## 5) Drilldown & Performance Strategy
C? ch? t?i ?u t?c ??:
- Bulk mode khi `limit >= 1000` ho?c `bulk=1` ?? gi?m chi ph? join l?n.
- Fast summary khi `summary=fast` ?? tr? count nhanh.
- Hybrid summary totals: n?u fast mode v? COUNT <= 10,000 th? ch?y n?n `summary=full` ?? c?p nh?t total ch?nh x?c.
- CSV export tr? stream ?? tr?nh payload qu? l?n.

Gi?i th?ch minEarnings:
- S? d?ng snapshot annualEarnings trong Mongo ?? tr?nh join cross-DB kh?ng l?.
- N?u filter qu? r?ng (v? d? minEarnings r?t nh?), s? l??ng l?n s? ch?m ? v? ph?i l?c danh s?ch ID l?n.

## 6) Alerts
- AlertEmployee table l?u danh s?ch chi ti?t ?? pagination nhanh.
- AlertsSummary tr? t?ng s? theo lo?i.
- 4 lo?i alert: Anniversary, High Vacation, Benefits Change, Birthday.

## 7) UI Layout
- Header: ti?u ?? + status + refresh.
- KPI cards: 4 ch? s? ch?nh.
- Charts: Earnings by Department, Vacation, Benefits.
- Alerts panel: preview 4 alert types.
- Drilldown modal: filters + table + export.

## 8) Operational Guide (th?c t? s? d?ng)
- Ch?y batch h?ng ng?y (cron) ho?c sau khi import d? li?u l?n.
- N?u s? li?u tr?n UI kh?ng c?p nh?t, ki?m tra job batch v? summary tables.
- V?i fast mode, t?ng s? c? th? hi?n `--` n?u COUNT l?n, ??y l? thi?t k? gi? t?c ??.

## 9) Error Handling
- Summary tables thi?u -> tr? 404 + h??ng d?n ch?y batch.
- Drilldown export d?ng stream ?? tr?nh qu? t?i.
- UI c? loading/skeleton khi ch? data.

## 10) Validation Checklist
- Batch ch?y xong c? d? li?u trong summary tables.
- Dashboard summary tr? nhanh (<2s v?i summary tables).
- Drilldown limit l?n v?n gi? <10s v?i bulk mode.
- Alerts hi?n th? ?? 4 lo?i v? drilldown m? ??ng.
- CSV export ho?t ??ng v? kh?ng crash.
