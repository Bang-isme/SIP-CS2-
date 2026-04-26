import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createHealthHandlers } from "../controllers/health.controller.js";
import { createHealthRouter } from "../routes/health.routes.js";
import { createPayrollRouter } from "../routes/payroll.routes.js";
import { createBaseServiceApp } from "./baseApp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const payrollConsoleDir = path.resolve(__dirname, "../../public/payroll-console");

export const createPayrollApp = () => {
  const healthHandlers = createHealthHandlers({
    serviceKey: "payroll",
    serviceName: "Payroll Service",
    dependencies: ["mysql"],
    includeIntegrationHealth: false,
  });

  return createBaseServiceApp({
    serviceInfo: {
      key: "payroll",
      name: "Payroll Service",
      description: "Read-only payroll runtime with MySQL evidence.",
      responsibilities: [
        "Payroll snapshots",
        "Sync evidence",
        "Own proof console",
      ],
      routePrefixes: [
        "/api/payroll",
        "/api/health",
      ],
      authMode: "stateless",
      ui: {
        rootPath: "/",
        kind: "static_console",
      },
    },
    registerApiRoutes(app) {
      app.use("/api/payroll", createPayrollRouter({
        healthHandler: healthHandlers.getHealthSummary,
      }));
      app.use("/api/health", createHealthRouter({
        serviceKey: "payroll",
        serviceName: "Payroll Service",
        dependencies: ["mysql"],
        includeIntegrationHealth: false,
      }));
    },
    registerNonApiRoutes(app) {
      app.use(express.static(payrollConsoleDir));
    },
  });
};

export default createPayrollApp;
