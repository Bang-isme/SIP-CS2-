# Backend API Contract Reference

> Last Updated: 2026-04-03

## Mục tiêu

Tài liệu này xác định nguồn chuẩn cho FE/operator khi cần đọc contract backend theo kiểu machine-readable thay vì chỉ đọc controller hoặc test.

## Nguồn chuẩn

- Endpoint: `GET /api/contracts/openapi.json`
- Purpose: trả OpenAPI 3.1 JSON được backend sở hữu
- Interactive docs: `GET /api/contracts/docs/`
- Purpose: render Swagger UI trực tiếp từ chính OpenAPI bundle nội bộ, không phụ thuộc CDN ngoài
- Scope hiện tại:
  - auth signup/signin/logout/profile
  - admin users list/detail/role mutation
  - health/live/ready/integration probes
  - legacy products compatibility module
  - employee list/detail/mutation
  - dashboard summary + executive brief + drilldown/departments
  - alerts triggered/config/acknowledge/type employees
  - integrations operator APIs
  - sync operator APIs

## Cách dùng cho FE

1. Dùng endpoint này làm reference khi map route, query params, và envelope.
2. Khi cần nhìn nhanh contract trong demo/viva hoặc onboarding FE:
   - mở `GET /api/contracts/docs/`
   - xác nhận route/query/schema/auth ngay trên Swagger UI
3. Ưu tiên đọc:
   - `paths`
   - `components.schemas`
   - `components.securitySchemes`
4. Với các mutation có eventual consistency, xem thêm:
   - `EmployeeMutationResponse.sync`
   - `/sync/logs` filter `correlationId`
   - `/integrations/events` + `/integrations/events/{id}/audit`
5. Với auth/admin/ops flows:
   - `POST /auth/logout` là canonical route; `GET /auth/logout` chỉ còn là alias deprecated cho compatibility
   - alias `GET /auth/logout` giờ trả thêm deprecation headers: `Deprecation`, `Sunset`, `Link`
   - `/users/*` là source of truth cho admin-user management contract
   - `/health`, `/health/ready`, `/health/integrations` phản ánh cả readiness và migration health, không chỉ connection state
   - auth guard failures giờ có `code` machine-readable như `AUTH_TOKEN_MISSING`, `AUTH_UNAUTHORIZED`, `AUTH_FORBIDDEN`
   - runtime logs trên auth/dashboard/alerts/employee/registry/worker path đã được đổi sang structured logger, nên demo/debug nên bám `requestId` + `context` thay vì tìm `console.*` text rời rạc
   - controller-level error responses across auth, users, employee, dashboard, alerts, integrations, and sync now converge on a shared envelope: `success`, `message`, `code`, `requestId`, optional `errors[]`
   - unknown API routes now also return JSON contract errors instead of falling back to Express HTML
6. Với legacy products module:
   - `/products` is still a compatibility module, but it now follows canonical validation and error contracts
   - product search no longer depends on the broken aggregation syntax from the old implementation; it now runs a real bounded name search

## Canonical Error Envelope

All FE/operator-facing API errors should now be read in this order:
- `code`: machine-readable branch key for UI or operator logic
- `message`: human-readable explanation
- `requestId`: trace token for logs/evidence
- `errors[]`: field-level validation details when present

Representative codes now in active use:
- `VALIDATION_ERROR`
- `API_ROUTE_NOT_FOUND`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_TOKEN_MISSING`
- `ALERT_NOT_FOUND`
- `EMPLOYEE_NOT_FOUND`
- `INTEGRATION_EVENT_NOT_FOUND`
- `USER_NOT_FOUND`

## Điều cần hiểu đúng

- Spec này là contract bundle cho các surface FE/operator đang dùng thật, không phải public API platform hoàn chỉnh.
- Auth signin là backward-compatible contract:
  - có thể gửi `identifier`
  - hoặc legacy `email`
  - hoặc explicit `username`
- Auth error envelope không còn chỉ dựa vào `message`; FE/operator nên ưu tiên đọc thêm `code` khi cần điều hướng login/re-auth/permission UI.
- Shared contract errors are now broader than auth only; field validation, not-found, conflict, and fallback server errors all expose `code`.
- Một số route legacy vẫn được giữ vì compatibility:
  - `GET /api/employee/{employeeLookup}` ưu tiên business `employeeId`
  - cùng path đó, `PUT/DELETE` vẫn dùng Mongo document id theo contract route hiện tại
- `GET /auth/logout` vẫn còn trong spec nhưng đã đánh dấu deprecated; FE mới nên dùng `POST /auth/logout`.
- Export CSV vẫn là file response đặc biệt; spec hiện tập trung mạnh vào JSON APIs.
- Products API is not part of the CEO Memo dashboard scope, but because it is mounted in the main app it is now documented and tested like the other backend surfaces.

## Khi nào cần update spec

Update `GET /api/contracts/openapi.json` cùng lúc với code khi:
- thêm route mới cho dashboard/alerts/integrations/sync/employee
- thêm hoặc đổi auth/user/health route mà FE/operator đang dùng
- đổi query param hoặc response envelope
- đổi auth/role requirement
- đổi auth failure code hoặc deprecation headers cho route compatibility
- đổi any machine-readable error code that FE/operator relies on
- đổi meaning của `sync`, `meta`, hoặc `correlationId`

## Backend improvement verdict (2026-04-03)

- Latest local evidence from `npm run doctor:local` is `healthy` on the 500k baseline:
  - Mongo local `employees=500000`, `departments=8`
  - MySQL required migrations present (`appliedMigrationCount=5`, `missingMigrations=[]`)
  - backend `/api/health/live` and `/api/health/ready` both return `200`
- For coursework/demo scope, backend is now functionally complete enough to act as the source of truth for FE/operator contracts.
- Remaining work is non-blocking polish, not a functional blocker:
  - install `SIPLocalMongoDB` as a real Windows service from an elevated shell if system-wide autostart is required; current scheduled-task autostart already covers non-admin demo runs
  - expand the current ESLint/static-analysis gate beyond the new runtime-safety baseline if stricter code-quality enforcement is desired
  - only if going beyond coursework scope, replace DB-outbox polling with broker-grade integration middleware and deeper observability

## Evidence path

- Route: `src/routes/contracts.routes.js`
- Controller: `src/controllers/contracts.controller.js`
- Spec source: `src/contracts/openapi.contract.js`
- Regression: `src/__tests__/contracts.routes.test.js`
- Error envelope helper: `src/utils/apiErrors.js`
- App fallback handlers: `src/middlewares/errorHandler.js`
- Regression: `src/__tests__/app.error-contract.test.js`
- Logger boundary: `src/utils/logger.js`
- App access-log toggle: `src/app.js`
- Regression: `src/__tests__/logger.test.js`

## Test Environment Logging

- `NODE_ENV=test` giờ mặc định dùng logger level `SILENT` để warning/error test-path không làm loãng output gate.
- Nếu cần mở log khi debug test local:
  - set `LOG_LEVEL=DEBUG|INFO|WARN|ERROR`
  - set `HTTP_LOG_LEVEL=verbose` để bật lại access logs của `morgan`
- Dev/prod behavior không đổi; thay đổi này chỉ nhắm tới signal-to-noise trong quality gate.

## Lint Gate

- `npm run lint` now runs two backend stages:
  - `lint:syntax` keeps the existing parser-level `node --check` sweep
  - `lint:static` runs ESLint on `src`, `scripts`, `tests`, and `jest.config.js`
- Current ESLint rules intentionally focus on runtime-safety signals instead of style churn:
  - `no-undef`
  - `no-unreachable`
  - `no-dupe-keys`
  - `no-self-assign`
  - `no-constant-condition`
  - `no-unused-vars`
  - `no-empty`
  - `eqeqeq`
  - `no-useless-catch`
