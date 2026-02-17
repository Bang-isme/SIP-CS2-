/**
 * Demo Integration Queue Scenarios
 *
 * Usage:
 *   node scripts/demo-integration-queue-scenario.js healthy
 *   node scripts/demo-integration-queue-scenario.js warning
 *   node scripts/demo-integration-queue-scenario.js critical
 *   node scripts/demo-integration-queue-scenario.js cleanup
 */
import dotenv from "dotenv";
dotenv.config();

import { Op } from "sequelize";
import { connectMySQL, syncDatabase } from "../src/mysqlDatabase.js";
import { IntegrationEvent } from "../src/models/sql/index.js";

const PREFIX = "EMP_DEMO_QUEUE_";
const VALID_SCENARIOS = ["healthy", "warning", "critical", "cleanup"];

const scenarioArg = (process.argv[2] || "").toLowerCase();
if (!VALID_SCENARIOS.includes(scenarioArg)) {
    console.log("Invalid or missing scenario.");
    console.log(`Valid values: ${VALID_SCENARIOS.join(", ")}`);
    process.exit(1);
}

const SCENARIOS = {
    healthy: {
        counts: { SUCCESS: 2 },
        oldestPendingAgeMinutes: 0,
    },
    warning: {
        counts: { PENDING: 30, FAILED: 8, DEAD: 4, SUCCESS: 2 },
        oldestPendingAgeMinutes: 15,
    },
    critical: {
        counts: { PENDING: 140, FAILED: 35, DEAD: 30, SUCCESS: 4 },
        oldestPendingAgeMinutes: 45,
    },
};

const actionForIndex = (index) => {
    const actions = ["CREATE", "UPDATE", "DELETE"];
    return actions[index % actions.length];
};

const buildRows = ({ counts, oldestPendingAgeMinutes }) => {
    const now = new Date();
    const holdUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const rows = [];
    let idx = 1;
    let oldestAssigned = false;

    const statusOrder = ["PENDING", "FAILED", "DEAD", "SUCCESS"];
    for (const status of statusOrder) {
        const count = counts[status] || 0;
        for (let i = 0; i < count; i += 1) {
            const entityId = `${PREFIX}${status}_${String(idx).padStart(4, "0")}`;
            const isOldestBacklogCandidate =
                !oldestAssigned &&
                oldestPendingAgeMinutes > 0 &&
                (status === "PENDING" || status === "FAILED");

            const createdAt = isOldestBacklogCandidate
                ? new Date(now.getTime() - oldestPendingAgeMinutes * 60 * 1000)
                : now;
            if (isOldestBacklogCandidate) oldestAssigned = true;

            rows.push({
                entity_type: "employee",
                entity_id: entityId,
                action: actionForIndex(idx),
                payload: { employeeId: entityId, demoQueue: true, scenario: scenarioArg },
                status,
                attempts:
                    status === "FAILED" ? 2 :
                        status === "DEAD" ? 5 :
                            0,
                last_error:
                    status === "FAILED" ? "Simulated failed event for demo" :
                        status === "DEAD" ? "Simulated dead-letter event for demo" :
                            null,
                next_run_at:
                    status === "PENDING" || status === "FAILED"
                        ? holdUntil
                        : null,
                processed_at: status === "SUCCESS" ? now : null,
                createdAt,
                updatedAt: createdAt,
            });
            idx += 1;
        }
    }

    return rows;
};

const cleanupDemoRows = async () => {
    await IntegrationEvent.destroy({
        where: {
            entity_id: {
                [Op.like]: `${PREFIX}%`,
            },
        },
    });
};

const printCurrentSnapshot = async () => {
    const grouped = await IntegrationEvent.findAll({
        attributes: [
            "status",
            [IntegrationEvent.sequelize.fn("COUNT", IntegrationEvent.sequelize.col("id")), "count"],
        ],
        where: {
            entity_id: {
                [Op.like]: `${PREFIX}%`,
            },
        },
        group: ["status"],
        raw: true,
    });

    const summary = { PENDING: 0, PROCESSING: 0, FAILED: 0, DEAD: 0, SUCCESS: 0 };
    for (const row of grouped) {
        const status = row.status;
        const count = parseInt(row.count, 10) || 0;
        if (Object.prototype.hasOwnProperty.call(summary, status)) {
            summary[status] = count;
        }
    }

    const backlog = summary.PENDING + summary.PROCESSING + summary.FAILED;
    const actionable = summary.FAILED + summary.DEAD;
    console.log("[DemoQueue] Snapshot:", summary);
    console.log(`[DemoQueue] backlog=${backlog}, actionable=${actionable}`);
};

const main = async () => {
    try {
        await connectMySQL();
        await syncDatabase();

        await cleanupDemoRows();
        if (scenarioArg === "cleanup") {
            console.log("[DemoQueue] Cleanup complete.");
            process.exit(0);
        }

        const scenarioConfig = SCENARIOS[scenarioArg];
        const rows = buildRows(scenarioConfig);
        await IntegrationEvent.bulkCreate(rows);
        console.log(`[DemoQueue] Seeded scenario: ${scenarioArg} (${rows.length} rows).`);
        await printCurrentSnapshot();
        process.exit(0);
    } catch (error) {
        console.error("[DemoQueue] Failed:", error.message);
        process.exit(1);
    }
};

main();
