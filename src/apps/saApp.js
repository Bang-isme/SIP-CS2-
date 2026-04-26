import contractsRoutes from "../routes/contracts.routes.js";
import usersRoutes from "../routes/user.routes.js";
import authRoutes from "../routes/auth.routes.js";
import employeeRoutes from "../routes/employee.routes.js";
import syncRoutes from "../routes/sync.routes.js";
import integrationRoutes from "../routes/integration.routes.js";
import { createHealthRouter } from "../routes/health.routes.js";
import { createBaseServiceApp } from "./baseApp.js";
import { DASHBOARD_PORT, PAYROLL_PORT } from "../config.js";

export const createSaApp = () => createBaseServiceApp({
  serviceInfo: {
    key: "sa",
    name: "SA / HR Service",
    description: "Auth, employee writes, and queue control.",
    responsibilities: [
      "JWT sessions",
      "Employee source in MongoDB",
      "Retry and replay control",
    ],
    routePrefixes: [
      "/api/auth",
      "/api/users",
      "/api/employee",
      "/api/sync",
      "/api/integrations",
      "/api/contracts",
      "/api/health",
    ],
    ui: {
      rootPath: "/",
      kind: "service_landing",
      eyebrow: "Source system",
      statusChips: [
        "MongoDB source",
        "JWT authority",
        "Queue owner",
      ],
      signals: [
        {
          label: "Source system",
          value: "MongoDB",
          detail: "Writes and outbox events start here.",
        },
        {
          label: "Session",
          value: "JWT + refresh",
          detail: "Dashboard and Payroll reuse SA sign-in.",
        },
        {
          label: "Operations",
          value: "Queue owner",
          detail: "Retries and replays start here.",
        },
      ],
      launchEyebrow: "Open",
      demoPath: {
        eyebrow: "Path",
        title: "Use the right runtime",
        steps: [
          "Dashboard for reporting.",
          "Payroll for proof.",
          "Queue view for recovery.",
        ],
      },
      launchLinks: [
        {
          label: "Dashboard login",
          port: DASHBOARD_PORT,
          path: "/login",
          description: "Reporting surface.",
        },
        {
          label: "Payroll console",
          port: PAYROLL_PORT,
          path: "/",
          search: "?demoLogin=1",
          description: "Payroll evidence.",
        },
        {
          label: "Integration queue",
          port: DASHBOARD_PORT,
          path: "/dashboard/integration",
          description: "Retry and replay view.",
        },
      ],
    },
  },
  registerApiRoutes(app) {
    app.use("/api/contracts", contractsRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/users", usersRoutes);
    app.use("/api/employee", employeeRoutes);
    app.use("/api/sync", syncRoutes);
    app.use("/api/integrations", integrationRoutes);
    app.use("/api/health", createHealthRouter({
      serviceKey: "sa",
      serviceName: "SA / HR Service",
      dependencies: ["mongodb"],
      includeIntegrationHealth: true,
    }));
  },
});

export default createSaApp;
