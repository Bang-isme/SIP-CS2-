# Project DNA: SIP_CS
Generated: 2026-02-24 23:22 | Files: 173 | Lines: ~36180

## Snapshot
This genome summarizes architecture-level context so AI agents can reason with less scanning and less guessing.
The project has about 173 relevant files and 36180 lines in scannable source/docs.

## Tech Stack
- Language: JavaScript
- Routing: express-router
- Database: sequelize, mongoose, raw-queries
- Auth: jwt
- State: none (backend)
- Module system: esmodules
- Error handling style: try-catch

## Directory Map
- `src/` - 70 files
- `dashboard/` - 45 files
- `docs/` - 22 files
- `scripts/` - 17 files
- `Memory/` - 10 files
- `./` - 5 files
- `tests/` - 4 files

## Entry Point
- `src/index.js`

## Coding Conventions
- File naming: mixed
- Function naming: camelCase
- Test pattern: *.test.js
- Quotes: double
- Semicolons: True
- Indent: 4 spaces

## Key Data Models (20)
- **Alert** (mongoose): createdBy, description, isActive, lastTriggered, name, threshold
- **AlertEmployee** (sequelize): aggregated_at, alert_type, days_until, employee_id, extra_data, id, ... (+1)
- **AlertsSummary** (sequelize): alert_type, computed_at, employee_count, id, matching_employees, threshold
- **BenefitPlan** (sequelize): description, id, is_active, monthly_cost, name
- **BenefitsSummary** (sequelize): average_paid, computed_at, enrollment_count, id, plan_name, shareholder_type, ... (+1)
- **Department** (mongoose): code, description, isActive, managerId, name
- **Earning** (sequelize): amount, description, employee_id, id, month, year
- **EarningsEmployeeYear** (sequelize): employee_id, id, total, year
- **EarningsSummary** (sequelize): computed_at, current_total, employee_count, group_type, group_value, id, ... (+2)
- **Employee** (mongoose): annualEarnings, annualEarningsYear, birthDate, departmentId, employeeId, employmentType, ... (+11)
- **EmployeeBenefit** (sequelize): amount_paid, effective_date, employee_id, id, is_active, key, ... (+3)
- **IntegrationEvent** (sequelize): action, attempts, entity_id, entity_type, id, last_error, ... (+4)
- **Payrate** (mongoose): amount, name, taxPercentage, value
- **PayRate** (sequelize): effective_date, employee_id, id, is_active, pay_rate, pay_type
- **Product** (mongoose): category, imgURL, name, price, userId
- **Role** (mongoose): name
- **SyncLog** (sequelize): action, completed_at, entity_id, entity_type, error_message, id, ... (+2)
- **User** (mongoose): email, password, roles, tokens, username
- **VacationRecord** (sequelize): days_taken, employee_id, end_date, id, reason, start_date, ... (+1)
- **VacationSummary** (sequelize): computed_at, current_total, employee_count, group_type, group_value, id, ... (+2)

## API Surface
- **alerts.routes** (6 routes): GET /api/alerts, POST /api/alerts, PUT /api/alerts/:id, DELETE /api/alerts/:id, GET /api/alerts/triggered
  ... +1 more
- **auth.routes** (4 routes): POST /api/auth/signup, POST /api/auth/signin, GET /api/auth/logout, GET /api/auth/me
- **dashboard.routes** (6 routes): GET /api/dashboard/earnings, GET /api/dashboard/vacation, GET /api/dashboard/benefits, GET /api/dashboard/drilldown, GET /api/dashboard/drilldown/export
  ... +1 more
- **employee.routes** (5 routes): GET /api/employee, GET /api/employee/:employeeId, POST /api/employee, PUT /api/employee/:id, DELETE /api/employee/:id
- **health.routes** (4 routes): GET /api/health, GET /api/health/integrations, GET /api/health/ready, GET /api/health/live
- **index.routes** (1 routes): GET /api
- **integration.routes** (5 routes): GET /api/integrations/events, GET /api/integrations/events/metrics, POST /api/integrations/events/retry/:id, POST /api/integrations/events/retry-dead, POST /api/integrations/events/replay
- **products.routes** (8 routes): GET /api/products, GET /api/products/:productId, POST /api/products, POST /api/products, PUT /api/products/:productId
  ... +3 more
- **sync.routes** (4 routes): GET /api/sync/status, GET /api/sync/logs, POST /api/sync/retry, GET /api/sync/entity/:type/:id
- **user.routes** (5 routes): POST /api/users, GET /api/users, GET /api/users/:userId, PUT /api/users/:id/promote-admin, PUT /api/users/:id/demote-admin

## Module Dependencies
- `adapters`: imports 1 modules, imported by 0 modules
- `components`: imports 1 modules, imported by 2 modules
- `config`: imports 0 modules, imported by 1 modules
- `controllers`: imports 4 modules, imported by 1 modules
- `dashboard`: imports 3 modules, imported by 0 modules
- `libs`: imports 2 modules, imported by 1 modules
- `middlewares`: imports 2 modules, imported by 1 modules
- `models`: imports 1 modules, imported by 7 modules
- `pages`: imports 2 modules, imported by 1 modules
- `permissions`: imports 0 modules, imported by 0 modules
- `registry`: imports 1 modules, imported by 1 modules
- `root`: imports 4 modules, imported by 7 modules
- `routes`: imports 5 modules, imported by 1 modules
- `scripts`: imports 2 modules, imported by 0 modules
- `services`: imports 3 modules, imported by 7 modules
- `tests`: imports 0 modules, imported by 0 modules
- `utils`: imports 0 modules, imported by 2 modules
- `workers`: imports 2 modules, imported by 1 modules

## Circular Dependencies
- Indirect chain (8 modules): controllers -> libs -> middlewares -> models ... (run build_knowledge_graph.py for details)
