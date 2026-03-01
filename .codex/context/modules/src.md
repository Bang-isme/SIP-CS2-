# Module: src/

Files: 70

## Key Files
- `src/adapters/base.adapter.js` (imports: 0, imported_by: 2)
- `src/adapters/payroll.adapter.js` (imports: 2, imported_by: 0)
- `src/adapters/security.mock.adapter.js` (imports: 1, imported_by: 0)
- `src/app.js` (imports: 10, imported_by: 1)
- `src/config.js` (imports: 0, imported_by: 13)
- `src/config/integrations.js` (imports: 0, imported_by: 1)
- `src/controllers/alerts.controller.js` (imports: 4, imported_by: 0)
- `src/controllers/auth.controller.js` (imports: 3, imported_by: 0)
- `src/controllers/dashboard.controller.js` (imports: 4, imported_by: 0)
- `src/controllers/employee.controller.js` (imports: 4, imported_by: 1)
- `src/controllers/integration.controller.js` (imports: 1, imported_by: 0)
- `src/controllers/products.controller.js` (imports: 1, imported_by: 0)
- `src/controllers/user.controller.js` (imports: 3, imported_by: 0)
- `src/database.js` (imports: 1, imported_by: 1)
- `src/index.js` (imports: 7, imported_by: 0)

## Route Surface
- `GET /api/alerts` -> `alerts.controller.getAlerts`
- `POST /api/alerts` -> `alerts.controller.createAlert`
- `PUT /api/alerts/:id` -> `alerts.controller.updateAlert`
- `DELETE /api/alerts/:id` -> `alerts.controller.deleteAlert`
- `GET /api/alerts/triggered` -> `alerts.controller.getTriggeredAlerts`
- `GET /api/alerts/:type/employees` -> `alerts.controller.getAlertEmployees`
- `POST /api/auth/signup` -> `auth.controller.signupHandler`
- `POST /api/auth/signin` -> `auth.controller.signinHandler`
- `GET /api/auth/logout` -> `auth.controller.logoutHandler`
- `GET /api/auth/me` -> `auth.controller.meHandler`
