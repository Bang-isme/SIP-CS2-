import { config } from "dotenv";
config();

const getRuntimeNodeEnv = () => process.env.NODE_ENV || "development";
const isDevelopmentLike = () => ["development", "test"].includes(getRuntimeNodeEnv());
const parsePort = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ===========================================
// Environment Validation
// ===========================================
const requiredInProduction = ['SECRET', 'ADMIN_PASSWORD', 'MYSQL_PASSWORD', 'INTERNAL_SERVICE_SECRET'];
const isProduction = getRuntimeNodeEnv() === 'production';

if (isProduction) {
  const missing = requiredInProduction.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// ===========================================
// MongoDB Configuration
// ===========================================
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/apicompany";

// ===========================================
// Server Configuration
// ===========================================
export const SA_PORT = parsePort(process.env.SA_PORT, 4000);
export const PAYROLL_PORT = parsePort(process.env.PAYROLL_PORT, 4100);
export const DASHBOARD_PORT = parsePort(process.env.DASHBOARD_PORT, 4200);
export const PORT = parsePort(process.env.PORT, SA_PORT);
export const NODE_ENV = getRuntimeNodeEnv();
export const SERVER_SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SERVER_SHUTDOWN_TIMEOUT_MS, 10) || 5000;

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  `http://localhost:${SA_PORT}`,
  `http://localhost:${PAYROLL_PORT}`,
  `http://localhost:${DASHBOARD_PORT}`,
  `http://127.0.0.1:${SA_PORT}`,
  `http://127.0.0.1:${PAYROLL_PORT}`,
  `http://127.0.0.1:${DASHBOARD_PORT}`,
];

// ===========================================
// Security Configuration
// WARNING: Fallbacks only work in development!
// ===========================================
export const SECRET = process.env.SECRET || (isProduction ? undefined : "dev_secret_change_me");
export const REFRESH_SECRET = process.env.REFRESH_SECRET || (isProduction ? undefined : "dev_refresh_secret_change_me");
export const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || (isProduction ? undefined : "dev_internal_service_secret_change_me");
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "24h";
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";
export const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token";
export const AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE
  ? process.env.AUTH_COOKIE_SECURE === "true"
  : isProduction;
export const AUTH_COOKIE_SAME_SITE = process.env.AUTH_COOKIE_SAME_SITE || (isProduction ? "strict" : "lax");
export const AUTH_MAX_PERSISTED_SESSIONS = Math.max(
  1,
  parseInt(process.env.AUTH_MAX_PERSISTED_SESSIONS, 10) || 5,
);

if (isProduction) {
  const invalidSecuritySettings = [];
  if (!process.env.REFRESH_SECRET) {
    invalidSecuritySettings.push("REFRESH_SECRET");
  }
  if (REFRESH_SECRET === SECRET) {
    invalidSecuritySettings.push("REFRESH_SECRET must differ from SECRET");
  }
  if (!process.env.INTERNAL_SERVICE_SECRET) {
    invalidSecuritySettings.push("INTERNAL_SERVICE_SECRET");
  }
  if (INTERNAL_SERVICE_SECRET === SECRET) {
    invalidSecuritySettings.push("INTERNAL_SERVICE_SECRET should differ from SECRET");
  }
  if (!AUTH_COOKIE_SECURE) {
    invalidSecuritySettings.push("AUTH_COOKIE_SECURE must be true");
  }
  if (invalidSecuritySettings.length > 0) {
    throw new Error(`Invalid production auth configuration: ${invalidSecuritySettings.join(", ")}`);
  }
}

// ===========================================
// Admin Account (Initial Setup)
// ===========================================
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isDevelopmentLike() ? "admin_dev" : undefined);
export const IS_DEFAULT_DEV_ADMIN_PASSWORD = isDevelopmentLike() && !process.env.ADMIN_PASSWORD && ADMIN_PASSWORD === "admin_dev";
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || DEFAULT_CORS_ORIGINS.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
export const ACTIVE_INTEGRATIONS = (process.env.ACTIVE_INTEGRATIONS || "payroll")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
export const SA_PUBLIC_API_BASE_URL = process.env.SA_PUBLIC_API_BASE_URL || "";
export const PAYROLL_INTERNAL_API_BASE_URL = process.env.PAYROLL_INTERNAL_API_BASE_URL
  || `http://127.0.0.1:${PAYROLL_PORT}/api/payroll/internal`;

// ===========================================
// MySQL Configuration (Payroll Database)
// ===========================================
export const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
export const MYSQL_PORT = process.env.MYSQL_PORT || 3306;
export const MYSQL_USER = process.env.MYSQL_USER || "root";
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "payroll_db";
export const MYSQL_AUTO_SYNC = process.env.MYSQL_AUTO_SYNC
  ? process.env.MYSQL_AUTO_SYNC === "true"
  : !isProduction;
export const MYSQL_REQUIRE_MIGRATIONS = process.env.MYSQL_REQUIRE_MIGRATIONS
  ? process.env.MYSQL_REQUIRE_MIGRATIONS === "true"
  : isProduction;

// ===========================================
// Outbox / Integration Worker (Case Study 4)
// ===========================================
export const OUTBOX_ENABLED = process.env.OUTBOX_ENABLED
  ? process.env.OUTBOX_ENABLED === "true"
  : true;
export const OUTBOX_POLL_INTERVAL_MS = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS, 10) || 5000;
export const OUTBOX_BATCH_SIZE = parseInt(process.env.OUTBOX_BATCH_SIZE, 10) || 50;
export const OUTBOX_MAX_ATTEMPTS = parseInt(process.env.OUTBOX_MAX_ATTEMPTS, 10) || 5;
export const OUTBOX_PROCESSING_TIMEOUT_MS = parseInt(process.env.OUTBOX_PROCESSING_TIMEOUT_MS, 10) || (15 * 60 * 1000);
export const OUTBOX_STOP_TIMEOUT_MS = parseInt(process.env.OUTBOX_STOP_TIMEOUT_MS, 10) || 5000;
export const SYNC_RETRY_BATCH_LIMIT = Math.max(
  1,
  parseInt(process.env.SYNC_RETRY_BATCH_LIMIT, 10) || 100,
);
export const DRILLDOWN_EXPORT_BATCH_SIZE = Math.max(
  500,
  parseInt(process.env.DRILLDOWN_EXPORT_BATCH_SIZE, 10) || 5000,
);
export const DRILLDOWN_FULL_SUMMARY_MAX_COUNT = Math.max(
  1000,
  parseInt(process.env.DRILLDOWN_FULL_SUMMARY_MAX_COUNT, 10) || 10000,
);

// ===========================================
// Dashboard Aggregation Worker
// ===========================================
export const DASHBOARD_AGGREGATION_ENABLED = process.env.DASHBOARD_AGGREGATION_ENABLED
  ? process.env.DASHBOARD_AGGREGATION_ENABLED === "true"
  : isDevelopmentLike();
export const DASHBOARD_AGGREGATION_INTERVAL_MS = parseInt(process.env.DASHBOARD_AGGREGATION_INTERVAL_MS, 10) || (30 * 60 * 1000);
export const DASHBOARD_AGGREGATION_ON_START = process.env.DASHBOARD_AGGREGATION_ON_START
  ? process.env.DASHBOARD_AGGREGATION_ON_START === "true"
  : isDevelopmentLike();
export const DASHBOARD_AGGREGATION_AWAIT_ON_START = process.env.DASHBOARD_AGGREGATION_AWAIT_ON_START
  ? process.env.DASHBOARD_AGGREGATION_AWAIT_ON_START === "true"
  : false;
export const DASHBOARD_AGGREGATION_TARGET_YEAR = parseInt(process.env.DASHBOARD_AGGREGATION_TARGET_YEAR, 10) || new Date().getFullYear();
export const DASHBOARD_AGGREGATION_SKIP_SNAPSHOT = process.env.DASHBOARD_AGGREGATION_SKIP_SNAPSHOT
  ? process.env.DASHBOARD_AGGREGATION_SKIP_SNAPSHOT === "true"
  : false;
export const DASHBOARD_AGGREGATION_STOP_TIMEOUT_MS = parseInt(process.env.DASHBOARD_AGGREGATION_STOP_TIMEOUT_MS, 10) || 5000;
export const DASHBOARD_FRESHNESS_THRESHOLD_MINUTES = parseInt(process.env.DASHBOARD_FRESHNESS_THRESHOLD_MINUTES, 10) || 120;
