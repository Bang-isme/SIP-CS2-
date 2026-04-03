import { config as loadEnv } from "dotenv";
loadEnv();

import { spawnSync } from "node:child_process";
import mongoose from "mongoose";
import sequelize, {
  REQUIRED_MIGRATION_IDS,
  getMissingRequiredTables,
  listAppliedMigrations,
} from "../src/mysqlDatabase.js";

const MONGODB_URI = process.env.MONGODB_URI;
const BACKEND_BASE_URL = process.env.LOCAL_BACKEND_BASE_URL || "http://127.0.0.1:4000";
const DATASET_TARGET = Number.parseInt(process.env.LOCAL_DATASET_TARGET || "500000", 10);
const SERVICE_NAME = "SIPLocalMongoDB";
const AUTOSTART_TASK = "SIPLocalMongoDBAutostart";

const warnings = [];
const blockers = [];

const addWarning = (message) => warnings.push(message);
const addBlocker = (message) => blockers.push(message);

const runCommand = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
  });

  return {
    status: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
};

const parseHealthResponse = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
};

const getMongoRuntimeHints = () => {
  const serviceQuery = runCommand("sc.exe", ["query", SERVICE_NAME]);
  const taskQuery = runCommand("schtasks", ["/Query", "/TN", AUTOSTART_TASK, "/V", "/FO", "LIST"]);

  const serviceInstalled = serviceQuery.status === 0;
  const autostartInstalled = taskQuery.status === 0;

  return {
    serviceInstalled,
    serviceStatus: serviceInstalled ? serviceQuery.stdout : null,
    autostartInstalled,
    autostartStatus: autostartInstalled ? taskQuery.stdout : null,
  };
};

const getDatasetReadiness = async () => {
  const mongoCounts = {};
  const sqlCounts = {};

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const mongoDb = mongoose.connection.db;
  for (const collectionName of ["employees", "departments", "users", "roles", "alerts"]) {
    mongoCounts[collectionName] = await mongoDb.collection(collectionName).countDocuments();
  }
  await mongoose.disconnect();

  await sequelize.authenticate();
  for (const tableName of [
    "vacation_records",
    "employee_benefits",
    "pay_rates",
    "earnings_employee_year",
    "alerts_summary",
    "alert_employees",
  ]) {
    const [rows] = await sequelize.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
    sqlCounts[tableName] = Number(rows?.[0]?.count || 0);
  }

  const datasetChecks = [
    { label: "Mongo employees", actual: mongoCounts.employees, target: DATASET_TARGET },
    { label: "MySQL vacation_records", actual: sqlCounts.vacation_records, target: DATASET_TARGET },
    { label: "MySQL employee_benefits", actual: sqlCounts.employee_benefits, target: DATASET_TARGET },
    { label: "MySQL pay_rates", actual: sqlCounts.pay_rates, target: DATASET_TARGET },
  ];

  for (const check of datasetChecks) {
    if (check.actual < check.target) {
      addWarning(`${check.label} below target (${check.actual}/${check.target})`);
    }
  }

  if (mongoCounts.departments < 8) {
    addWarning(`Mongo departments below expected baseline (${mongoCounts.departments}/8)`);
  }

  return {
    mongoCounts,
    sqlCounts,
  };
};

const getMySqlReadiness = async () => {
  await sequelize.authenticate();
  const appliedMigrations = await listAppliedMigrations();
  const missingTables = await getMissingRequiredTables();
  const appliedIds = new Set(appliedMigrations.map((item) => item.id));
  const missingMigrations = REQUIRED_MIGRATION_IDS.filter((id) => !appliedIds.has(id));

  if (missingMigrations.length > 0) {
    addBlocker(`Missing MySQL migrations: ${missingMigrations.join(", ")}`);
  }
  if (missingTables.length > 0) {
    addBlocker(`Missing required MySQL tables: ${missingTables.join(", ")}`);
  }

  return {
    appliedMigrationCount: appliedMigrations.length,
    missingMigrations,
    missingTables,
  };
};

const main = async () => {
  const report = {
    checkedAt: new Date().toISOString(),
    backendBaseUrl: BACKEND_BASE_URL,
    datasetTarget: DATASET_TARGET,
    mongoRuntime: getMongoRuntimeHints(),
    mongodb: null,
    mysql: null,
    backendHealth: null,
    warnings,
    blockers,
  };

  try {
    report.mysql = await getMySqlReadiness();
  } catch (error) {
    addBlocker(`MySQL unavailable: ${error.message}`);
  }

  try {
    const dataset = await getDatasetReadiness();
    report.mongodb = dataset.mongoCounts;
    report.mysql = {
      ...(report.mysql || {}),
      counts: dataset.sqlCounts,
    };
  } catch (error) {
    addBlocker(`MongoDB unavailable: ${error.message}`);
  }

  try {
    const [live, ready] = await Promise.all([
      parseHealthResponse(`${BACKEND_BASE_URL}/api/health/live`),
      parseHealthResponse(`${BACKEND_BASE_URL}/api/health/ready`),
    ]);

    report.backendHealth = { live, ready };

    if (!live.ok) {
      addWarning(`Backend live probe returned HTTP ${live.status}`);
    }
    if (!ready.ok) {
      addWarning(`Backend ready probe returned HTTP ${ready.status}`);
    }
  } catch (error) {
    addWarning(`Backend health probes unavailable: ${error.message}. Start backend with 'npm run backend:local:start' or 'npm run stack:local:start'.`);
  }

  report.status = blockers.length > 0 ? "unhealthy" : warnings.length > 0 ? "degraded" : "healthy";

  console.log(JSON.stringify(report, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error("[doctor] Failed:", error);
  process.exit(1);
}).finally(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (disconnectError) {
    void disconnectError;
  }

  try {
    await sequelize.close();
  } catch (closeError) {
    void closeError;
  }
});
