import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("runtime hardening contracts", () => {
  test("app uses env-driven CORS allowlist", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "..", "apps", "baseApp.js"), "utf-8");

    expect(source).toContain('import { CORS_ORIGINS } from "../config.js"');
    expect(source).toContain("CORS_ORIGINS.includes(origin)");
  });

  test("mysql readiness reports migrationRequired=false once schema is ready", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "..", "mysqlDatabase.js"), "utf-8");

    expect(source).toContain("migrationRequired: false");
    expect(source).toContain("MySQL migration '${migration.id}' failed");
    expect(source).toContain("ACTIVE_SQL_MIGRATION_IDS");
    expect(source).toContain("INTEGRATION_CORRELATION_TRACE_MIGRATION_ID");
    expect(source).toContain("SYNC_LOG_IDEMPOTENCY_MIGRATION_ID");
    expect(source).toContain("uniq_sync_log_entity_action_correlation");
    expect(source).toContain("await runBootstrapMigration();");
  });

  test("startup registers graceful shutdown hooks for workers and server", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "..", "runtime", "serviceRuntime.js"), "utf-8");
    const databaseSource = fs.readFileSync(path.resolve(__dirname, "..", "database.js"), "utf-8");
    const bootstrapStep = source.indexOf("await initializeSystems();");
    const startServerStep = source.indexOf("server = await startHttpServer();");

    expect(source).toContain('process.once("SIGINT"');
    expect(source).toContain('process.once("SIGTERM"');
    expect(source).toContain("stopIntegrationEventWorker()");
    expect(source).toContain("stopDashboardAggregationWorker()");
    expect(source).toContain("await stopBackgroundWorkers();");
    expect(source).toContain('import { connectMongo } from "../database.js"');
    expect(source).toContain('import { initializeAuthSeed } from "../libs/initialSetup.js"');
    expect(source).toContain("await connectMongo();");
    expect(source).toContain("await initializeAuthSeed();");
    expect(source).toContain("const bootstrap = async () =>");
    expect(source).toContain("const stopBackgroundWorkers = async () =>");
    expect(source).toContain("Promise.allSettled(stopTasks)");
    expect(source).toContain("const closeHttpServer = async () =>");
    expect(source).toContain("if (requireMySQL) {");
    expect(source).toContain("MySQL connection failed. This service requires the payroll database.");
    expect(source).toContain("server.closeIdleConnections?.()");
    expect(source).toContain("server.closeAllConnections?.()");
    expect(source).toContain("SERVER_SHUTDOWN_TIMEOUT_MS");
    expect(bootstrapStep).toBeGreaterThanOrEqual(0);
    expect(startServerStep).toBeGreaterThanOrEqual(0);
    expect(bootstrapStep).toBeLessThan(startServerStep);
    expect(databaseSource).toContain("scheduleMongoReconnect");
    expect(databaseSource).toContain('mongoose.connection.on("disconnected"');
    expect(databaseSource).toContain('mongoose.connection.on("error"');
    expect(databaseSource).toContain("connectMongo({ background: true })");
    expect(databaseSource).toContain("clearReconnectTimer()");
  });

  test("dashboard aggregation worker stops active child processes", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "workers", "dashboardAggregationWorker.js"),
      "utf-8",
    );

    expect(source).toContain("let activeChild = null;");
    expect(source).toContain("warmDashboardAggregationOnStartup");
    expect(source).toContain("Dashboard summaries are stale or missing; running startup aggregation.");
    expect(source).toContain('child.kill("SIGTERM")');
    expect(source).toContain('child.kill("SIGKILL")');
    expect(source).toContain("await activeRunPromise");
    expect(source).toContain("intervalId.unref?.()");
  });

  test("integration event worker waits briefly for an active iteration during shutdown", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "workers", "integrationEventWorker.js"),
      "utf-8",
    );

    expect(source).toContain("let activeRunPromise = null;");
    expect(source).toContain("intervalId.unref?.()");
    expect(source).toContain("Promise.race([");
    expect(source).toContain("OUTBOX_STOP_TIMEOUT_MS");
  });

  test("user comparePassword fails closed and token schema is structured", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "..", "models", "User.js"), "utf-8");

    expect(source).toContain("Password is missing, cannot compare.");
    expect(source).toContain("return false;");
    expect(source).toContain("const userTokenSchema");
    expect(source).toContain("sessionId");
  });

  test("auth fallback stays limited to development-like environments and explicit demo mode", () => {
    const guardSource = fs.readFileSync(path.resolve(__dirname, "..", "middlewares", "authJwt.js"), "utf-8");
    const authSource = fs.readFileSync(path.resolve(__dirname, "..", "controllers", "auth.controller.js"), "utf-8");

    expect(guardSource).toContain('["development", "test"].includes(process.env.NODE_ENV || "development")');
    expect(authSource).toContain('["development", "test"].includes(process.env.NODE_ENV || "development")');
  });

  test("auth controller and auth guard share session-token lifecycle helpers", () => {
    const guardSource = fs.readFileSync(path.resolve(__dirname, "..", "middlewares", "authJwt.js"), "utf-8");
    const authSource = fs.readFileSync(path.resolve(__dirname, "..", "controllers", "auth.controller.js"), "utf-8");

    expect(guardSource).toContain('from "../utils/authSessionTokens.js"');
    expect(authSource).toContain('from "../utils/authSessionTokens.js"');
  });

  test("auth seed requires an explicit admin password outside development/test", () => {
    const configSource = fs.readFileSync(path.resolve(__dirname, "..", "config.js"), "utf-8");
    const seedSource = fs.readFileSync(path.resolve(__dirname, "..", "libs", "initialSetup.js"), "utf-8");

    expect(configSource).toContain('process.env.ADMIN_PASSWORD || (isDevelopmentLike() ? "admin_dev" : undefined)');
    expect(seedSource).toContain("ADMIN_PASSWORD is required when auth seed is enabled outside development/test.");
    expect(seedSource).not.toContain("initializeAuthSeed().catch(");
  });

  test("production auth config requires a distinct refresh secret and secure cookies", () => {
    const configSource = fs.readFileSync(path.resolve(__dirname, "..", "config.js"), "utf-8");

    expect(configSource).toContain('invalidSecuritySettings.push("REFRESH_SECRET")');
    expect(configSource).toContain('invalidSecuritySettings.push("REFRESH_SECRET must differ from SECRET")');
    expect(configSource).toContain('invalidSecuritySettings.push("AUTH_COOKIE_SECURE must be true")');
  });

  test(".env.example documents runtime compatibility and security env vars", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "..", "..", ".env.example"), "utf-8");

    expect(source).toContain("CORS_ORIGINS=");
    expect(source).toContain("AUTH_MAX_PERSISTED_SESSIONS=");
    expect(source).toContain("DASHBOARD_CACHE_TTL_MS=");
    expect(source).toContain("DASHBOARD_CACHE_MAX_ENTRIES=");
    expect(source).toContain("DASHBOARD_CACHE_SWEEP_INTERVAL_MS=");
    expect(source).toContain("DRILLDOWN_EXPORT_BATCH_SIZE=");
    expect(source).toContain("DRILLDOWN_FULL_SUMMARY_MAX_COUNT=");
    expect(source).toContain("OUTBOX_STOP_TIMEOUT_MS=");
    expect(source).toContain("SYNC_RETRY_BATCH_LIMIT=");
    expect(source).toContain("DASHBOARD_AGGREGATION_STOP_TIMEOUT_MS=");
    expect(source).toContain("DASHBOARD_AGGREGATION_AWAIT_ON_START=");
    expect(source).toContain("DASHBOARD_FRESHNESS_THRESHOLD_MINUTES=");
    expect(source).toContain("CASE3_PREPARE_DASHBOARD_DEMO=");
    expect(source).toContain("DASHBOARD_DEMO_ALERT_NOTE=");
    expect(source).toContain("SERVER_SHUTDOWN_TIMEOUT_MS=");
    expect(source).toContain("AGG_SKIP_EMPLOYEE_SNAPSHOT=");
    expect(source).toContain("SEED_PROFILE=");
    expect(source).toContain("SOURCE_MONGODB_URI=");
    expect(source).toContain("ALLOW_STATELESS_JWT_FALLBACK=0");
    expect(source).toContain("REFRESH_SECRET should be different from SECRET");
  });

  test("drilldown export uses a runtime batch-size knob instead of an inline magic number", () => {
    const configSource = fs.readFileSync(path.resolve(__dirname, "..", "config.js"), "utf-8");
    const controllerSource = fs.readFileSync(path.resolve(__dirname, "..", "controllers", "dashboard.controller.js"), "utf-8");

    expect(configSource).toContain("DRILLDOWN_EXPORT_BATCH_SIZE");
    expect(configSource).toContain("DRILLDOWN_FULL_SUMMARY_MAX_COUNT");
    expect(controllerSource).toContain('from "../config.js"');
    expect(controllerSource).toContain("DRILLDOWN_EXPORT_BATCH_SIZE");
    expect(controllerSource).toContain("DRILLDOWN_FULL_SUMMARY_MAX_COUNT");
    expect(controllerSource).toContain("const exportBatchSize = DRILLDOWN_EXPORT_BATCH_SIZE;");
    expect(controllerSource).toContain("const buildEarningsLookupForExportBatch = async");
    expect(controllerSource).toContain("await buildEarningsLookupForExportBatch({");
  });

  test("manual sync retry limit is configurable instead of hardcoded", () => {
    const configSource = fs.readFileSync(path.resolve(__dirname, "..", "config.js"), "utf-8");
    const syncServiceSource = fs.readFileSync(path.resolve(__dirname, "..", "services", "syncService.js"), "utf-8");

    expect(configSource).toContain("SYNC_RETRY_BATCH_LIMIT");
    expect(syncServiceSource).toContain('from "../config.js"');
    expect(syncServiceSource).toContain("SYNC_RETRY_BATCH_LIMIT");
    expect(syncServiceSource).not.toContain("limit: 100");
  });

  test("auth session token helpers use a runtime session cap instead of a hardcoded limit", () => {
    const configSource = fs.readFileSync(path.resolve(__dirname, "..", "config.js"), "utf-8");
    const helperSource = fs.readFileSync(path.resolve(__dirname, "..", "utils", "authSessionTokens.js"), "utf-8");

    expect(configSource).toContain("AUTH_MAX_PERSISTED_SESSIONS");
    expect(helperSource).toContain('from "../config.js"');
    expect(helperSource).toContain("AUTH_MAX_PERSISTED_SESSIONS");
    expect(helperSource).not.toContain("const MAX_PERSISTED_SESSIONS = 5;");
  });
});
