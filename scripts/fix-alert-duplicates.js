/**
 * Fix script to clean duplicate AlertsSummary rows
 */
import dotenv from "dotenv";
dotenv.config();

import { connectMySQL } from "../src/mysqlDatabase.js";
import { AlertsSummary } from "../src/models/sql/index.js";

async function main() {
    await connectMySQL();

    console.log("\n=== Before Cleanup ===");
    const beforeRows = await AlertsSummary.findAll({ raw: true });
    beforeRows.forEach(s => {
        console.log(`  ID=${s.id} | ${s.alert_type}: ${s.employee_count}`);
    });

    // Delete ALL rows and let aggregate-dashboard.js regenerate
    console.log("\n=== Cleaning AlertsSummary table ===");
    await AlertsSummary.destroy({ where: {} });
    console.log("  ✓ All rows deleted");

    console.log("\n=== After Cleanup ===");
    const afterRows = await AlertsSummary.findAll({ raw: true });
    console.log(`  Rows remaining: ${afterRows.length}`);

    console.log("\n⚠️ Please run: node scripts/aggregate-dashboard.js");
    console.log("   to regenerate fresh data\n");

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
