# Case Study Progress

> Last Updated: 2026-02-03T23:59:00+07:00

## Current Stage: Case Study 2 - COMPLETE

---

## Reference Requirements (Case 1-5)
CEO Memo core: dashboard summary (earnings/vacation/benefits), drill-down to details, alerts (anniversary, vacation threshold, benefits change, birthdays in current month), no required legacy replacement.

See: Memory/Context/case_study_requirements_summary.md

---

## Recent Fixes (2026-02-03)
- Drilldown performance: added bulk mode (`limit>=1000` or `bulk=1`) + fast summary (`summary=fast`) to keep response under 10s.
- Export CSV: switched to backend streaming endpoint to avoid huge JSON payload.
- UI stability: cancel stale drilldown requests to prevent 20-row response overriding 10k.
- UI polish (executive minimal): refined spacing/typography, card rhythm, charts, alerts, and drilldown visuals.
- Alerts display fix: Anniversary shows "1 day/2 days"; Birthday shows date (no negative days).
- Guide docs completed: `docs/case_study_guide.md` (Case 1-5 status, CEO Memo alignment).
- Hybrid totals: fast mode shows count quickly; if COUNT <= 10,000, background summary updates totals.
- Case Study 4 implemented: Outbox + Worker for async integration events.
- Case Study 4 monitor: added Integration Events API (list + retry).
- Case Study 4 demo: added script to insert FAILED/DEAD outbox events.
- Case Study 4 UI: Integration Queue panel added to Dashboard.
- Demo script updated: keep FAILED visible (next_run_at in future) and clear old demo rows.
- Case Study 4 replay: added admin replay filters (FAILED/DEAD) for DLQ recovery.

## Case Study 2: The Dashboard

### Status: COMPLETE

### Requirements Checklist

#### CEO Memo Requirements
- [x] Total earnings by shareholder, gender, ethnicity, PT/FT, department (YTD + previous year)
- [x] Total vacation days by shareholder, gender, ethnicity, PT/FT (YTD + previous year)
- [x] Average benefits paid to shareholders vs non-shareholders by plan
- [x] Drill-down capability from summary to details
- [x] Alert: Employee within N days of hiring anniversary
- [x] Alert: Employee with excessive vacation accumulation
- [x] Alert: Benefits plan changes affecting payroll
- [x] Alert: Employees with birthdays in current month

#### Implementation Status
| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard Summary Cards | DONE | 4 KPI cards |
| Earnings Chart | DONE | By department with drill-down |
| Vacation Chart | DONE | By demographics |
| Benefits Chart | DONE | Shareholder vs Non-shareholder |
| Alerts Panel | DONE | 4 alert types with preview |
| Drilldown Modal | DONE | Pagination + search |
| Jump to Page | DONE | Added 2026-01-23 |
| Alert Config UI | NOTE | Nice-to-have, not required |

#### API Endpoints
- [x] `GET /api/dashboard/earnings`
- [x] `GET /api/dashboard/vacation`
- [x] `GET /api/dashboard/benefits`
- [x] `GET /api/dashboard/drilldown`
- [x] `GET /api/alerts/triggered`
- [x] `GET /api/alerts/:type/employees`
- [x] CRUD `/api/alerts` (backend only)

---

## Case Study 3: Integrated System

### Status: COMPLETE

### Implementation Summary
- **Sync Service**: Eventual consistency pattern with retry mechanism
- **SyncLog Table**: Tracks all sync operations (PENDING/SUCCESS/FAILED)
- **Employee Controller**: Integrated sync on CREATE/UPDATE/DELETE
- **Monitoring API**: `/api/sync/status`, `/api/sync/logs`, `/api/sync/retry`

### Documentation
- `docs/case_study_3_data_consistency.md` - Data flow & failure scenarios
- `docs/case_study_3_test_plan.md` - 7 test cases

### Focus Areas (Completed)
- [x] Data consistency strategy
- [x] Near real-time sync design
- [x] Middleware orchestration
- [x] Failure scenarios documentation

### Extras (Beyond Requirements)
- [x] **Frontend User Registration**: Added `/register` page and API
- [x] **DevOps Readiness**: Added `/health` endpoints and `.env.example`
- [x] **QA Foundation**: Added Jest framework and API tests
- [x] **Security Hardening**: Removed default secrets, restricted dev bypass

---

## Case Study 4: Fully Integrated System

### Status: Design completed / Implementation pending

### Focus Areas
- [x] Outbox integration events
- [x] Worker + retry/backoff
- [x] DLQ replay (admin replay filters + UI)
- [ ] Scalable architecture design
- [ ] Extensibility for new systems
- [ ] Middleware-centric design

---

## Case Study 5: Network Integration

### Status: Design completed / Implementation pending

### Focus Areas
- [x] Network architecture diagram (ASCII)
- [x] Security baseline checklist
- [x] Backup and recovery plan (docs + templates)
- [x] DR rehearsal evidence (safe run report)
- [x] Availability strategy (docs)


