import { DASHBOARD_AGGREGATION_AWAIT_ON_START, DASHBOARD_PORT } from "./config.js";
import { createDashboardApp } from "./apps/dashboardApp.js";
import { createServiceRuntime } from "./runtime/serviceRuntime.js";

const runtime = createServiceRuntime({
  serviceKey: "dashboard",
  serviceName: "Dashboard Service",
  port: DASHBOARD_PORT,
  createApp: createDashboardApp,
  requireMongo: true,
  requireMySQL: true,
  initAuthSeed: false,
  startAggregationWorker: true,
  awaitAggregationOnStart: DASHBOARD_AGGREGATION_AWAIT_ON_START,
});

runtime.bootstrap().catch((error) => {
  console.error("[Startup:dashboard] Failed to initialize service:", error.message);
  process.exit(1);
});

export default runtime.app;
