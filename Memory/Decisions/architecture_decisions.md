# Architecture Decisions Record (ADR)

> Last Updated: 2026-01-23T03:05:00+07:00

---

## ADR-001: Pre-Aggregation Strategy for Dashboard Performance

**Date**: 2026-01-23  
**Status**: Accepted  
**Context**: Dashboard needs to display summary data from 500k+ employee records with <100ms response time.

**Decision**: Use pre-computed summary tables (`EarningsSummary`, `VacationSummary`, `BenefitsSummary`, `AlertsSummary`) populated by a batch script.

**Consequences**:
- ✅ Dashboard API reads ~20-50 rows instead of 500k
- ✅ Response time <100ms
- ⚠️ Data is stale until next aggregation run
- ⚠️ Must run `node scripts/aggregate-dashboard.js` after data changes

---

## ADR-002: AlertEmployee Table for Full Pagination

**Date**: 2026-01-23  
**Status**: Accepted  
**Context**: Alert modal needs to display 40k+ employees with pagination, search, and page size selection.

**Decision**: Create `AlertEmployee` MySQL table with all matching employees, indexed by `alert_type`. API reads from this table with LIMIT/OFFSET.

**Consequences**:
- ✅ Full pagination support (10,000+ pages if needed)
- ✅ Server-side search with SQL LIKE
- ✅ Constant memory on frontend
- ⚠️ Table size can be large (40k rows per alert type)

---

## ADR-003: Hybrid Data Source (MongoDB + MySQL)

**Date**: 2026-01-23  
**Status**: Accepted  
**Context**: HR data (employees) is in MongoDB. Payroll data (earnings, benefits) is in MySQL.

**Decision**: Keep both databases. Use `employeeId` as the linking key between systems.

**Consequences**:
- ✅ Simulates real-world legacy system integration
- ✅ Demonstrates presentation-layer integration (Case Study 2 focus)
- ⚠️ Cross-database joins must be done in application code
- ⚠️ Data consistency challenges (Case Study 3 scope)

---

## ADR-004: Dynamic Alert Thresholds from MongoDB

**Date**: 2026-01-23  
**Status**: Accepted  
**Context**: CEO wants configurable thresholds (e.g., 30 days → 60 days for anniversary alert).

**Decision**: Store thresholds in MongoDB `Alert` collection. Aggregation script reads from this collection.

**Consequences**:
- ✅ Thresholds can be changed without code modification
- ✅ Supports future Alert Configuration UI
- ⚠️ Changes require re-running aggregation script

---

## ADR-005: Preview Employees in Triggered Alerts API

**Date**: 2026-01-23  
**Status**: Accepted  
**Context**: Alert cards on dashboard were empty because `matching_employees` in summary table is empty.

**Decision**: Modify `getTriggeredAlerts` to fetch first 5 employees from `AlertEmployee` table for preview.

**Consequences**:
- ✅ Cards now show preview without re-running aggregation
- ✅ Full pagination still uses separate API endpoint
- ⚠️ Adds 3-4 small SQL queries to triggered alerts API
