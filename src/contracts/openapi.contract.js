import pkg from "../../package.json" with { type: "json" };

const jsonContent = (schema) => ({
  "application/json": { schema },
});

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const requestIdHeader = {
  name: "x-request-id",
  in: "header",
  required: false,
  description: "Optional request correlation id echoed back by the backend.",
  schema: {
    type: "string",
    maxLength: 120,
  },
};

const pageQuery = {
  name: "page",
  in: "query",
  required: false,
  schema: { type: "integer", minimum: 1, default: 1 },
};

const limitQuery = {
  name: "limit",
  in: "query",
  required: false,
  schema: { type: "integer", minimum: 1 },
};

const security = [{ XAccessToken: [] }];

const bearerErrors = {
  401: {
    description: "Unauthorized or expired token",
    content: jsonContent(ref("ErrorEnvelope")),
  },
  403: {
    description: "Missing token or insufficient role",
    content: jsonContent(ref("ErrorEnvelope")),
  },
};

const validationErrorResponse = {
  description: "Validation failed",
  content: jsonContent(ref("ValidationErrorEnvelope")),
};

export const createOpenApiContract = () => ({
  openapi: "3.1.0",
  info: {
    title: "SIP_CS Backend Contract",
    version: pkg.version,
    description: "Backend-owned FE contract for CEO Memo dashboard, integration operations, sync visibility, and employee workflows.",
  },
  servers: [
    {
      url: "/api",
      description: "Application API root",
    },
  ],
  tags: [
    { name: "Auth" },
    { name: "Users" },
    { name: "Health" },
    { name: "Products" },
    { name: "Employee" },
    { name: "Dashboard" },
    { name: "Alerts" },
    { name: "Integrations" },
    { name: "Sync" },
    { name: "Contracts" },
  ],
  paths: {
    "/contracts/openapi.json": {
      get: {
        tags: ["Contracts"],
        summary: "Fetch backend-owned OpenAPI contract",
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "OpenAPI contract document",
            content: jsonContent({
              type: "object",
              properties: {
                openapi: { type: "string" },
                info: { type: "object" },
                paths: { type: "object" },
                components: { type: "object" },
              },
            }),
          },
        },
      },
    },
    "/auth/signin": {
      post: {
        tags: ["Auth"],
        summary: "Sign in and receive user profile + token",
        description: "Accepts `identifier`, `email`, or `username` plus password. Backend resolves email or username without changing the FE contract.",
        parameters: [requestIdHeader],
        requestBody: {
          required: true,
          content: jsonContent(ref("AuthSigninRequest")),
        },
        responses: {
          200: {
            description: "Authentication succeeded",
            content: jsonContent(ref("AuthSigninResponse")),
          },
          422: validationErrorResponse,
          401: bearerErrors[401],
        },
      },
    },
    "/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register a baseline user account",
        description: "Always assigns the baseline `user` role, even if roles are sent in the request payload.",
        parameters: [requestIdHeader],
        requestBody: {
          required: true,
          content: jsonContent(ref("AuthSignupRequest")),
        },
        responses: {
          201: {
            description: "Signup succeeded",
            content: jsonContent(ref("AuthSignupResponse")),
          },
          409: {
            description: "Username or email already exists",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Revoke the current auth session",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "Logout succeeded",
            content: jsonContent(ref("AuthLogoutResponse")),
          },
          ...bearerErrors,
        },
      },
      get: {
        tags: ["Auth"],
        summary: "Legacy logout alias",
        description: "Deprecated compatibility alias for older FE callers. Prefer POST `/auth/logout`.",
        deprecated: true,
        security,
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "Logout succeeded",
            content: jsonContent(ref("AuthLogoutResponse")),
          },
          ...bearerErrors,
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh cookie and issue a new access token",
        description: "Uses the httpOnly refresh token cookie when available. `refreshToken` in the body is accepted as a compatibility fallback for non-browser callers.",
        parameters: [requestIdHeader],
        requestBody: {
          required: false,
          content: jsonContent({
            type: "object",
            properties: {
              refreshToken: { type: "string" },
            },
          }),
        },
        responses: {
          200: {
            description: "Access token rotated successfully",
            content: jsonContent(ref("AuthRefreshResponse")),
          },
          401: {
            description: "Missing, revoked, or expired refresh token",
            content: jsonContent(ref("ErrorEnvelope")),
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated profile",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "Current user profile",
            content: jsonContent(ref("AuthMeResponse")),
          },
          ...bearerErrors,
        },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List admin-visible users",
        description: "Admin-only endpoint. Returns sanitized user summaries without password hashes or persisted tokens.",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "User list",
            content: jsonContent(ref("UserListResponse")),
          },
          ...bearerErrors,
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create a user from the admin console",
        description: "Admin-only endpoint. Validates requested roles against the platform allowlist.",
        security,
        parameters: [requestIdHeader],
        requestBody: {
          required: true,
          content: jsonContent(ref("UserCreateRequest")),
        },
        responses: {
          201: {
            description: "User created",
            content: jsonContent(ref("UserResponse")),
          },
          409: {
            description: "Username or email already exists",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/users/{userId}": {
      get: {
        tags: ["Users"],
        summary: "Get one sanitized user profile",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          },
        ],
        responses: {
          200: {
            description: "User detail",
            content: jsonContent(ref("UserResponse")),
          },
          404: {
            description: "User not found",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/users/{userId}/promote-admin": {
      put: {
        tags: ["Users"],
        summary: "Grant admin role to a user",
        description: "Super-admin-only role mutation.",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          },
        ],
        responses: {
          200: {
            description: "User role updated",
            content: jsonContent(ref("UserResponse")),
          },
          404: {
            description: "User not found",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/users/{userId}/demote-admin": {
      put: {
        tags: ["Users"],
        summary: "Remove admin role from a user",
        description: "Super-admin-only role mutation with root-admin and self-demotion safeguards.",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          },
        ],
        responses: {
          200: {
            description: "User role updated",
            content: jsonContent(ref("UserResponse")),
          },
          400: {
            description: "Business guard rejected demotion",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          404: {
            description: "User not found",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Get overall backend health",
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "All critical dependencies are ready",
            content: jsonContent(ref("HealthOverviewResponse")),
          },
          503: {
            description: "One or more dependencies are degraded",
            content: jsonContent(ref("HealthOverviewResponse")),
          },
        },
      },
    },
    "/health/live": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "Process is alive",
            content: jsonContent(ref("HealthLiveResponse")),
          },
        },
      },
    },
    "/health/ready": {
      get: {
        tags: ["Health"],
        summary: "Readiness probe",
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "Backend is ready to serve traffic",
            content: jsonContent(ref("HealthReadyResponse")),
          },
          503: {
            description: "Backend dependencies or migrations are not ready",
            content: jsonContent(ref("HealthReadyResponse")),
          },
        },
      },
    },
    "/health/integrations": {
      get: {
        tags: ["Health"],
        summary: "Get integration adapter health",
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "All integrations healthy",
            content: jsonContent(ref("HealthIntegrationsResponse")),
          },
          503: {
            description: "One or more integrations degraded",
            content: jsonContent(ref("HealthIntegrationsResponse")),
          },
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "List products",
        description: "Authenticated compatibility module. Returns the current product catalog with canonical metadata.",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "Product list",
            content: jsonContent(ref("ProductListResponse")),
          },
          ...bearerErrors,
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create a product",
        description: "Moderator/admin/super_admin path for the legacy products module.",
        security,
        parameters: [requestIdHeader],
        requestBody: {
          required: true,
          content: jsonContent(ref("ProductMutationRequest")),
        },
        responses: {
          201: {
            description: "Product created",
            content: jsonContent(ref("ProductResponse")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/products/search/{productName}": {
      get: {
        tags: ["Products"],
        summary: "Search products by name",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "productName",
            in: "path",
            required: true,
            schema: { type: "string", maxLength: 80 },
          },
        ],
        responses: {
          200: {
            description: "Matching products",
            content: jsonContent(ref("ProductListResponse")),
          },
          400: {
            description: "Search term too short",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/products/{productId}": {
      get: {
        tags: ["Products"],
        summary: "Get product detail",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Product detail",
            content: jsonContent(ref("ProductResponse")),
          },
          404: {
            description: "Product not found",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
      put: {
        tags: ["Products"],
        summary: "Update a product",
        description: "Moderator/admin/super_admin path for the legacy products module.",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: jsonContent(ref("ProductMutationRequest")),
        },
        responses: {
          200: {
            description: "Product updated",
            content: jsonContent(ref("ProductResponse")),
          },
          404: {
            description: "Product not found",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Delete a product",
        description: "Admin-only destructive operation for the legacy products module.",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Product deleted",
            content: jsonContent(ref("ProductDeleteResponse")),
          },
          404: {
            description: "Product not found",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/employee": {
      get: {
        tags: ["Employee"],
        summary: "List employees",
        security,
        parameters: [
          requestIdHeader,
          pageQuery,
          { ...limitQuery, schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
          {
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string", maxLength: 120 },
            description: "Optional admin-friendly search across employeeId, firstName, and lastName.",
          },
          {
            name: "departmentId",
            in: "query",
            required: false,
            schema: { type: "string", maxLength: 80 },
            description: "Optional department filter for the source manager table.",
          },
          {
            name: "employmentType",
            in: "query",
            required: false,
            schema: { type: "string", maxLength: 80 },
            description: "Optional employment type filter for the source manager table.",
          },
        ],
        responses: {
          200: {
            description: "Paginated employee list",
            content: jsonContent(ref("EmployeeListResponse")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
      post: {
        tags: ["Employee"],
        summary: "Create employee and dispatch sync",
        description: "Super-admin-only mutation. Response includes `sync.correlationId` for downstream tracing.",
        security,
        parameters: [requestIdHeader],
        requestBody: {
          required: true,
          content: jsonContent(ref("EmployeeMutationRequest")),
        },
        responses: {
          201: {
            description: "Employee created",
            content: jsonContent(ref("EmployeeMutationResponse")),
          },
          400: {
            description: "Validation or source write failure",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          409: {
            description: "Duplicate employeeId",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          ...bearerErrors,
        },
      },
    },
    "/employee/options": {
      get: {
        tags: ["Employee"],
        summary: "Get employee editor options",
        description: "Super-admin-only helper endpoint for employee create/edit forms. Returns department ids plus form enum options.",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: {
            description: "Employee editor options",
            content: jsonContent(ref("EmployeeOptionsResponse")),
          },
          ...bearerErrors,
        },
      },
    },
    "/employee/{employeeLookup}": {
      get: {
        tags: ["Employee"],
        summary: "Get employee detail",
        description: "Resolves by business `employeeId` first. Falls back to Mongo `_id` only for legacy callers.",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "employeeLookup",
            in: "path",
            required: true,
            schema: { type: "string", maxLength: 100 },
          },
        ],
        responses: {
          200: {
            description: "Employee detail",
            content: jsonContent(ref("EmployeeDetailResponse")),
          },
          404: {
            description: "Employee not found",
            content: jsonContent(ref("ErrorEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
      put: {
        tags: ["Employee"],
        summary: "Update employee and dispatch sync",
        description: "Super-admin-only mutation. Path value is the Mongo document id used by the existing route contract.",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "employeeLookup",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Mongo document id for update/delete routes.",
          },
        ],
        requestBody: {
          required: true,
          content: jsonContent(ref("EmployeeMutationRequest")),
        },
        responses: {
          200: {
            description: "Employee updated",
            content: jsonContent(ref("EmployeeMutationResponse")),
          },
          ...bearerErrors,
        },
      },
      delete: {
        tags: ["Employee"],
        summary: "Delete employee and dispatch sync",
        description: "Super-admin-only mutation. Path value is the Mongo document id used by the existing route contract.",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "employeeLookup",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Employee deleted",
            content: jsonContent(ref("EmployeeDeleteResponse")),
          },
          ...bearerErrors,
        },
      },
    },
    "/dashboard/executive-brief": {
      get: {
        tags: ["Dashboard"],
        summary: "Get backend-owned executive dashboard snapshot",
        security,
        parameters: [
          requestIdHeader,
          { name: "year", in: "query", required: false, schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Executive brief snapshot",
            content: jsonContent(ref("GenericSuccessEnvelope")),
          },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/dashboard/earnings": {
      get: {
        tags: ["Dashboard"],
        summary: "Get earnings summary",
        security,
        parameters: [requestIdHeader, { name: "year", in: "query", required: false, schema: { type: "integer" } }],
        responses: {
          200: { description: "Earnings summary", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/dashboard/vacation": {
      get: {
        tags: ["Dashboard"],
        summary: "Get vacation summary",
        security,
        parameters: [requestIdHeader, { name: "year", in: "query", required: false, schema: { type: "integer" } }],
        responses: {
          200: { description: "Vacation summary", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/dashboard/benefits": {
      get: {
        tags: ["Dashboard"],
        summary: "Get benefits summary",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Benefits summary", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
    },
    "/dashboard/drilldown": {
      get: {
        tags: ["Dashboard"],
        summary: "Get drilldown rows",
        security,
        parameters: [
          requestIdHeader,
          pageQuery,
          { ...limitQuery, schema: { type: "integer", minimum: 1, maximum: 1000, default: 50 } },
          { name: "search", in: "query", required: false, schema: { type: "string" } },
          { name: "year", in: "query", required: false, schema: { type: "integer" } },
          { name: "department", in: "query", required: false, schema: { type: "string" } },
          { name: "employmentType", in: "query", required: false, schema: { type: "string" } },
          { name: "shareholder", in: "query", required: false, schema: { type: "boolean" } },
          { name: "minEarnings", in: "query", required: false, schema: { type: "number" } },
        ],
        responses: {
          200: { description: "Drilldown data", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/dashboard/departments": {
      get: {
        tags: ["Dashboard"],
        summary: "Get department filter options",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Department options", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
    },
    "/alerts/triggered": {
      get: {
        tags: ["Alerts"],
        summary: "Get triggered alert groups",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Triggered alerts", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
    },
    "/alerts/{type}/employees": {
      get: {
        tags: ["Alerts"],
        summary: "Get employees for one alert type",
        security,
        parameters: [
          requestIdHeader,
          {
            name: "type",
            in: "path",
            required: true,
            schema: { type: "string", enum: ["anniversary", "vacation", "benefits_change", "birthday"] },
          },
          pageQuery,
          { ...limitQuery, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "search", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Alert employees", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "List alert configuration rules",
        description: "Moderator/admin/super_admin only.",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Alert config list", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
      post: {
        tags: ["Alerts"],
        summary: "Create alert configuration rule",
        description: "Moderator/admin/super_admin only.",
        security,
        parameters: [requestIdHeader],
        requestBody: {
          required: true,
          content: jsonContent(ref("AlertConfigRequest")),
        },
        responses: {
          201: { description: "Alert config created", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/alerts/{id}/acknowledge": {
      post: {
        tags: ["Alerts"],
        summary: "Acknowledge alert category with owner note",
        description: "Moderator/admin/super_admin only.",
        security,
        parameters: [
          requestIdHeader,
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: false,
          content: jsonContent({
            type: "object",
            properties: {
              note: { type: "string", maxLength: 500 },
            },
          }),
        },
        responses: {
          200: { description: "Alert acknowledged", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/integrations/events": {
      get: {
        tags: ["Integrations"],
        summary: "List integration events",
        description: "Admin-only operator view.",
        security,
        parameters: [
          requestIdHeader,
          pageQuery,
          { ...limitQuery, schema: { type: "integer", minimum: 1, maximum: 500, default: 50 } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["ALL", "PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD"] } },
        ],
        responses: {
          200: { description: "Integration event list", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/integrations/events/{id}/audit": {
      get: {
        tags: ["Integrations"],
        summary: "Get durable audit history for one integration event",
        security,
        parameters: [
          requestIdHeader,
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          pageQuery,
          { ...limitQuery, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: { description: "Audit history", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/integrations/events/metrics": {
      get: {
        tags: ["Integrations"],
        summary: "Get integration queue metrics",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Integration metrics", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
    },
    "/integrations/events/retry/{id}": {
      post: {
        tags: ["Integrations"],
        summary: "Retry one integration event",
        security,
        parameters: [
          requestIdHeader,
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Retry accepted", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/integrations/events/retry-dead": {
      post: {
        tags: ["Integrations"],
        summary: "Re-queue all dead integration events",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Dead events re-queued", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
    },
    "/integrations/events/recover-stuck": {
      post: {
        tags: ["Integrations"],
        summary: "Recover stale PROCESSING events",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Stale events recovered", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
    },
    "/integrations/events/replay": {
      post: {
        tags: ["Integrations"],
        summary: "Replay failed/dead integration events by filter",
        security,
        parameters: [requestIdHeader],
        requestBody: {
          required: false,
          content: jsonContent({
            type: "object",
            properties: {
              status: { type: "string", enum: ["FAILED", "DEAD"] },
              entityType: { type: "string" },
              entityId: { type: "string" },
              fromDate: { type: "string", format: "date-time" },
              fromDays: { type: "integer", minimum: 0, maximum: 365 },
            },
          }),
        },
        responses: {
          200: { description: "Replay accepted", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/sync/status": {
      get: {
        tags: ["Sync"],
        summary: "Get sync overview",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Sync overview", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
    },
    "/sync/logs": {
      get: {
        tags: ["Sync"],
        summary: "List sync logs",
        security,
        parameters: [
          requestIdHeader,
          pageQuery,
          { ...limitQuery, schema: { type: "integer", minimum: 1, maximum: 500, default: 50 } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["ALL", "PENDING", "SUCCESS", "FAILED"] } },
          { name: "action", in: "query", required: false, schema: { type: "string", enum: ["ALL", "CREATE", "UPDATE", "DELETE"] } },
          { name: "entityType", in: "query", required: false, schema: { type: "string" } },
          { name: "entityId", in: "query", required: false, schema: { type: "string" } },
          { name: "correlationId", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Sync logs", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
    "/sync/retry": {
      post: {
        tags: ["Sync"],
        summary: "Retry failed sync logs",
        description: "Admin-only operator endpoint. Uses request correlation as fallback when old failed logs lack correlation ids.",
        security,
        parameters: [requestIdHeader],
        responses: {
          200: { description: "Retry completed", content: jsonContent(ref("GenericSuccessEnvelope")) },
          ...bearerErrors,
        },
      },
    },
    "/sync/entity/{type}/{id}": {
      get: {
        tags: ["Sync"],
        summary: "Get latest sync state for one entity",
        security,
        parameters: [
          requestIdHeader,
          { name: "type", in: "path", required: true, schema: { type: "string" } },
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Entity sync state", content: jsonContent(ref("GenericSuccessEnvelope")) },
          422: validationErrorResponse,
          ...bearerErrors,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      XAccessToken: {
        type: "apiKey",
        in: "header",
        name: "x-access-token",
        description: "JWT session token issued by /api/auth/signin.",
      },
    },
    schemas: {
      MetaEnvelope: {
        type: "object",
        properties: {
          dataset: { type: "string" },
          actorId: { type: ["string", "null"] },
          requestId: { type: "string" },
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
          filters: { type: "object", additionalProperties: true },
        },
      },
      ErrorEnvelope: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", const: false },
          message: { type: "string" },
          code: { type: "string" },
          requestId: { type: "string" },
        },
      },
      ValidationErrorEnvelope: {
        allOf: [
          ref("ErrorEnvelope"),
          {
            type: "object",
            properties: {
              errors: {
                type: "array",
                items: ref("ValidationErrorItem"),
              },
            },
          },
        ],
      },
      ValidationErrorItem: {
        type: "object",
        required: ["field", "message"],
        properties: {
          field: { type: "string" },
          message: { type: "string" },
          value: {},
        },
      },
      GenericSuccessEnvelope: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", const: true },
          data: {},
          meta: ref("MetaEnvelope"),
        },
      },
      Product: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          price: { type: "number" },
          imgURL: { type: "string" },
          createdAt: { type: ["string", "null"], format: "date-time" },
          updatedAt: { type: ["string", "null"], format: "date-time" },
        },
      },
      ProductMutationRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          price: { type: "number", minimum: 0 },
          imgURL: { type: "string" },
        },
      },
      ProductResponse: {
        type: "object",
        required: ["success", "data", "meta"],
        properties: {
          success: { type: "boolean", const: true },
          data: ref("Product"),
          meta: ref("MetaEnvelope"),
        },
      },
      ProductListResponse: {
        type: "object",
        required: ["success", "data", "meta"],
        properties: {
          success: { type: "boolean", const: true },
          data: {
            type: "array",
            items: ref("Product"),
          },
          meta: ref("MetaEnvelope"),
        },
      },
      ProductDeleteResponse: {
        type: "object",
        required: ["success", "message", "meta"],
        properties: {
          success: { type: "boolean", const: true },
          message: { type: "string" },
          meta: ref("MetaEnvelope"),
        },
      },
      Employee: {
        type: "object",
        properties: {
          _id: { type: "string" },
          employeeId: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          employmentType: { type: "string" },
          isShareholder: { type: "boolean" },
          annualEarnings: { type: "number" },
        },
      },
      EmployeeSyncState: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["QUEUED", "SUCCESS", "FAILED"] },
          mode: { type: "string", enum: ["OUTBOX", "DIRECT", "DIRECT_FALLBACK"] },
          consistency: { type: "string", enum: ["EVENTUAL", "AT_RISK"] },
          requiresAttention: { type: "boolean" },
          message: { type: "string" },
          warning: { type: ["string", "null"] },
          correlationId: { type: ["string", "null"] },
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                adapter: { type: "string" },
                status: { type: "string" },
                error: { type: ["string", "null"] },
              },
            },
          },
        },
      },
      EmployeeMutationRequest: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          gender: { type: "string" },
          ethnicity: { type: "string" },
          employmentType: { type: "string" },
          isShareholder: { type: "boolean" },
          departmentId: { type: "string" },
          hireDate: { type: "string", format: "date-time" },
          birthDate: { type: "string", format: "date-time" },
          vacationDays: { type: "number" },
          paidToDate: { type: "number" },
          paidLastYear: { type: "number" },
          payRate: { type: "number" },
          payRateId: { type: "number" },
        },
      },
      EmployeeMutationResponse: {
        type: "object",
        required: ["success", "data", "sync"],
        properties: {
          success: { type: "boolean", const: true },
          data: ref("Employee"),
          sync: ref("EmployeeSyncState"),
        },
      },
      EmployeeDeleteResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", const: true },
          message: { type: "string" },
          sync: ref("EmployeeSyncState"),
        },
      },
      EmployeeDepartmentOption: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      EmployeeOptionsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", const: true },
          data: {
            type: "object",
            properties: {
              departments: {
                type: "array",
                items: ref("EmployeeDepartmentOption"),
              },
              enums: {
                type: "object",
                properties: {
                  gender: {
                    type: "array",
                    items: { type: "string" },
                  },
                  employmentType: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
          meta: ref("MetaEnvelope"),
        },
      },
      EmployeeListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", const: true },
          data: {
            type: "array",
            items: ref("Employee"),
          },
          pagination: {
            type: "object",
            properties: {
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
              pages: { type: "integer" },
            },
          },
          meta: ref("MetaEnvelope"),
        },
      },
      EmployeeDetailResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", const: true },
          data: ref("Employee"),
          meta: ref("MetaEnvelope"),
        },
      },
      UserSummary: {
        type: "object",
        properties: {
          _id: { type: "string" },
          username: { type: "string" },
          email: { type: "string", format: "email" },
          roles: {
            type: "array",
            items: { type: "string" },
          },
          createdAt: { type: ["string", "null"], format: "date-time" },
          updatedAt: { type: ["string", "null"], format: "date-time" },
        },
      },
      AuthSigninRequest: {
        type: "object",
        required: ["password"],
        properties: {
          identifier: { type: "string" },
          email: { type: "string", format: "email" },
          username: { type: "string" },
          password: { type: "string" },
        },
        anyOf: [
          { required: ["identifier"] },
          { required: ["email"] },
          { required: ["username"] },
        ],
      },
      AuthSignupRequest: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string" },
          roles: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
        AuthSigninResponse: {
          type: "object",
          required: ["success", "data", "token", "meta"],
          properties: {
            success: { type: "boolean", const: true },
            data: ref("UserSummary"),
            token: { type: "string" },
            meta: ref("MetaEnvelope"),
          },
        },
        AuthRefreshResponse: {
          type: "object",
          required: ["success", "data", "token", "meta"],
          properties: {
            success: { type: "boolean", const: true },
            data: ref("UserSummary"),
            token: { type: "string" },
            meta: ref("MetaEnvelope"),
          },
        },
        AuthSignupResponse: {
        type: "object",
        required: ["success", "data", "meta"],
        properties: {
          success: { type: "boolean", const: true },
          data: ref("UserSummary"),
          meta: ref("MetaEnvelope"),
        },
      },
      AuthLogoutResponse: {
        type: "object",
        required: ["success", "message", "meta"],
        properties: {
          success: { type: "boolean", const: true },
          message: { type: "string" },
          meta: ref("MetaEnvelope"),
        },
      },
      AuthMeResponse: {
        type: "object",
        required: ["success", "data", "meta"],
        properties: {
          success: { type: "boolean", const: true },
          data: ref("UserSummary"),
          meta: ref("MetaEnvelope"),
        },
      },
      UserCreateRequest: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string" },
          roles: {
            type: "array",
            items: {
              type: "string",
              enum: ["user", "admin", "moderator", "super_admin"],
            },
          },
        },
      },
      UserResponse: {
        type: "object",
        required: ["success", "data", "meta"],
        properties: {
          success: { type: "boolean", const: true },
          data: ref("UserSummary"),
          meta: ref("MetaEnvelope"),
        },
      },
      UserListResponse: {
        type: "object",
        required: ["success", "data", "meta"],
        properties: {
          success: { type: "boolean", const: true },
          data: {
            type: "array",
            items: ref("UserSummary"),
          },
          meta: ref("MetaEnvelope"),
        },
      },
      HealthServiceStatus: {
        type: "object",
        additionalProperties: true,
        properties: {
          status: { type: "string" },
          ready: { type: "boolean" },
        },
      },
      HealthOverviewResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy", "degraded"] },
          timestamp: { type: "string", format: "date-time" },
          uptime: { type: "number" },
          version: { type: "string" },
          requestId: { type: "string" },
          services: {
            type: "object",
            properties: {
              mongodb: ref("HealthServiceStatus"),
              mysql: ref("HealthServiceStatus"),
            },
            additionalProperties: ref("HealthServiceStatus"),
          },
        },
      },
      HealthLiveResponse: {
        type: "object",
        properties: {
          alive: { type: "boolean", const: true },
          uptime: { type: "number" },
          version: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
          requestId: { type: "string" },
        },
      },
      HealthReadyResponse: {
        type: "object",
        properties: {
          ready: { type: "boolean" },
          requestId: { type: "string" },
          details: {
            type: "object",
            properties: {
              mongodb: ref("HealthServiceStatus"),
              mysql: ref("HealthServiceStatus"),
            },
            additionalProperties: ref("HealthServiceStatus"),
          },
        },
      },
      HealthIntegrationsResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy", "degraded", "error"] },
          timestamp: { type: "string", format: "date-time" },
          requestId: { type: "string" },
          integrations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
      AlertConfigRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["anniversary", "vacation", "benefits_change", "birthday"] },
          threshold: { type: "number" },
          description: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
    },
  },
});

export default createOpenApiContract;
