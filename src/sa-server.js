import { SA_PORT } from "./config.js";
import { createSaApp } from "./apps/saApp.js";
import { createServiceRuntime } from "./runtime/serviceRuntime.js";

const runtime = createServiceRuntime({
  serviceKey: "sa",
  serviceName: "SA / HR Service",
  port: SA_PORT,
  createApp: createSaApp,
  requireMongo: true,
  requireMySQL: false,
  initAuthSeed: true,
  initializeIntegrations: true,
  startOutboxWorker: true,
});

runtime.bootstrap().catch((error) => {
  console.error("[Startup:sa] Failed to initialize service:", error.message);
  process.exit(1);
});

export default runtime.app;
