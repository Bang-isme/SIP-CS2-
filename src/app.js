import productRoutes from "./routes/products.routes.js";
import usersRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import contractsRoutes from "./routes/contracts.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import alertsRoutes from "./routes/alerts.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import integrationRoutes from "./routes/integration.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createPayrollRouter } from "./routes/payroll.routes.js";
import { createHealthHandlers } from "./controllers/health.controller.js";
import { createBaseServiceApp } from "./apps/baseApp.js";

const combinedHealthOptions = {
  serviceKey: "combined",
  serviceName: "SIP_CS Compatibility App",
  dependencies: ["mongodb", "mysql"],
  includeIntegrationHealth: true,
};

const combinedHealthHandlers = createHealthHandlers(combinedHealthOptions);

const app = createBaseServiceApp({
  serviceInfo: {
    key: "combined",
    name: "SIP_CS Compatibility App",
    description: "Combined modular-monolith test harness that keeps all repo routes available in one Express instance.",
    responsibilities: [
      "Preserve existing combined app tests",
      "Expose all repo APIs in one place for legacy automation",
      "Coexist with separate SA, Payroll, and Dashboard runtime entrypoints",
    ],
    routePrefixes: [
      "/api/contracts",
      "/api/products",
      "/api/users",
      "/api/auth",
      "/api/employee",
      "/api/dashboard",
      "/api/alerts",
      "/api/sync",
      "/api/integrations",
      "/api/payroll",
      "/api/health",
    ],
  },
  registerApiRoutes(nextApp) {
    nextApp.use("/api/contracts", contractsRoutes);
    nextApp.use("/api/products", productRoutes);
    nextApp.use("/api/users", usersRoutes);
    nextApp.use("/api/auth", authRoutes);
    nextApp.use("/api/employee", employeeRoutes);
    nextApp.use("/api/dashboard", dashboardRoutes);
    nextApp.use("/api/alerts", alertsRoutes);
    nextApp.use("/api/sync", syncRoutes);
    nextApp.use("/api/integrations", integrationRoutes);
    nextApp.use("/api/payroll", createPayrollRouter({
      healthHandler: combinedHealthHandlers.getHealthSummary,
    }));
    nextApp.use("/api/health", createHealthRouter(combinedHealthOptions));
  },
});

export default app;
