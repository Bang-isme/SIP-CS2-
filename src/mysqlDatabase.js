import { Sequelize } from "sequelize";
import {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_AUTO_SYNC,
  MYSQL_REQUIRE_MIGRATIONS,
  NODE_ENV,
} from "./config.js";

const MIGRATIONS_TABLE = "_schema_migrations";
const INITIAL_BOOTSTRAP_MIGRATION_ID = "20260221_000001_initial_sequelize_bootstrap";
const REQUIRED_SQL_TABLES = [
  "earnings",
  "vacation_records",
  "benefits_plans",
  "employee_benefits",
  "pay_rates",
  "earnings_summary",
  "earnings_employee_year",
  "vacation_summary",
  "benefits_summary",
  "alerts_summary",
  "alert_employees",
  "sync_log",
  "integration_events",
];

// Create Sequelize instance for MySQL connection
const sequelize = new Sequelize(MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, {
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  dialect: "mysql",
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const getCurrentDatabaseName = async () => {
  const [rows] = await sequelize.query("SELECT DATABASE() AS db_name");
  return rows?.[0]?.db_name || MYSQL_DATABASE;
};

const getExistingTables = async () => {
  const [rows] = await sequelize.query("SHOW TABLES");
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows
    .map((row) => Object.values(row)[0])
    .filter(Boolean)
    .map((name) => String(name));
};

const doesTableExist = async (tableName) => {
  const [rows] = await sequelize.query("SHOW TABLES LIKE ?", {
    replacements: [tableName],
  });
  return Array.isArray(rows) && rows.length > 0;
};

const getTableColumnNames = async (tableName) => {
  const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\``);
  if (!Array.isArray(rows)) return new Set();
  return new Set(rows.map((row) => String(row.Field)));
};

const repairLegacyPayRatesSchema = async () => {
  const tableName = "pay_rates";
  const exists = await doesTableExist(tableName);
  if (!exists) return;

  const columnNames = await getTableColumnNames(tableName);
  const hasEmployeeId = columnNames.has("employee_id");
  if (hasEmployeeId) return;

  console.warn("[MySQL] Legacy pay_rates schema detected. Repairing columns for employee_id contract...");

  // New contract columns
  await sequelize.query(
    "ALTER TABLE `pay_rates` ADD COLUMN `employee_id` VARCHAR(50) NULL AFTER `id`",
  );
  if (!columnNames.has("pay_rate")) {
    await sequelize.query(
      "ALTER TABLE `pay_rates` ADD COLUMN `pay_rate` DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER `employee_id`",
    );
  }
  if (!columnNames.has("pay_type")) {
    await sequelize.query(
      "ALTER TABLE `pay_rates` ADD COLUMN `pay_type` ENUM('HOURLY','SALARY','COMMISSION','TERMINATED') NOT NULL DEFAULT 'HOURLY' AFTER `pay_rate`",
    );
  }
  if (!columnNames.has("effective_date")) {
    await sequelize.query(
      "ALTER TABLE `pay_rates` ADD COLUMN `effective_date` DATE NOT NULL DEFAULT '1970-01-01' AFTER `pay_type`",
    );
  }
  if (!columnNames.has("is_active")) {
    await sequelize.query(
      "ALTER TABLE `pay_rates` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `effective_date`",
    );
  }

  // Best-effort backfill from legacy columns when available.
  if (columnNames.has("value")) {
    await sequelize.query(
      "UPDATE `pay_rates` SET `pay_rate` = COALESCE(`value`, `pay_rate`, 0)",
    );
  } else if (columnNames.has("amount")) {
    await sequelize.query(
      "UPDATE `pay_rates` SET `pay_rate` = COALESCE(`amount`, `pay_rate`, 0)",
    );
  }
  await sequelize.query(
    "UPDATE `pay_rates` SET `employee_id` = COALESCE(NULLIF(`employee_id`, ''), CONCAT('LEGACY_EMP_', `id`))",
  );
  await sequelize.query(
    "UPDATE `pay_rates` SET `effective_date` = COALESCE(`effective_date`, CURRENT_DATE), `pay_type` = COALESCE(NULLIF(`pay_type`, ''), 'HOURLY'), `is_active` = COALESCE(`is_active`, 1)",
  );
  await sequelize.query(
    "ALTER TABLE `pay_rates` MODIFY COLUMN `employee_id` VARCHAR(50) NOT NULL",
  );
};

export const ensureMigrationsTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id VARCHAR(128) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

export const listAppliedMigrations = async () => {
  await ensureMigrationsTable();
  const [rows] = await sequelize.query(`SELECT id, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY applied_at ASC`);
  return rows || [];
};

export const hasAppliedMigration = async (id) => {
  await ensureMigrationsTable();
  const [rows] = await sequelize.query(`SELECT id FROM ${MIGRATIONS_TABLE} WHERE id = ? LIMIT 1`, {
    replacements: [id],
  });
  return Array.isArray(rows) && rows.length > 0;
};

export const recordAppliedMigration = async (id) => {
  await ensureMigrationsTable();
  await sequelize.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE applied_at = applied_at`,
    { replacements: [id] },
  );
};

export const getMissingRequiredTables = async () => {
  const existingTables = await getExistingTables();
  const existingSet = new Set(existingTables.map((tableName) => tableName.toLowerCase()));
  return REQUIRED_SQL_TABLES.filter((tableName) => !existingSet.has(tableName.toLowerCase()));
};

// Test connection function
export const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL (Payroll DB) connected successfully.");
    return true;
  } catch (error) {
    console.error("Unable to connect to MySQL:", error.message);
    return false;
  }
};

// Sync all models (development-only by default)
export const syncDatabase = async ({ force = false, allowProductionSync = false } = {}) => {
  if (NODE_ENV === "production" && !allowProductionSync) {
    throw new Error(
      "sequelize.sync is disabled in production. Run `npm run db:migrate:mysql` before starting the server.",
    );
  }

  try {
    await repairLegacyPayRatesSchema();
    await sequelize.sync({ force });
    console.log("MySQL tables synchronized.");
  } catch (error) {
    console.error("Error syncing MySQL tables:", error.message);
    throw error;
  }
};

export const runBootstrapMigration = async ({ force = false } = {}) => {
  const alreadyApplied = await hasAppliedMigration(INITIAL_BOOTSTRAP_MIGRATION_ID);
  if (alreadyApplied) {
    return {
      applied: false,
      migrationId: INITIAL_BOOTSTRAP_MIGRATION_ID,
      reason: "already_applied",
    };
  }

  await syncDatabase({ force, allowProductionSync: true });
  await recordAppliedMigration(INITIAL_BOOTSTRAP_MIGRATION_ID);

  return {
    applied: true,
    migrationId: INITIAL_BOOTSTRAP_MIGRATION_ID,
    reason: "applied",
  };
};

export const assertMySQLReadiness = async () => {
  const dbName = await getCurrentDatabaseName();

  if (!MYSQL_REQUIRE_MIGRATIONS) {
    return {
      ready: true,
      dbName,
      migrationRequired: false,
      missingTables: [],
    };
  }

  const appliedMigrations = await listAppliedMigrations();
  const missingTables = await getMissingRequiredTables();
  const hasBaseline = appliedMigrations.some((row) => row.id === INITIAL_BOOTSTRAP_MIGRATION_ID);
  const ready = hasBaseline && missingTables.length === 0;

  if (!ready) {
    const parts = [];
    if (!hasBaseline) {
      parts.push(`baseline migration '${INITIAL_BOOTSTRAP_MIGRATION_ID}' is not applied`);
    }
    if (missingTables.length > 0) {
      parts.push(`missing tables: ${missingTables.join(", ")}`);
    }
    throw new Error(
      `MySQL readiness check failed for database '${dbName}': ${parts.join("; ")}. Run 'npm run db:migrate:mysql' and restart.`,
    );
  }

  return {
    ready: true,
    dbName,
    migrationRequired: true,
    missingTables: [],
  };
};

export const initializeMySQLSchema = async () => {
  if (NODE_ENV === "production") {
    await assertMySQLReadiness();
    console.log("MySQL production readiness check passed.");
    return;
  }

  if (!MYSQL_AUTO_SYNC) {
    console.log("MySQL auto-sync is disabled (MYSQL_AUTO_SYNC=false).");
    return;
  }

  await syncDatabase();
};

export {
  MIGRATIONS_TABLE,
  INITIAL_BOOTSTRAP_MIGRATION_ID,
  REQUIRED_SQL_TABLES,
};

export default sequelize;
