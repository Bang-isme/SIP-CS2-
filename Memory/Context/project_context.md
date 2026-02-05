# Project Context - SIP_CS (System Integration Project Case Study)

> Last Updated: 2026-02-03T16:30:00+07:00

## Project Overview

This is an academic project for the **System Integration** course, implementing Case Studies 2-5.

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React + Vite | Dashboard UI |
| **Backend** | Node.js + Express | REST API |
| **Database (HR)** | MongoDB | Employee, Department, Alert, User |
| **Database (Payroll)** | MySQL | Earnings, Vacation, Benefits, Summary Tables |

### Directory Structure

```
d:\SIP_CS 2\SIP_CS\
├── src/                    # Backend source
│   ├── controllers/        # API logic
│   ├── models/             # MongoDB models
│   │   └── sql/            # Sequelize MySQL models
│   ├── routes/             # Express routes
│   ├── middlewares/        # Auth JWT
│   └── utils/              # Cache utility
├── dashboard/              # Frontend React app
│   └── src/
│       ├── pages/          # Dashboard.jsx
│       ├── components/     # Charts, AlertsPanel, DrilldownModal
│       └── services/       # API client
├── scripts/                # Batch jobs
│   ├── aggregate-dashboard.js  # Pre-aggregation script
│   └── seed.js             # Data seeding
└── docs/                   # Documentation
```

## Data Architecture

### MongoDB Collections (HR System)
- `employees` - 500,000+ records
- `departments` - Organizational structure
- `alerts` - Alert configurations (type, threshold, isActive)
- `users` - Authentication

### MySQL Tables (Payroll System)
- `earnings` - Monthly payroll records
- `vacation_records` - Vacation days taken
- `employee_benefits` - Benefits enrollment
- `benefits_plans` - Plan definitions

### Summary Tables (Pre-aggregated)
- `EarningsSummary` - Aggregated by year, group_type, group_value
- `VacationSummary` - Same structure
- `BenefitsSummary` - By plan and shareholder type
- `AlertsSummary` - Alert counts and thresholds
- `AlertEmployee` - Full employee list for pagination

## Key Technical Decisions

1. **Pre-aggregation Strategy**: Dashboard reads from summary tables for <100ms response time
2. **Hybrid Pagination**: AlertEmployee table allows API pagination for 40k+ records
3. **Cursor Streaming**: aggregate-dashboard.js uses MongoDB cursor to process 500k employees with constant memory
4. **Dynamic Thresholds**: Alert thresholds read from MongoDB Alert collection, not hardcoded

## Case Study Requirements Summary (2026-02-03)
- Summary file: Memory/Context/case_study_requirements_summary.md
- Contents: CEO Memo requirements, Case Study 1-5 deliverables, crosswalk matrix, priorities, architecture, artifacts, assumptions

## Recent Performance Fixes (2026-02-03)
- Drilldown bulk mode: `bulk=1` or `limit>=1000` returns lean/minimal fields, skips populate, maps department via cache.
- Summary fast mode: `summary=fast` returns count only and avoids heavy totals computation.
- Added CSV streaming export: `GET /api/dashboard/drilldown/export`.
- Enabled gzip compression and disabled pretty JSON in production.
- Frontend cancels stale drilldown requests to prevent race condition (20-row response overriding 10k).

## Recent UI/UX Updates (2026-02-05)
- Compact layout pass: reduced dashboard padding/gaps, chart heights, alert row height, and KPI card spacing.
- Enterprise styling: updated design tokens (palette, borders, radii, shadows) for a corporate look.
- Earnings Overview:
  - Grouped breakdown tables (Gender/Ethnicity/Employment Type) replacing chip list.
  - Added insights: Top Growth Dept, Biggest Decline Dept.
  - Added Top Departments (Current) list and YoY Movers with tabs (Declines / Smallest Growth).
  - Gap with Alerts fixed via row stretch alignment.
- Time-off Overview:
  - Rebalanced donut + details layout with panel styling.
  - Added insights bar: Largest Segment + Gap vs #2 (shows <0.1% with #2 name and days).
- Alerts panel:
  - Enterprise styling refinements and auto-fit grid.
  - Last card spans full-width when alert count is odd to remove empty gap.
