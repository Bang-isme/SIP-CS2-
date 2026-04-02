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
const PAY_RATE_SCHEMA_CONTRACT_MIGRATION_ID = "20260403_000005_pay_rate_schema_contract_cleanup";
const INTEGRATION_EVENT_OPERATOR_AUDIT_MIGRATION_ID = "20260402_000002_integration_event_operator_audit";
const INTEGRATION_EVENT_AUDIT_HISTORY_MIGRATION_ID = "20260402_000003_integration_event_audit_history";
const INTEGRATION_CORRELATION_TRACE_MIGRATION_ID = "20260402_000004_integration_correlation_trace";
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
  "integration_event_audits",
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

const getTableIndexes = async (tableName) => {
  const [rows] = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
  return Array.isArray(rows) ? rows : [];
};

const repairLegacyPayRatesSchema = async () => {
  const tableName = "pay_rates";
  const exists = await doesTableExist(tableName);
  if (!exists) return;

  let columnNames = await getTableColumnNames(tableName);
  const hasLegacyColumns = ["name", "value", "tax_percentage", "type"].some((columnName) =>
    columnNames.has(columnName)
  );

  if (!columnNames.has("employee_id") || hasLegacyColumns) {
    console.warn("[MySQL] Reconciling pay_rates schema to the current employee pay history contract...");
  }

  const addColumnIfMissing = async (columnName, ddl) => {
    if (columnNames.has(columnName)) return;
    await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${ddl}`);
    columnNames.add(columnName);
  };

  await addColumnIfMissing("employee_id", "`employee_id` VARCHAR(50) NULL AFTER `id`");
  await addColumnIfMissing("pay_rate", "`pay_rate` DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER `employee_id`");
  await addColumnIfMissing(
    "pay_type",
    "`pay_type` ENUM('HOURLY','SALARY','COMMISSION','TERMINATED') NOT NULL DEFAULT 'HOURLY' AFTER `pay_rate`",
  );
  await addColumnIfMissing(
    "effective_date",
    "`effective_date` DATE NOT NULL DEFAULT '1970-01-01' AFTER `pay_type`",
  );
  await addColumnIfMissing("is_active", "`is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `effective_date`");

  if (columnNames.has("value")) {
    await sequelize.query(`
      UPDATE \`${tableName}\`
      SET \`pay_rate\` = CASE
        WHEN \`pay_rate\` IS NULL OR \`pay_rate\` = 0 THEN COALESCE(\`value\`, \`pay_rate\`, 0)
        ELSE \`pay_rate\`
      END
    `);
  } else if (columnNames.has("amount")) {
    await sequelize.query(`
      UPDATE \`${tableName}\`
      SET \`pay_rate\` = CASE
        WHEN \`pay_rate\` IS NULL OR \`pay_rate\` = 0 THEN COALESCE(\`amount\`, \`pay_rate\`, 0)
        ELSE \`pay_rate\`
      END
    `);
  }

  if (columnNames.has("type")) {
    await sequelize.query(`
      UPDATE \`${tableName}\`
      SET \`pay_type\` = CASE LOWER(COALESCE(\`type\`, ''))
        WHEN 'salary' THEN 'SALARY'
        WHEN 'commission' THEN 'COMMISSION'
        WHEN 'terminated' THEN 'TERMINATED'
        ELSE 'HOURLY'
      END
      WHERE \`type\` IS NOT NULL
    `);
  }

  await sequelize.query(
    "UPDATE `pay_rates` SET `employee_id` = COALESCE(NULLIF(`employee_id`, ''), CONCAT('LEGACY_EMP_', `id`))",
  );
  await sequelize.query(
    "UPDATE `pay_rates` SET `effective_date` = COALESCE(`effective_date`, CURRENT_DATE), `pay_type` = COALESCE(NULLIF(`pay_type`, ''), 'HOURLY'), `is_active` = COALESCE(`is_active`, 1)",
  );
  await sequelize.query("ALTER TABLE `pay_rates` MODIFY COLUMN `employee_id` VARCHAR(50) NOT NULL");

  const legacyColumnsToDrop = ["name", "value", "tax_percentage", "type"].filter((columnName) =>
    columnNames.has(columnName)
  );
  for (const columnName of legacyColumnsToDrop) {
    await sequelize.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
    columnNames.delete(columnName);
  }
};

const ensurePayRateHistorySupport = async () => {
  const tableName = "pay_rates";
  const exists = await doesTableExist(tableName);
  if (!exists) return;

  const indexes = await getTableIndexes(tableName);
  const uniqueEmployeeIndexes = indexes.filter((row) =>
    row.Column_name === "employee_id" &&
    Number(row.Non_unique) === 0 &&
    row.Key_name !== "PRIMARY"
  );

  const droppedIndexNames = new Set();
  for (const row of uniqueEmployeeIndexes) {
    if (droppedIndexNames.has(row.Key_name)) continue;
    await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${row.Key_name}\``);
    droppedIndexNames.add(row.Key_name);
  }

  const groupedIndexes = indexes.reduce((acc, row) => {
    if (!acc.has(row.Key_name)) acc.set(row.Key_name, []);
    acc.get(row.Key_name).push(row);
    return acc;
  }, new Map());

  const historyIndexNames = [];
  for (const [indexName, rows] of groupedIndexes.entries()) {
    const orderedColumns = [...rows]
      .sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index))
      .map((row) => row.Column_name);
    if (orderedColumns.join(",") === "employee_id,is_active,effective_date") {
      historyIndexNames.push(indexName);
    }
  }

  const indexToKeep = historyIndexNames.includes("idx_pay_rates_employee_active_effective")
    ? "idx_pay_rates_employee_active_effective"
    : historyIndexNames[0];

  for (const indexName of historyIndexNames) {
    if (indexName === indexToKeep || indexName === "PRIMARY") continue;
    await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
  }

  if (!indexToKeep) {
    await sequelize.query(
      "CREATE INDEX `idx_pay_rates_employee_active_effective` ON `pay_rates` (`employee_id`, `is_active`, `effective_date`)",
    );
  }
};

const ensureIntegrationEventOperatorAuditSupport = async () => {
  const tableName = "integration_events";
  const exists = await doesTableExist(tableName);
  if (!exists) return;

  const columnNames = await getTableColumnNames(tableName);
  const addColumnIfMissing = async (columnName, ddl) => {
    if (columnNames.has(columnName)) return;
    await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${ddl}`);
    columnNames.add(columnName);
  };

  await addColumnIfMissing("last_operator_action", "`last_operator_action` VARCHAR(40) NULL AFTER `processed_at`");
  await addColumnIfMissing("last_operator_actor_id", "`last_operator_actor_id` VARCHAR(100) NULL AFTER `last_operator_action`");
  await addColumnIfMissing("last_operator_request_id", "`last_operator_request_id` VARCHAR(120) NULL AFTER `last_operator_actor_id`");
  await addColumnIfMissing("last_operator_at", "`last_operator_at` DATETIME NULL AFTER `last_operator_request_id`");

  const indexes = await getTableIndexes(tableName);
  const hasOperatorAtIndex = indexes.some((row) => row.Key_name === "idx_integration_events_last_operator_at");
  if (!hasOperatorAtIndex) {
    await sequelize.query(
      "CREATE INDEX `idx_integration_events_last_operator_at` ON `integration_events` (`last_operator_at`)",
    );
  }
};

const ensureIntegrationEventAuditHistorySupport = async () => {
  const tableName = "integration_event_audits";
  const exists = await doesTableExist(tableName);
  if (!exists) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`integration_event_id\` INT NOT NULL,
        \`operator_action\` VARCHAR(40) NOT NULL,
        \`operator_actor_id\` VARCHAR(100) NULL,
        \`operator_request_id\` VARCHAR(120) NULL,
        \`source_status\` ENUM('PENDING','PROCESSING','SUCCESS','FAILED','DEAD') NULL,
        \`target_status\` ENUM('PENDING','PROCESSING','SUCCESS','FAILED','DEAD') NULL,
        \`details\` JSON NULL,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_integration_event_audits_event\`
          FOREIGN KEY (\`integration_event_id\`) REFERENCES \`integration_events\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  const columnNames = await getTableColumnNames(tableName);
  const addColumnIfMissing = async (columnName, ddl) => {
    if (columnNames.has(columnName)) return;
    await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${ddl}`);
    columnNames.add(columnName);
  };

  await addColumnIfMissing("integration_event_id", "`integration_event_id` INT NOT NULL");
  await addColumnIfMissing("operator_action", "`operator_action` VARCHAR(40) NOT NULL DEFAULT 'unknown'");
  await addColumnIfMissing("operator_actor_id", "`operator_actor_id` VARCHAR(100) NULL");
  await addColumnIfMissing("operator_request_id", "`operator_request_id` VARCHAR(120) NULL");
  await addColumnIfMissing("source_status", "`source_status` ENUM('PENDING','PROCESSING','SUCCESS','FAILED','DEAD') NULL");
  await addColumnIfMissing("target_status", "`target_status` ENUM('PENDING','PROCESSING','SUCCESS','FAILED','DEAD') NULL");
  await addColumnIfMissing("details", "`details` JSON NULL");

  const indexes = await getTableIndexes(tableName);
  const ensureIndex = async (indexName, ddl) => {
    const hasIndex = indexes.some((row) => row.Key_name === indexName);
    if (!hasIndex) {
      await sequelize.query(ddl);
    }
  };

  await ensureIndex(
    "idx_integration_event_audits_event_created",
    "CREATE INDEX `idx_integration_event_audits_event_created` ON `integration_event_audits` (`integration_event_id`, `createdAt`)",
  );
  await ensureIndex(
    "idx_integration_event_audits_operator_action",
    "CREATE INDEX `idx_integration_event_audits_operator_action` ON `integration_event_audits` (`operator_action`)",
  );
  await ensureIndex(
    "idx_integration_event_audits_operator_request",
    "CREATE INDEX `idx_integration_event_audits_operator_request` ON `integration_event_audits` (`operator_request_id`)",
  );
};

const ensureIntegrationCorrelationTraceSupport = async () => {
  const integrationEventsTable = "integration_events";
  if (await doesTableExist(integrationEventsTable)) {
    const columnNames = await getTableColumnNames(integrationEventsTable);
    if (!columnNames.has("correlation_id")) {
      await sequelize.query(
        "ALTER TABLE `integration_events` ADD COLUMN `correlation_id` VARCHAR(120) NULL AFTER `payload`",
      );
    }

    const indexes = await getTableIndexes(integrationEventsTable);
    const hasCorrelationIndex = indexes.some((row) => row.Key_name === "idx_integration_events_correlation");
    if (!hasCorrelationIndex) {
      await sequelize.query(
        "CREATE INDEX `idx_integration_events_correlation` ON `integration_events` (`correlation_id`)",
      );
    }
  }

  const syncLogTable = "sync_log";
  if (await doesTableExist(syncLogTable)) {
    const columnNames = await getTableColumnNames(syncLogTable);
    if (!columnNames.has("correlation_id")) {
      await sequelize.query(
        "ALTER TABLE `sync_log` ADD COLUMN `correlation_id` VARCHAR(120) NULL AFTER `entity_id`",
      );
    }

    const indexes = await getTableIndexes(syncLogTable);
    const hasCorrelationIndex = indexes.some((row) => row.Key_name === "idx_sync_log_correlation");
    if (!hasCorrelationIndex) {
      await sequelize.query(
        "CREATE INDEX `idx_sync_log_correlation` ON `sync_log` (`correlation_id`)",
      );
    }
  }
};

const POST_BOOTSTRAP_MIGRATIONS = [
  {
    id: PAY_RATE_SCHEMA_CONTRACT_MIGRATION_ID,
    apply: repairLegacyPayRatesSchema,
  },
  {
    id: INTEGRATION_EVENT_OPERATOR_AUDIT_MIGRATION_ID,
    apply: ensureIntegrationEventOperatorAuditSupport,
  },
  {
    id: INTEGRATION_EVENT_AUDIT_HISTORY_MIGRATION_ID,
    apply: ensureIntegrationEventAuditHistorySupport,
  },
  {
    id: INTEGRATION_CORRELATION_TRACE_MIGRATION_ID,
    apply: ensureIntegrationCorrelationTraceSupport,
  },
];

const REQUIRED_MIGRATION_IDS = [
  INITIAL_BOOTSTRAP_MIGRATION_ID,
  ...POST_BOOTSTRAP_MIGRATIONS.map((migration) => migration.id),
];

const runIncrementalMigrations = async () => {
  const appliedMigrations = [];
  for (const migration of POST_BOOTSTRAP_MIGRATIONS) {
    const alreadyApplied = await hasAppliedMigration(migration.id);
    if (alreadyApplied) continue;

    await migration.apply();
    await recordAppliedMigration(migration.id);
    appliedMigrations.push(migration.id);
  }

  return appliedMigrations;
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
    await ensurePayRateHistorySupport();
    await ensureIntegrationEventOperatorAuditSupport();
    await ensureIntegrationEventAuditHistorySupport();
    await ensureIntegrationCorrelationTraceSupport();
    console.log("MySQL tables synchronized.");
  } catch (error) {
    console.error("Error syncing MySQL tables:", error.message);
    throw error;
  }
};

export const runBootstrapMigration = async ({ force = false } = {}) => {
  const appliedMigrations = [];
  const alreadyApplied = await hasAppliedMigration(INITIAL_BOOTSTRAP_MIGRATION_ID);
  if (alreadyApplied) {
    appliedMigrations.push(...await runIncrementalMigrations());

    return appliedMigrations.length > 0
      ? {
          applied: true,
          migrationId: appliedMigrations[appliedMigrations.length - 1],
          reason: "applied",
          appliedMigrations,
        }
      : {
          applied: false,
          migrationId: INITIAL_BOOTSTRAP_MIGRATION_ID,
          reason: "already_applied",
          appliedMigrations,
        };
  }

  await syncDatabase({ force, allowProductionSync: true });
  await recordAppliedMigration(INITIAL_BOOTSTRAP_MIGRATION_ID);
  appliedMigrations.push(INITIAL_BOOTSTRAP_MIGRATION_ID);
  appliedMigrations.push(...await runIncrementalMigrations());

  return {
    applied: true,
    migrationId: appliedMigrations[appliedMigrations.length - 1],
    reason: "applied",
    appliedMigrations,
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
  const appliedIds = new Set(appliedMigrations.map((row) => row.id));
  const missingMigrations = REQUIRED_MIGRATION_IDS.filter((id) => !appliedIds.has(id));
  const ready = missingMigrations.length === 0 && missingTables.length === 0;

  if (!ready) {
    const parts = [];
    if (missingMigrations.length > 0) {
      parts.push(`missing migrations: ${missingMigrations.join(", ")}`);
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
  PAY_RATE_SCHEMA_CONTRACT_MIGRATION_ID,
  INTEGRATION_EVENT_OPERATOR_AUDIT_MIGRATION_ID,
  INTEGRATION_EVENT_AUDIT_HISTORY_MIGRATION_ID,
  INTEGRATION_CORRELATION_TRACE_MIGRATION_ID,
  REQUIRED_MIGRATION_IDS,
  REQUIRED_SQL_TABLES,
};

export default sequelize;
