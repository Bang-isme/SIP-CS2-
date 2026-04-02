# 2026-04-03 - Local enterprise seed consistency hardening

## Context

- Atlas free tier quota is not viable for the coursework-scale dataset.
- Local Mongo on `D:\MongoDB` is now the primary runtime for the `500000`-employee baseline.
- The first enterprise reseed attempt exposed a legacy `pay_rates` schema mismatch and partial SQL writes during failed batch inserts.

## Decision

1. Normalize `pay_rates` schema via a dedicated MySQL migration:
   - migration id: `20260403_000005_pay_rate_schema_contract_cleanup`
   - remove incompatible legacy columns (`name`, `value`, `tax_percentage`, `type`) after best-effort backfill
   - keep the current pay history contract (`employee_id`, `pay_rate`, `pay_type`, `effective_date`, `is_active`)
2. Make `scripts/seed.js` transaction-safe per SQL batch:
   - Mongo batch insert remains first
   - SQL writes for `earnings`, `vacation_records`, `employee_benefits`, and `pay_rates` run inside one transaction
   - if the SQL transaction fails, rollback SQL and delete the just-inserted Mongo batch
3. Reset derived dashboard tables as part of reseed:
   - `earnings_employee_year`
   - `earnings_summary`
   - `vacation_summary`
   - `benefits_summary`
   - `alerts_summary`
   - `alert_employees`
4. Expand `scripts/repair-cross-db-consistency.js` to clean orphans in:
   - `pay_rates`
   - `alert_employees`

## Why

- The previous seed path could leave partial SQL writes when one `Promise.all` branch failed.
- A clean reseed path is more reliable than ad-hoc patching from a partially written dataset.
- The dashboard depends on derived summary tables; they must be reset alongside the core seed.

## Verified outcome

- Enterprise seed completed on local with `500000` Mongo employees.
- Aggregation rebuilt summaries and alert tables successfully.
- Cross-DB repair reported `0` orphan deletions.
- Backend gates still passed after the change:
  - `npm run lint`
  - `npm test`
  - `npm run test:advanced`
  - `npm run db:migrate:mysql:status`
  - `npm audit --omit=dev`
