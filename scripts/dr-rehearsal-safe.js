/**
 * Safe DR Rehearsal (Non-destructive)
 * - Collects basic counts from MongoDB + MySQL
 * - Writes a local report file for evidence
 *
 * Usage: node scripts/dr-rehearsal-safe.js
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import sequelize, { connectMySQL } from "../src/mysqlDatabase.js";
import connectMongo from "../src/database.js";
import {
  SyncLog,
  EarningsSummary,
  VacationSummary,
  BenefitsSummary,
  AlertEmployee,
} from "../src/models/sql/index.js";
import Employee from "../src/models/Employee.js";
import IntegrationEvent from "../src/models/IntegrationEvent.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const main = async () => {
  const startedAt = new Date();
  try {
    // 1) Connect databases
    await connectMySQL();
    await connectMongo();

    // 2) Collect counts
    const mongoCounts = {
      employees: await Employee.countDocuments(),
      integration_events: await IntegrationEvent.countDocuments(),
    };

    const mysqlCounts = {
      sync_logs: await SyncLog.count(),
      earnings_summary: await EarningsSummary.count(),
      vacation_summary: await VacationSummary.count(),
      benefits_summary: await BenefitsSummary.count(),
      alert_employees: await AlertEmployee.count(),
    };

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    const report = {
      type: "DR_REHEARSAL_SAFE",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      note: "Non-destructive rehearsal: count verification only.",
      mongo: mongoCounts,
      mysql: mysqlCounts,
      rtoEstimate: "N/A (safe run)",
      rpoEstimate: "N/A (safe run)",
    };

    const reportDir = path.resolve(__dirname, "..", "Memory", "DR");
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(
      reportDir,
      `dr_rehearsal_safe_${startedAt.toISOString().slice(0, 10)}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

    console.log("[DR] Safe rehearsal completed.");
    console.log("[DR] Report saved:", reportPath);
  } catch (error) {
    console.error("[DR] Safe rehearsal failed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
};

main();
