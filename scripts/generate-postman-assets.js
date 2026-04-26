import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createOpenApiContract } from "../src/contracts/openapi.contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const openApi = createOpenApiContract();

const tagOrder = [
  "Auth",
  "Users",
  "Health",
  "Products",
  "Employee",
  "Dashboard",
  "Alerts",
  "Integrations",
  "Sync",
  "Contracts",
];

const tagLabels = {
  Auth: "1. Auth",
  Users: "2. Users",
  Health: "3. Health",
  Products: "4. Products",
  Employee: "5. Employee",
  Dashboard: "6. Dashboard",
  Alerts: "7. Alerts",
  Integrations: "8. Integrations",
  Sync: "9. Sync",
  Contracts: "10. Contracts",
};

const pathVariableMap = {
  "/users/{userId}": { userId: "userId" },
  "/users/{userId}/promote-admin": { userId: "userId" },
  "/users/{userId}/demote-admin": { userId: "userId" },
  "/products/search/{productName}": { productName: "productName" },
  "/products/{productId}": { productId: "productId" },
  "/employee/{employeeLookup}": { employeeLookup: "employeeLookup" },
  "/alerts/{type}/employees": { type: "alertType" },
  "/alerts/{id}/acknowledge": { id: "alertId" },
  "/alerts/{id}": { id: "alertConfigId" },
  "/integrations/events/{id}/audit": { id: "integrationEventId" },
  "/integrations/events/retry/{id}": { id: "integrationEventId" },
  "/sync/entity/{type}/{id}": { type: "syncEntityType", id: "syncEntityId" },
};

const operationOverrides = {
  "POST /auth/signin": {
    name: "Sign in and capture token",
    body: {
      identifier: "{{adminEmail}}",
      password: "{{adminPassword}}",
    },
    tests: [
      "const json = pm.response.json();",
      "if (json?.token) pm.environment.set('token', json.token);",
      "if (json?.data?._id) pm.environment.set('currentUserId', json.data._id);",
      "if (Array.isArray(json?.data?.roles) && json.data.roles.length > 0) pm.environment.set('currentUserRole', json.data.roles.join(','));",
    ],
    note: "Request dau tien nen chay trong demo. Request nay se luu token vao environment de cac request co khoa ben duoi dung lai.",
  },
  "POST /auth/signup": {
    name: "[Mutation] Register baseline user account",
    body: {
      username: "postman_user_{{$timestamp}}",
      email: "postman+{{$timestamp}}@example.com",
      password: "Password123!",
    },
    note: "Chi can test khi muon minh hoa luong dang ky. Se tao them user moi trong MongoDB.",
  },
  "POST /auth/logout": {
    name: "Sign out current session",
    note: "Nen chay o cuoi demo neu muon dong session dung luong backend.",
  },
  "GET /users": {
    tests: [
      "const json = pm.response.json();",
      "const first = Array.isArray(json?.data) ? json.data[0] : null;",
      "if (first?._id) pm.environment.set('userId', first._id);",
    ],
    note: "Dung de lay nhanh mot userId cho cac request chi tiet va promote/demote.",
  },
  "POST /users": {
    name: "[Mutation] Create admin-console user",
    body: {
      username: "console_user_{{$timestamp}}",
      email: "console+{{$timestamp}}@example.com",
      password: "Password123!",
      roles: ["user"],
    },
    note: "Chi can test khi demo phan admin console. Request nay se tao user moi.",
  },
  "GET /products": {
    tests: [
      "const json = pm.response.json();",
      "const first = Array.isArray(json?.data) ? json.data[0] : null;",
      "if (first?._id) pm.environment.set('productId', first._id);",
    ],
  },
  "POST /products": {
    name: "[Mutation] Create product",
    body: {
      name: "Postman Demo Product {{$timestamp}}",
      category: "Demo",
      price: 49.99,
      imgURL: "https://example.com/demo-product.png",
    },
    note: "Module nay la legacy. Khong can test trong demo CEO Memo neu thầy khong hoi.",
  },
  "GET /products/search/{productName}": {
    query: [],
  },
  "PUT /products/{productId}": {
    name: "[Mutation] Update product",
    body: {
      name: "Updated Demo Product",
      category: "Demo",
      price: 59.99,
      imgURL: "https://example.com/demo-product-updated.png",
    },
    note: "Can co productId. Nen bo qua trong demo chinh.",
  },
  "DELETE /products/{productId}": {
    name: "[Dangerous] Delete product",
    note: "Khong nen chay trong demo chinh vi request nay xoa du lieu.",
  },
  "GET /employee": {
    query: [
      { key: "page", value: "1" },
      { key: "limit", value: "3" },
    ],
    tests: [
      "const json = pm.response.json();",
      "const first = Array.isArray(json?.data) ? json.data[0] : null;",
      "if (first?.employeeId) {",
      "  pm.environment.set('employeeLookup', first.employeeId);",
      "  pm.environment.set('syncEntityId', first.employeeId);",
      "}",
    ],
    note: "Request nay rat hop ly de chung minh baseline 500k ban ghi va lay employeeLookup cho cac request sau.",
  },
  "POST /employee": {
    name: "[Mutation] Create employee and dispatch sync",
    body: {
      employeeId: "PM{{$timestamp}}",
      firstName: "Postman",
      lastName: "Demo",
      gender: "Female",
      ethnicity: "Asian",
      employmentType: "Full-time",
      isShareholder: false,
      departmentId: "Engineering",
      hireDate: "2024-01-15T00:00:00.000Z",
      birthDate: "1998-06-10T00:00:00.000Z",
      vacationDays: 12,
      paidToDate: 88000,
      paidLastYear: 82000,
      payRate: 42.5,
      payRateId: 4250,
    },
    note: "Dung khi can minh hoa luong ghi du lieu va dispatch sync. Se tao ban ghi moi o MongoDB va outbox.",
  },
  "PUT /employee/{employeeLookup}": {
    name: "[Mutation] Update employee and dispatch sync",
    body: {
      firstName: "Updated",
      lastName: "Employee",
      vacationDays: 26,
      paidToDate: 96000,
      payRate: 47.5,
    },
    note: "Can co employeeLookup. Nen dung tren record demo rieng, khong dung lung tung tren record thuc.",
  },
  "DELETE /employee/{employeeLookup}": {
    name: "[Dangerous] Delete employee and dispatch sync",
    note: "Khong nen chay trong demo chinh vi request nay xoa du lieu nhan su.",
  },
  "GET /dashboard/executive-brief": {
    query: [{ key: "year", value: "2026" }],
    note: "Day la request dashboard quan trong nhat. FE dang dua man hinh chinh tu snapshot backend nay.",
  },
  "GET /dashboard/earnings": {
    query: [{ key: "year", value: "2026" }],
  },
  "GET /dashboard/vacation": {
    query: [{ key: "year", value: "2026" }],
  },
  "GET /dashboard/benefits": {
    query: [{ key: "year", value: "2026" }],
  },
  "GET /dashboard/drilldown": {
    query: [
      { key: "context", value: "earnings" },
      { key: "page", value: "1" },
      { key: "limit", value: "5" },
      { key: "minEarnings", value: "100000" },
    ],
    note: "Request nay phu hop de chung minh server-side filtering tren dataset lon.",
  },
  "GET /dashboard/drilldown/export": {
    name: "[Optional] Export drilldown CSV",
    query: [
      { key: "context", value: "earnings" },
      { key: "page", value: "1" },
      { key: "limit", value: "1000" },
      { key: "minEarnings", value: "100000" },
    ],
    note: "Chi nen test neu muon minh hoa export. Route nay tra ve CSV, khong can cho demo ngắn.",
  },
  "GET /alerts/triggered": {
    tests: [
      "const json = pm.response.json();",
      "const first = Array.isArray(json?.data) ? json.data[0] : null;",
      "if (first?.alert?._id) pm.environment.set('alertId', first.alert._id);",
      "if (first?.alert?.type) pm.environment.set('alertType', first.alert.type);",
    ],
    note: "Nen chay request nay truoc roi moi chay alert employees. No se luu alertId va alertType vao environment.",
  },
  "GET /alerts/{type}/employees": {
    query: [
      { key: "page", value: "1" },
      { key: "limit", value: "5" },
    ],
  },
  "GET /alerts": {
    tests: [
      "const json = pm.response.json();",
      "const first = Array.isArray(json?.data) ? json.data[0] : null;",
      "if (first?._id) pm.environment.set('alertConfigId', first._id);",
    ],
  },
  "POST /alerts": {
    name: "[Mutation] Create alert configuration rule",
    body: {
      name: "Vacation Watch {{$timestamp}}",
      type: "vacation",
      threshold: 25,
      description: "Created from Postman demo",
      isActive: true,
    },
  },
  "PUT /alerts/{id}": {
    name: "[Mutation] Update alert configuration rule",
    body: {
      name: "Vacation Watch Updated",
      type: "vacation",
      threshold: 26,
      description: "Adjusted from Postman demo",
      isActive: true,
    },
  },
  "DELETE /alerts/{id}": {
    name: "[Dangerous] Delete alert configuration rule",
    note: "Khong nen chay trong demo chinh vi request nay xoa cau hinh alert.",
  },
  "POST /alerts/{id}/acknowledge": {
    name: "[Mutation] Acknowledge alert with owner note",
    body: {
      note: "Owner assigned from Postman demo. Follow-up captured.",
    },
  },
  "GET /integrations/events": {
    query: [
      { key: "page", value: "1" },
      { key: "limit", value: "5" },
      { key: "status", value: "ALL" },
    ],
    tests: [
      "const json = pm.response.json();",
      "const first = Array.isArray(json?.data) ? json.data[0] : null;",
      "if (first?.id) pm.environment.set('integrationEventId', first.id);",
      "if (first?.entityId) pm.environment.set('syncEntityId', first.entityId);",
    ],
  },
  "GET /integrations/events/{id}/audit": {
    query: [
      { key: "page", value: "1" },
      { key: "limit", value: "10" },
    ],
  },
  "POST /integrations/events/retry/{id}": {
    name: "[Mutation] Retry one integration event",
    note: "Chi nen chay khi chu dong demo operator recovery.",
  },
  "POST /integrations/events/retry-dead": {
    name: "[Mutation] Re-queue dead integration events",
    note: "Khong can trong demo co ban.",
  },
  "POST /integrations/events/recover-stuck": {
    name: "[Mutation] Recover stale PROCESSING events",
    note: "Khong can trong demo co ban.",
  },
  "POST /integrations/events/replay": {
    name: "[Mutation] Replay integration events by filter",
    body: {
      status: "FAILED",
      entityType: "employee",
      fromDays: 30,
    },
    note: "Chi nen test khi muon minh hoa recovery path. Request nay co tac dong van hanh.",
  },
  "GET /sync/logs": {
    query: [
      { key: "page", value: "1" },
      { key: "limit", value: "10" },
      { key: "status", value: "ALL" },
    ],
  },
  "POST /sync/retry": {
    name: "[Mutation] Retry failed sync logs",
    note: "Khong can trong demo co ban. Request nay thu lai cac sync logs loi.",
  },
  "GET /sync/entity/{type}/{id}": {
    note: "Doi chieu trang thai eventual consistency cho mot entity cu the.",
  },
  "GET /contracts/openapi.json": {
    note: "Dung de doi chieu contract backend-owned. Swagger docs cung doc tu route nay.",
  },
};

const extraOperations = [
  {
    path: "/dashboard/drilldown/export",
    method: "get",
    tags: ["Dashboard"],
    summary: "Export drilldown CSV",
    description: "Download a CSV for the current drilldown filter set.",
    security: [{ XAccessToken: [] }],
  },
  {
    path: "/alerts/{id}",
    method: "put",
    tags: ["Alerts"],
    summary: "Update alert configuration rule",
    description: "Moderator/admin/super_admin only.",
    security: [{ XAccessToken: [] }],
  },
  {
    path: "/alerts/{id}",
    method: "delete",
    tags: ["Alerts"],
    summary: "Delete alert configuration rule",
    description: "Moderator/admin/super_admin only.",
    security: [{ XAccessToken: [] }],
  },
];

const demoSafeFlow = [
  "POST /auth/signin",
  "GET /auth/me",
  "GET /health/ready",
  "GET /employee",
  "GET /dashboard/executive-brief",
  "GET /dashboard/drilldown",
  "GET /alerts/triggered",
  "GET /alerts/{type}/employees",
  "GET /integrations/events/metrics",
  "GET /sync/status",
  "GET /contracts/openapi.json",
];

const jsonBodyHeaders = ["POST", "PUT", "PATCH"];

function getOperationKey(method, routePath) {
  return `${method.toUpperCase()} ${routePath}`;
}

function resolvePathTemplate(routePath) {
  return routePath.replace(/\{([^}]+)\}/g, (_, rawName) => {
    const mapped = pathVariableMap[routePath]?.[rawName] || rawName;
    return `{{${mapped}}}`;
  });
}

function splitPathSegments(routePath) {
  return routePath
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const match = segment.match(/^\{(.+)\}$/);
      if (!match) return segment;
      const rawName = match[1];
      const mapped = pathVariableMap[routePath]?.[rawName] || rawName;
      return `{{${mapped}}}`;
    });
}

function queryToRaw(query = []) {
  if (!Array.isArray(query) || query.length === 0) return "";
  return `?${query.map((item) => `${item.key}=${item.value}`).join("&")}`;
}

function buildRequestUrl(routePath, query = []) {
  const renderedPath = resolvePathTemplate(routePath);
  return {
    raw: `{{baseUrl}}${renderedPath}${queryToRaw(query)}`,
    host: ["{{baseUrl}}"],
    path: splitPathSegments(routePath),
    query: query.map((item) => ({
      key: item.key,
      value: item.value,
    })),
  };
}

function buildHeaders({ secured, method, hasBody }) {
  const headers = [
    {
      key: "x-request-id",
      value: "{{$guid}}",
      type: "text",
    },
  ];

  if (secured) {
    headers.push({
      key: "x-access-token",
      value: "{{token}}",
      type: "text",
    });
  }

  if (hasBody && jsonBodyHeaders.includes(method)) {
    headers.push({
      key: "Content-Type",
      value: "application/json",
      type: "text",
    });
  }

  return headers;
}

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function defaultExampleForKey(operationKey) {
  switch (operationKey) {
    case "POST /auth/signin":
      return {
        identifier: "{{adminEmail}}",
        password: "{{adminPassword}}",
      };
    case "POST /auth/signup":
      return {
        username: "postman_user_{{$timestamp}}",
        email: "postman+{{$timestamp}}@example.com",
        password: "Password123!",
      };
    case "POST /users":
      return {
        username: "console_user_{{$timestamp}}",
        email: "console+{{$timestamp}}@example.com",
        password: "Password123!",
        roles: ["user"],
      };
    case "POST /products":
    case "PUT /products/{productId}":
      return {
        name: "Demo Product",
        category: "Demo",
        price: 49.99,
        imgURL: "https://example.com/demo-product.png",
      };
    case "POST /employee":
    case "PUT /employee/{employeeLookup}":
      return {
        firstName: "Postman",
        lastName: "Demo",
        vacationDays: 12,
        paidToDate: 88000,
        payRate: 42.5,
      };
    case "POST /alerts":
    case "PUT /alerts/{id}":
      return {
        name: "Vacation Watch {{$timestamp}}",
        type: "vacation",
        threshold: 25,
        description: "Created from Postman demo",
        isActive: true,
      };
    case "POST /alerts/{id}/acknowledge":
      return {
        note: "Owner assigned from Postman demo. Follow-up captured.",
      };
    case "POST /integrations/events/replay":
      return {
        status: "FAILED",
        entityType: "employee",
        fromDays: 30,
      };
    default:
      return null;
  }
}

function operationDescription(operation, operationKey) {
  const override = operationOverrides[operationKey];
  const lines = [];
  if (operation.summary) lines.push(operation.summary);
  if (operation.description) lines.push(operation.description);
  if (override?.note) lines.push(`Demo note: ${override.note}`);

  if (operationKey.startsWith("DELETE ")) {
    lines.push("Warning: request nay xoa du lieu. Khong nen chay trong demo chinh.");
  } else if (operationKey.startsWith("POST ") || operationKey.startsWith("PUT ")) {
    if (!operationKey.startsWith("POST /auth/signin") && !operationKey.startsWith("POST /auth/logout")) {
      lines.push("Warning: request nay co tac dong thay doi du lieu hoac trang thai van hanh.");
    }
  }

  return lines.filter(Boolean).join("\n\n");
}

function buildRequestItem(operation, routePath, method) {
  const operationKey = getOperationKey(method, routePath);
  const override = operationOverrides[operationKey] || {};
  const query = override.query || [];
  const body = override.body ?? defaultExampleForKey(operationKey);
  const hasBody = body !== null && body !== undefined;
  const secured = Array.isArray(operation.security) && operation.security.length > 0;

  const item = {
    name: override.name || operation.summary || `${method.toUpperCase()} ${routePath}`,
    request: {
      method: method.toUpperCase(),
      header: buildHeaders({ secured, method: method.toUpperCase(), hasBody }),
      description: operationDescription(operation, operationKey),
      url: buildRequestUrl(routePath, query),
    },
    response: [],
  };

  if (hasBody) {
    item.request.body = {
      mode: "raw",
      raw: prettyJson(body),
      options: {
        raw: {
          language: "json",
        },
      },
    };
  }

  if (override.tests?.length) {
    item.event = [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: override.tests,
        },
      },
    ];
  }

  return item;
}

function buildDemoSafeFolder(operationsByKey) {
  return {
    name: "0. Demo Safe Flow",
    description: "Tap request an toan cho demo nhanh. Bat dau bang signin de lay token, sau do di theo thu tu request ben duoi.",
    item: demoSafeFlow
      .map((operationKey) => operationsByKey.get(operationKey))
      .filter(Boolean),
  };
}

function buildAllOperations() {
  const operations = [];

  for (const [routePath, methods] of Object.entries(openApi.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      operations.push({
        routePath,
        method,
        operation,
      });
    }
  }

  for (const extra of extraOperations) {
    operations.push({
      routePath: extra.path,
      method: extra.method,
      operation: extra,
    });
  }

  return operations;
}

function sortOperations(a, b) {
  const tagA = a.operation.tags?.[0] || "ZZZ";
  const tagB = b.operation.tags?.[0] || "ZZZ";
  const tagIndexA = tagOrder.indexOf(tagA);
  const tagIndexB = tagOrder.indexOf(tagB);

  if (tagIndexA !== tagIndexB) return tagIndexA - tagIndexB;

  const methodOrder = ["get", "post", "put", "delete", "patch"];
  const methodIndexA = methodOrder.indexOf(a.method);
  const methodIndexB = methodOrder.indexOf(b.method);

  if (methodIndexA !== methodIndexB) return methodIndexA - methodIndexB;
  return a.routePath.localeCompare(b.routePath);
}

function buildCollection() {
  const operations = buildAllOperations().sort(sortOperations);
  const folders = new Map(tagOrder.map((tag) => [tag, []]));
  const operationsByKey = new Map();

  for (const entry of operations) {
    const tag = entry.operation.tags?.[0] || "Contracts";
    const requestItem = buildRequestItem(entry.operation, entry.routePath, entry.method);
    folders.get(tag)?.push(requestItem);
    operationsByKey.set(getOperationKey(entry.method, entry.routePath), requestItem);
  }

  return {
    info: {
      _postman_id: randomUUID(),
      name: "SIP_CS Backend Demo Collection",
      description:
        "Demo-ready Postman collection for the full SIP_CS backend. Includes a safe smoke-test flow plus grouped routes for Auth, Dashboard, Alerts, Integrations, Sync, and admin tooling.",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      {
        key: "baseUrl",
        value: "http://127.0.0.1:4000/api",
      },
    ],
    item: [
      buildDemoSafeFolder(operationsByKey),
      ...tagOrder.map((tag) => ({
        name: tagLabels[tag],
        item: folders.get(tag) || [],
      })),
    ],
  };
}

function buildEnvironment() {
  return {
    id: randomUUID(),
    name: "SIP_CS Local Demo",
    values: [
      { key: "baseUrl", value: "http://127.0.0.1:4000/api", type: "default", enabled: true },
      { key: "token", value: "", type: "secret", enabled: true },
      { key: "adminEmail", value: "admin@localhost", type: "default", enabled: true },
      { key: "adminPassword", value: "admin_dev", type: "secret", enabled: true },
      { key: "currentUserId", value: "", type: "default", enabled: true },
      { key: "currentUserRole", value: "", type: "default", enabled: true },
      { key: "userId", value: "", type: "default", enabled: true },
      { key: "productId", value: "", type: "default", enabled: true },
      { key: "productName", value: "Demo", type: "default", enabled: true },
      { key: "employeeLookup", value: "EMP000001", type: "default", enabled: true },
      { key: "alertType", value: "vacation", type: "default", enabled: true },
      { key: "alertId", value: "", type: "default", enabled: true },
      { key: "alertConfigId", value: "", type: "default", enabled: true },
      { key: "integrationEventId", value: "1", type: "default", enabled: true },
      { key: "syncEntityType", value: "employee", type: "default", enabled: true },
      { key: "syncEntityId", value: "EMP000001", type: "default", enabled: true },
    ],
    _postman_variable_scope: "environment",
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: "OpenAI Codex",
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

writeJson(path.join(repoRoot, "sip_cs_postman_collection.json"), buildCollection());
writeJson(path.join(repoRoot, "sip_cs_demo_local.postman_environment.json"), buildEnvironment());

console.log("Generated Postman collection and environment.");
