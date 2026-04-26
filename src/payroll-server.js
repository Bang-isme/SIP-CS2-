import { PAYROLL_PORT } from "./config.js";
import { createPayrollApp } from "./apps/payrollApp.js";
import { createServiceRuntime } from "./runtime/serviceRuntime.js";

const runtime = createServiceRuntime({
  serviceKey: "payroll",
  serviceName: "Payroll Service",
  port: PAYROLL_PORT,
  createApp: createPayrollApp,
  requireMongo: false,
  requireMySQL: true,
  initAuthSeed: false,
});

runtime.bootstrap().catch((error) => {
  console.error("[Startup:payroll] Failed to initialize service:", error.message);
  process.exit(1);
});

export default runtime.app;
