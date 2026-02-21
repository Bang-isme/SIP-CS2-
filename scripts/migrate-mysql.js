import {
  connectMySQL,
  ensureMigrationsTable,
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

  console.log("[MySQL Migration Status]");
  console.log(`Applied migrations: ${applied.length}`);
  for (const item of applied) {
    console.log(`- ${item.id} @ ${item.applied_at}`);
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
    console.log(`[MySQL Migration] Applied ${result.migrationId}`);
  } else {
    console.log(`[MySQL Migration] Skipped ${result.migrationId} (${result.reason})`);
  }

  await runStatus();
};

main().catch((error) => {
  console.error("[MySQL Migration] Failed:", error.message);
  process.exit(1);
});
