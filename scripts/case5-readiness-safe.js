/**
 * Case 5 Readiness Safe Snapshot (Non-destructive)
 * - Probes local service health endpoints if they are running
 * - Checks Mongo/MySQL connectivity and MySQL migration readiness
 * - Captures security posture flags without writing or exposing secrets
 *
 * Usage: node scripts/case5-readiness-safe.js
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import connectMongo from "../src/database.js";
import sequelize, {
  assertMySQLReadiness,
  connectMySQL,
  getMissingActiveMigrations,
  getMissingRequiredTables,
  listAppliedMigrations,
} from "../src/mysqlDatabase.js";
import {
  ACTIVE_INTEGRATIONS,
  AUTH_COOKIE_SAME_SITE,
  AUTH_COOKIE_SECURE,
  DASHBOARD_PORT,
  INTERNAL_SERVICE_SECRET,
  IS_DEFAULT_DEV_ADMIN_PASSWORD,
  NODE_ENV,
  OUTBOX_ENABLED,
  PAYROLL_PORT,
  REFRESH_SECRET,
  SA_PORT,
  SECRET,
  SERVER_SHUTDOWN_TIMEOUT_MS,
} from "../src/config.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveTimestampSlug = (date) => date.toISOString().replace(/[:.]/g, "-");

const withTimeout = async (promiseFactory, timeoutMs = 4000) => {
  const signal = globalThis.AbortSignal?.timeout?.(timeoutMs);
  return promiseFactory(signal);
};

const fetchJson = async (url) => {
  const response = await withTimeout((signal) => fetch(url, { signal }));
  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
};

const probeService = async ({ name, port }) => {
  const liveUrl = `http://127.0.0.1:${port}/api/health/live`;
  const readyUrl = `http://127.0.0.1:${port}/api/health/ready`;

  try {
    const [live, ready] = await Promise.all([
      fetchJson(liveUrl),
      fetchJson(readyUrl),
    ]);

    return {
      name,
      port,
      liveUrl,
      readyUrl,
      reachable: live.ok || ready.ok,
      liveStatus: live.payload?.status || (live.ok ? "ok" : "unreachable"),
      readyStatus: ready.payload?.status || (ready.ok ? "ok" : "unreachable"),
      service: live.payload?.service || ready.payload?.service || null,
    };
  } catch (error) {
    return {
      name,
      port,
      liveUrl,
      readyUrl,
      reachable: false,
      liveStatus: "unreachable",
      readyStatus: "unreachable",
      error: error.message,
    };
  }
};

const buildSecurityPosture = () => ({
  nodeEnv: NODE_ENV,
  authCookieSecure: AUTH_COOKIE_SECURE,
  authCookieSameSite: AUTH_COOKIE_SAME_SITE,
  refreshSecretDistinctFromAccessSecret: Boolean(REFRESH_SECRET && SECRET && REFRESH_SECRET !== SECRET),
  internalServiceSecretDistinctFromAccessSecret: Boolean(
    INTERNAL_SERVICE_SECRET && SECRET && INTERNAL_SERVICE_SECRET !== SECRET,
  ),
  usingDefaultDevAdminPassword: IS_DEFAULT_DEV_ADMIN_PASSWORD,
  activeIntegrations: ACTIVE_INTEGRATIONS,
  outboxEnabled: OUTBOX_ENABLED,
  gracefulShutdownTimeoutMs: SERVER_SHUTDOWN_TIMEOUT_MS,
});

const collectMongoStatus = async () => {
  try {
    const connection = await connectMongo();
    return {
      connected: true,
      database: connection.name,
      host: connection.host,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
};

const collectMySqlStatus = async () => {
  try {
    const connected = await connectMySQL();
    if (!connected) {
      return {
        connected: false,
        schemaReady: false,
        missingActiveMigrations: [],
        missingRequiredTables: [],
        appliedMigrationCount: 0,
      };
    }

    const [readiness, missingActiveMigrations, missingRequiredTables, appliedMigrations] = await Promise.all([
      assertMySQLReadiness().then(() => ({ ready: true })).catch((error) => ({ ready: false, error: error.message })),
      getMissingActiveMigrations().catch(() => []),
      getMissingRequiredTables().catch(() => []),
      listAppliedMigrations().catch(() => []),
    ]);

    return {
      connected: true,
      schemaReady: readiness.ready,
      readinessError: readiness.error || null,
      missingActiveMigrations,
      missingRequiredTables,
      appliedMigrationCount: appliedMigrations.length,
    };
  } catch (error) {
    return {
      connected: false,
      schemaReady: false,
      error: error.message,
      missingActiveMigrations: [],
      missingRequiredTables: [],
      appliedMigrationCount: 0,
    };
  }
};

const main = async () => {
  const startedAt = new Date();
  const securityPosture = buildSecurityPosture();

  try {
    const [sa, payroll, dashboard, mongo, mysql] = await Promise.all([
      probeService({ name: "SA / HR Service", port: SA_PORT }),
      probeService({ name: "Payroll Service", port: PAYROLL_PORT }),
      probeService({ name: "Dashboard Service", port: DASHBOARD_PORT }),
      collectMongoStatus(),
      collectMySqlStatus(),
    ]);

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    const report = {
      type: "CASE5_READINESS_SAFE",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      note: "Non-destructive readiness snapshot. This is evidence for service boundaries, security posture, and schema readiness; not a real failover drill.",
      securityPosture,
      services: {
        sa,
        payroll,
        dashboard,
      },
      databases: {
        mongo,
        mysql,
      },
      safeClaims: [
        "Split runtime is observable through separate health endpoints and ports.",
        "Security posture checks are partially automated through config validation and this readiness snapshot.",
        "This report does not prove real cross-site failover, HA routing, or production network segmentation.",
      ],
    };

    const reportDir = path.resolve(__dirname, "..", "Memory", "DR");
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(
      reportDir,
      `case5_readiness_safe_${resolveTimestampSlug(startedAt)}.json`,
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

    console.log("[CASE5] Safe readiness snapshot completed.");
    console.log("[CASE5] Report saved:", reportPath);
  } catch (error) {
    console.error("[CASE5] Safe readiness snapshot failed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
};

main();
