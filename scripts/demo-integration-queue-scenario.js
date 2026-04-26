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

import mongoose from "mongoose";
import connectMongo from "../src/database.js";
import IntegrationEvent from "../src/models/IntegrationEvent.js";
import IntegrationEventAudit from "../src/models/IntegrationEventAudit.js";
import { IntegrationEventAuditStore, IntegrationEventStore } from "../src/repositories/integrationStore.js";

const PREFIX = "EMP_DEMO_QUEUE_";
const DEMO_OPERATOR = "demo.operator";
const DEMO_REQUEST_PREFIX = "demo-queue";
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

const buildAuditSeeds = (events = []) => {
    const now = Date.now();
    const picks = {
        retrySingle: events.find((event) => event.status === "PENDING"),
        retryDead: events.find((event, index) => event.status === "PENDING" && index > 0),
        replay: events.find((event, index) => event.status === "PENDING" && index > 1),
        failedRecover: events.find((event) => event.status === "FAILED"),
        deadRecover: events.find((event) => event.status === "DEAD"),
    };

    const specs = [
        picks.retrySingle && {
            event: picks.retrySingle,
            action: "retry-event",
            actorId: DEMO_OPERATOR,
            requestId: `${DEMO_REQUEST_PREFIX}-retry-${picks.retrySingle.id}`,
            sourceStatus: "FAILED",
            targetStatus: "PENDING",
            details: {
                scope: "single-event",
                entityType: picks.retrySingle.entity_type,
                entityId: picks.retrySingle.entity_id,
                eventAction: picks.retrySingle.action,
            },
            occurredAt: new Date(now - 12 * 60 * 1000),
        },
        picks.retryDead && {
            event: picks.retryDead,
            action: "retry-dead",
            actorId: DEMO_OPERATOR,
            requestId: `${DEMO_REQUEST_PREFIX}-retry-dead`,
            sourceStatus: "DEAD",
            targetStatus: "PENDING",
            details: {
                scope: "batch-status",
                entityType: picks.retryDead.entity_type,
                entityId: picks.retryDead.entity_id,
                eventAction: picks.retryDead.action,
                filters: { status: "DEAD" },
            },
            occurredAt: new Date(now - 9 * 60 * 1000),
        },
        picks.replay && {
            event: picks.replay,
            action: "replay-events",
            actorId: DEMO_OPERATOR,
            requestId: `${DEMO_REQUEST_PREFIX}-replay`,
            sourceStatus: "FAILED",
            targetStatus: "PENDING",
            details: {
                scope: "filtered-replay",
                entityType: picks.replay.entity_type,
                entityId: picks.replay.entity_id,
                eventAction: picks.replay.action,
                filters: {
                    statuses: ["FAILED", "DEAD"],
                    entityType: picks.replay.entity_type,
                    entityId: picks.replay.entity_id,
                },
            },
            occurredAt: new Date(now - 6 * 60 * 1000),
        },
        picks.failedRecover && {
            event: picks.failedRecover,
            action: "recover-stuck",
            actorId: DEMO_OPERATOR,
            requestId: `${DEMO_REQUEST_PREFIX}-recover-failed`,
            sourceStatus: "PROCESSING",
            targetStatus: "FAILED",
            details: {
                scope: "recover-stuck",
                entityType: picks.failedRecover.entity_type,
                entityId: picks.failedRecover.entity_id,
                eventAction: picks.failedRecover.action,
                timeoutMinutes: 15,
            },
            occurredAt: new Date(now - 4 * 60 * 1000),
        },
        picks.deadRecover && {
            event: picks.deadRecover,
            action: "recover-stuck",
            actorId: DEMO_OPERATOR,
            requestId: `${DEMO_REQUEST_PREFIX}-recover-dead`,
            sourceStatus: "PROCESSING",
            targetStatus: "DEAD",
            details: {
                scope: "recover-stuck",
                entityType: picks.deadRecover.entity_type,
                entityId: picks.deadRecover.entity_id,
                eventAction: picks.deadRecover.action,
                timeoutMinutes: 15,
            },
            occurredAt: new Date(now - 2 * 60 * 1000),
        },
    ].filter(Boolean);

    return specs;
};

const seedAuditRows = async (events = []) => {
    const auditSeeds = buildAuditSeeds(events);
    if (auditSeeds.length === 0) {
        return 0;
    }

    await IntegrationEventAuditStore.bulkCreate(auditSeeds.map((seed) => ({
        integration_event_id: seed.event.id,
        operator_action: seed.action,
        operator_actor_id: seed.actorId,
        operator_request_id: seed.requestId,
        source_status: seed.sourceStatus,
        target_status: seed.targetStatus,
        details: seed.details,
        createdAt: seed.occurredAt,
        updatedAt: seed.occurredAt,
    })));

    for (const seed of auditSeeds) {
        await IntegrationEvent.updateOne(
            { id: seed.event.id },
            {
                $set: {
                    last_operator_action: seed.action,
                    last_operator_actor_id: seed.actorId,
                    last_operator_request_id: seed.requestId,
                    last_operator_at: seed.occurredAt,
                },
            },
        );
    }

    return auditSeeds.length;
};

const cleanupDemoRows = async () => {
    const demoEventIds = await IntegrationEvent.find({
        entity_id: {
            $regex: `^${PREFIX}`,
        },
    }).select("id").lean();

    if (demoEventIds.length > 0) {
        await IntegrationEventAudit.deleteMany({
            integration_event_id: {
                $in: demoEventIds.map((event) => event.id),
            },
        });
    }

    await IntegrationEvent.deleteMany({
        entity_id: {
            $regex: `^${PREFIX}`,
        },
    });
};

const printCurrentSnapshot = async () => {
    const grouped = await IntegrationEvent.aggregate([
        {
            $match: {
                entity_id: {
                    $regex: `^${PREFIX}`,
                },
            },
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);

    const summary = { PENDING: 0, PROCESSING: 0, FAILED: 0, DEAD: 0, SUCCESS: 0 };
    for (const row of grouped) {
        const status = row._id;
        const count = parseInt(row.count, 10) || 0;
        if (Object.prototype.hasOwnProperty.call(summary, status)) {
            summary[status] = count;
        }
    }

    const backlog = summary.PENDING + summary.PROCESSING + summary.FAILED;
    const actionable = summary.FAILED + summary.DEAD;
    const auditCount = await IntegrationEventAudit.countDocuments({
        integration_event_id: {
            $in: (await IntegrationEvent.find({
                entity_id: {
                    $regex: `^${PREFIX}`,
                },
            }).select("id").lean()).map((event) => event.id),
        },
    });
    console.log("[DemoQueue] Snapshot:", summary);
    console.log(`[DemoQueue] backlog=${backlog}, actionable=${actionable}`);
    console.log(`[DemoQueue] auditEntries=${auditCount}`);
};

const main = async () => {
    try {
        await connectMongo();

        await cleanupDemoRows();
        if (scenarioArg === "cleanup") {
            console.log("[DemoQueue] Cleanup complete.");
            return;
        }

        const scenarioConfig = SCENARIOS[scenarioArg];
        const rows = buildRows(scenarioConfig);
        const createdEvents = await IntegrationEventStore.bulkCreate(rows);
        const seededAuditCount = await seedAuditRows(createdEvents);
        console.log(`[DemoQueue] Seeded scenario: ${scenarioArg} (${rows.length} rows).`);
        if (seededAuditCount > 0) {
            console.log(`[DemoQueue] Seeded operator audit entries: ${seededAuditCount}.`);
        }
        await printCurrentSnapshot();
    } catch (error) {
        console.error("[DemoQueue] Failed:", error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
};

main();
