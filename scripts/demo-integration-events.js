/**
 * Demo Outbox Events - Create FAILED/DEAD events for retry testing
 *
 * Usage: node scripts/demo-integration-events.js
 */
import dotenv from "dotenv";
dotenv.config();

import { connectMySQL, syncDatabase } from "../src/mysqlDatabase.js";
import { IntegrationEvent } from "../src/models/sql/index.js";

const main = async () => {
    try {
        await connectMySQL();
        await syncDatabase();

        const now = new Date();
        const holdUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // keep FAILED visible for demo

        // Clean up prior demo rows to avoid duplicates
        await IntegrationEvent.destroy({
            where: { entity_id: ["EMP_DEMO_FAILED", "EMP_DEMO_DEAD"] },
        });

        const events = [
            {
                entity_type: "employee",
                entity_id: "EMP_DEMO_FAILED",
                action: "UPDATE",
                payload: { employeeId: "EMP_DEMO_FAILED", demo: true },
                status: "FAILED",
                attempts: 2,
                last_error: "Simulated failure for demo",
                // Set next_run_at in the future so worker won't auto-retry
                next_run_at: holdUntil,
            },
            {
                entity_type: "employee",
                entity_id: "EMP_DEMO_DEAD",
                action: "DELETE",
                payload: { employeeId: "EMP_DEMO_DEAD", demo: true },
                status: "DEAD",
                attempts: 5,
                last_error: "Simulated dead-letter event",
                next_run_at: null,
            },
        ];

        await IntegrationEvent.bulkCreate(events);
        console.log("[Demo] Inserted demo IntegrationEvent records.");
        process.exit(0);
    } catch (error) {
        console.error("[Demo] Failed:", error.message);
        process.exit(1);
    }
};

main();
