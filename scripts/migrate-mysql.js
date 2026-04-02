import {
  connectMySQL,
  ensureMigrationsTable,
  REQUIRED_MIGRATION_IDS,
  getMissingRequiredTables,
  listAppliedMigrations,
  runBootstrapMigration,
} from "../src/mysqlDatabase.js";

const printUsage = () => {
  console.log("Usage:");
  console.log("  node scripts/migrate-mysql.js");
  console.log("  node scripts/migrate-mysql.js --status");
  console.log("  node scripts/migrate-mysql.js --force");
};

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  printUsage();
  process.exit(0);
}

const runStatus = async () => {
  await ensureMigrationsTable();
  const applied = await listAppliedMigrations();
  const missingTables = await getMissingRequiredTables();
  const appliedIds = new Set(applied.map((item) => item.id));
  const missingMigrations = REQUIRED_MIGRATION_IDS.filter((id) => !appliedIds.has(id));

  console.log("[MySQL Migration Status]");
  console.log(`Applied migrations: ${applied.length}`);
  for (const item of applied) {
    console.log(`- ${item.id} @ ${item.applied_at}`);
  }
  if (missingMigrations.length > 0) {
    console.log(`Missing required migrations: ${missingMigrations.join(", ")}`);
  } else {
    console.log("Missing required migrations: none");
  }
  if (missingTables.length > 0) {
    console.log(`Missing required tables: ${missingTables.join(", ")}`);
  } else {
    console.log("Missing required tables: none");
  }
};

const main = async () => {
  const connected = await connectMySQL();
  if (!connected) {
    process.exit(1);
  }

  if (args.has("--status")) {
    await runStatus();
    process.exit(0);
  }

  const force = args.has("--force");
  const result = await runBootstrapMigration({ force });
  if (result.applied) {
    const appliedMigrations = Array.isArray(result.appliedMigrations) && result.appliedMigrations.length > 0
      ? result.appliedMigrations.join(", ")
      : result.migrationId;
    console.log(`[MySQL Migration] Applied ${appliedMigrations}`);
  } else {
    console.log(`[MySQL Migration] Skipped ${result.migrationId} (${result.reason})`);
  }

  await runStatus();
};

main().catch((error) => {
  console.error("[MySQL Migration] Failed:", error.message);
  process.exit(1);
});
