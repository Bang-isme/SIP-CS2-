/**
 * Debug script to check AlertsSummary vs AlertEmployee counts
 */
import dotenv from "dotenv";
dotenv.config();

import { connectMySQL } from "../src/mysqlDatabase.js";
import { AlertsSummary } from "../src/models/sql/index.js";

async function main() {
    await connectMySQL();

    // Dynamic import for AlertEmployee
    const { default: AlertEmployee } = await import("../src/models/sql/AlertEmployee.js");

    console.log("\n=== AlertsSummary Table ===");
    const summaries = await AlertsSummary.findAll({ raw: true });
    summaries.forEach(s => {
        console.log(`  ${s.alert_type}: employee_count = ${s.employee_count}`);
    });

    console.log("\n=== AlertEmployee Table (Actual Counts) ===");
    const counts = await AlertEmployee.findAll({
        attributes: [
            'alert_type',
            [AlertEmployee.sequelize.fn('COUNT', AlertEmployee.sequelize.col('*')), 'actual_count']
        ],
        group: ['alert_type'],
        raw: true
    });
    counts.forEach(c => {
        console.log(`  ${c.alert_type}: actual_count = ${c.actual_count}`);
    });

    console.log("\n=== Discrepancy Analysis ===");
    const summaryMap = new Map(summaries.map(s => [s.alert_type, s.employee_count]));
    counts.forEach(c => {
        const summaryCount = summaryMap.get(c.alert_type) || 0;
        const actualCount = parseInt(c.actual_count);
        if (summaryCount !== actualCount) {
            console.log(`  ⚠️ ${c.alert_type}: Summary=${summaryCount}, Actual=${actualCount}, DIFF=${actualCount - summaryCount}`);
        } else {
            console.log(`  ✓ ${c.alert_type}: Counts match (${summaryCount})`);
        }
    });

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
