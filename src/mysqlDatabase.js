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
// Payroll and dashboard still require MySQL, but the active outbox path now
// lives in MongoDB under the SA service.
const INITIAL_BOOTSTRAP_MIGRATION_ID = "20260221_000001_initial_sequelize_bootstrap";
const PAY_RATE_SCHEMA_CONTRACT_MIGRATION_ID = "20260403_000005_pay_rate_schema_contract_cleanup";
const DASHBOARD_SUMMARY_SCOPE_MIGRATION_ID = "20260419_000006_dashboard_summary_scope";
const DASHBOARD_COMPANY_SCOPE_VALUE = "__company__";
const INTEGRATION_CORRELATION_TRACE_MIGRATION_ID = "20260402_000004_integration_correlation_trace";
const SYNC_LOG_IDEMPOTENCY_MIGRATION_ID = "20260416_000006_sync_log_idempotency_contract";
const ACTIVE_SQL_TABLES = [
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
];
// Backward-compatible alias for existing callers/tests. "Required" now means
// active runtime schema required by Payroll and Dashboard services.
const REQUIRED_SQL_TABLES = ACTIVE_SQL_TABLES;

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

const getOrderedIndexColumns = (rows) =>
  [...rows]
    .sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index))
    .map((row) => row.Column_name);

const ensureExactUniqueIndex = async (tableName, indexName, targetColumns, legacyColumnSets = []) => {
  const indexes = await getTableIndexes(tableName);
  const targetSignature = targetColumns.join(",");
  const legacySignatures = new Set(legacyColumnSets.map((columns) => columns.join(",")));
  const groupedIndexes = indexes.reduce((acc, row) => {
    if (!acc.has(row.Key_name)) acc.set(row.Key_name, []);
    acc.get(row.Key_name).push(row);
    return acc;
  }, new Map());

  let hasTargetIndex = false;
  const indexNamesToDrop = new Set();

  for (const [existingIndexName, rows] of groupedIndexes.entries()) {
    if (existingIndexName === "PRIMARY") continue;

    const signature = getOrderedIndexColumns(rows).join(",");
    const isUnique = Number(rows[0]?.Non_unique) === 0;

    if (existingIndexName === indexName && (!isUnique || signature !== targetSignature)) {
      indexNamesToDrop.add(existingIndexName);
      continue;
    }

    if (signature === targetSignature) {
      if (isUnique && existingIndexName === indexName) {
        hasTargetIndex = true;
      } else {
        indexNamesToDrop.add(existingIndexName);
      }
      continue;
    }

    if (legacySignatures.has(signature)) {
      indexNamesToDrop.add(existingIndexName);
    }
  }

  for (const existingIndexName of indexNamesToDrop) {
    await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${existingIndexName}\``);
  }

  if (!hasTargetIndex) {
    const columnList = targetColumns.map((columnName) => `\`${columnName}\``).join(", ");
    await sequelize.query(`CREATE UNIQUE INDEX \`${indexName}\` ON \`${tableName}\` (${columnList})`);
  }
};

const DASHBOARD_SUMMARY_SCOPE_TABLES = [
  {
    tableName: "earnings_summary",
    scopeTypeDefinition: "`scope_type` VARCHAR(20) NOT NULL DEFAULT 'company' AFTER `year`",
    scopeTypeModify: "`scope_type` VARCHAR(20) NOT NULL DEFAULT 'company' AFTER `year`",
    scopeValueDefinition: `\`scope_value\` VARCHAR(100) NOT NULL DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}' AFTER \`scope_type\``,
    scopeValueModify: `\`scope_value\` VARCHAR(100) NOT NULL DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}' AFTER \`scope_type\``,
    indexName: "ux_earnings_summary_scope_group",
    targetColumns: ["year", "scope_type", "scope_value", "group_type", "group_value"],
    legacyColumnSets: [["year", "group_type", "group_value"]],
  },
  {
    tableName: "vacation_summary",
    scopeTypeDefinition: "`scope_type` VARCHAR(20) NOT NULL DEFAULT 'company' AFTER `year`",
    scopeTypeModify: "`scope_type` VARCHAR(20) NOT NULL DEFAULT 'company' AFTER `year`",
    scopeValueDefinition: `\`scope_value\` VARCHAR(100) NOT NULL DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}' AFTER \`scope_type\``,
    scopeValueModify: `\`scope_value\` VARCHAR(100) NOT NULL DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}' AFTER \`scope_type\``,
    indexName: "ux_vacation_summary_scope_group",
    targetColumns: ["year", "scope_type", "scope_value", "group_type", "group_value"],
    legacyColumnSets: [["year", "group_type", "group_value"]],
  },
  {
    tableName: "benefits_summary",
    scopeTypeDefinition: "`scope_type` VARCHAR(20) NOT NULL DEFAULT 'company' AFTER `id`",
    scopeTypeModify: "`scope_type` VARCHAR(20) NOT NULL DEFAULT 'company' AFTER `id`",
    scopeValueDefinition: `\`scope_value\` VARCHAR(100) NOT NULL DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}' AFTER \`scope_type\``,
    scopeValueModify: `\`scope_value\` VARCHAR(100) NOT NULL DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}' AFTER \`scope_type\``,
    indexName: "ux_benefits_summary_scope_plan_shareholder",
    targetColumns: ["scope_type", "scope_value", "plan_name", "shareholder_type"],
    legacyColumnSets: [["plan_name", "shareholder_type"]],
  },
];

export const ensureDashboardSummaryScopeSupport = async () => {
  const summaries = DASHBOARD_SUMMARY_SCOPE_TABLES;

  for (const summary of summaries) {
    const exists = await doesTableExist(summary.tableName);
    if (!exists) continue;

    const columnNames = await getTableColumnNames(summary.tableName);
    if (!columnNames.has("scope_type")) {
      await sequelize.query(`ALTER TABLE \`${summary.tableName}\` ADD COLUMN ${summary.scopeTypeDefinition}`);
      columnNames.add("scope_type");
    }
    if (!columnNames.has("scope_value")) {
      await sequelize.query(`ALTER TABLE \`${summary.tableName}\` ADD COLUMN ${summary.scopeValueDefinition}`);
      columnNames.add("scope_value");
    }

    await sequelize.query(
      `UPDATE \`${summary.tableName}\` SET \`scope_type\` = 'company' WHERE \`scope_type\` IS NULL OR \`scope_type\` = ''`,
    );
    await sequelize.query(
      `UPDATE \`${summary.tableName}\` SET \`scope_value\` = '${DASHBOARD_COMPANY_SCOPE_VALUE}' WHERE \`scope_type\` = 'company' AND (\`scope_value\` IS NULL OR \`scope_value\` = '')`,
    );
    await sequelize.query(`ALTER TABLE \`${summary.tableName}\` MODIFY COLUMN ${summary.scopeTypeModify}`);
    await sequelize.query(`ALTER TABLE \`${summary.tableName}\` MODIFY COLUMN ${summary.scopeValueModify}`);

    await ensureExactUniqueIndex(
      summary.tableName,
      summary.indexName,
      summary.targetColumns,
      summary.legacyColumnSets,
    );
  }
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

const ensureSyncLogCorrelationTraceSupport = async () => {
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

const deduplicateSyncLogCorrelationRows = async () => {
  const [duplicates] = await sequelize.query(`
    SELECT entity_type, entity_id, action, correlation_id, COUNT(*) AS row_count
    FROM sync_log
    WHERE correlation_id IS NOT NULL AND correlation_id <> ''
    GROUP BY entity_type, entity_id, action, correlation_id
    HAVING COUNT(*) > 1
  `);

  for (const duplicate of duplicates || []) {
    const [rows] = await sequelize.query(`
      SELECT id, status, completed_at, createdAt, updatedAt
      FROM sync_log
      WHERE entity_type = ? AND entity_id = ? AND action = ? AND correlation_id = ?
      ORDER BY
        CASE status
          WHEN 'SUCCESS' THEN 3
          WHEN 'PENDING' THEN 2
          ELSE 1
        END DESC,
        COALESCE(completed_at, updatedAt, createdAt) DESC,
        id DESC
    `, {
      replacements: [
        duplicate.entity_type,
        duplicate.entity_id,
        duplicate.action,
        duplicate.correlation_id,
      ],
    });

    const rowsToDelete = (rows || []).slice(1);
    if (rowsToDelete.length === 0) continue;

    const placeholders = rowsToDelete.map(() => "?").join(", ");
    await sequelize.query(
      `DELETE FROM sync_log WHERE id IN (${placeholders})`,
      {
        replacements: rowsToDelete.map((row) => row.id),
      },
    );
  }
};

const ensureSyncLogIdempotencySupport = async () => {
  const syncLogTable = "sync_log";
  if (!(await doesTableExist(syncLogTable))) {
    return;
  }

  await deduplicateSyncLogCorrelationRows();

  const indexes = await getTableIndexes(syncLogTable);
  const hasUniqueCorrelationIndex = indexes.some((row) => row.Key_name === "uniq_sync_log_entity_action_correlation");
  if (!hasUniqueCorrelationIndex) {
    await sequelize.query(`
      CREATE UNIQUE INDEX \`uniq_sync_log_entity_action_correlation\`
      ON \`sync_log\` (\`entity_type\`, \`entity_id\`, \`action\`, \`correlation_id\`)
    `);
  }
};

const ACTIVE_POST_BOOTSTRAP_MIGRATIONS = [
  {
    id: PAY_RATE_SCHEMA_CONTRACT_MIGRATION_ID,
    apply: repairLegacyPayRatesSchema,
  },
  {
    id: DASHBOARD_SUMMARY_SCOPE_MIGRATION_ID,
    apply: ensureDashboardSummaryScopeSupport,
  },
  {
    id: INTEGRATION_CORRELATION_TRACE_MIGRATION_ID,
    apply: ensureSyncLogCorrelationTraceSupport,
  },
  {
    id: SYNC_LOG_IDEMPOTENCY_MIGRATION_ID,
    apply: ensureSyncLogIdempotencySupport,
  },
];

const POST_BOOTSTRAP_MIGRATIONS = [...ACTIVE_POST_BOOTSTRAP_MIGRATIONS];

const ACTIVE_SQL_MIGRATION_IDS = [
  INITIAL_BOOTSTRAP_MIGRATION_ID,
  ...ACTIVE_POST_BOOTSTRAP_MIGRATIONS.map((migration) => migration.id),
];
// Backward-compatible alias for existing callers/tests. "Required" now means
// active runtime migrations required by Payroll and Dashboard services.
const REQUIRED_MIGRATION_IDS = ACTIVE_SQL_MIGRATION_IDS;

const runIncrementalMigrations = async () => {
  const appliedMigrations = [];
  for (const migration of POST_BOOTSTRAP_MIGRATIONS) {
    try {
      const alreadyApplied = await hasAppliedMigration(migration.id);
      if (alreadyApplied) continue;

      await migration.apply();
      await recordAppliedMigration(migration.id);
      appliedMigrations.push(migration.id);
    } catch (error) {
      throw new Error(`MySQL migration '${migration.id}' failed: ${error.message}`);
    }
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
  return ACTIVE_SQL_TABLES.filter((tableName) => !existingSet.has(tableName.toLowerCase()));
};

export const getMissingActiveMigrations = async () => {
  const appliedMigrations = await listAppliedMigrations();
  const appliedIds = new Set(appliedMigrations.map((row) => row.id));
  return ACTIVE_SQL_MIGRATION_IDS.filter((id) => !appliedIds.has(id));
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
    await ensureDashboardSummaryScopeSupport();
    await ensurePayRateHistorySupport();
    await ensureSyncLogCorrelationTraceSupport();
    await ensureSyncLogIdempotencySupport();
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
  const missingMigrations = ACTIVE_SQL_MIGRATION_IDS.filter((id) => !appliedIds.has(id));
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
    migrationRequired: false,
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

  await runBootstrapMigration();
};

export {
  ACTIVE_SQL_MIGRATION_IDS,
  ACTIVE_SQL_TABLES,
  MIGRATIONS_TABLE,
  INITIAL_BOOTSTRAP_MIGRATION_ID,
  PAY_RATE_SCHEMA_CONTRACT_MIGRATION_ID,
  DASHBOARD_SUMMARY_SCOPE_MIGRATION_ID,
  DASHBOARD_COMPANY_SCOPE_VALUE,
  INTEGRATION_CORRELATION_TRACE_MIGRATION_ID,
  SYNC_LOG_IDEMPOTENCY_MIGRATION_ID,
  DASHBOARD_SUMMARY_SCOPE_TABLES,
  REQUIRED_MIGRATION_IDS,
  REQUIRED_SQL_TABLES,
};

export default sequelize;
