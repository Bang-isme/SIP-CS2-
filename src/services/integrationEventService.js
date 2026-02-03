import { Op } from "sequelize";
import { IntegrationEvent } from "../models/sql/index.js";
import { syncEmployeeToAll } from "./syncService.js";
import {
    OUTBOX_BATCH_SIZE,
    OUTBOX_MAX_ATTEMPTS,
} from "../config.js";

const getBackoffMs = (attempts) => {
    const baseMs = 5000;
    const exp = Math.max(attempts - 1, 0);
    return Math.min(60000, baseMs * Math.pow(2, exp));
};

export const enqueueIntegrationEvent = async ({ entityType, entityId, action, payload }) => {
    return IntegrationEvent.create({
        entity_type: entityType,
        entity_id: entityId,
        action,
        payload: payload || {},
        status: "PENDING",
        attempts: 0,
        next_run_at: null,
    });
};

export const processPendingIntegrationEvents = async () => {
    const now = new Date();
    const events = await IntegrationEvent.findAll({
        where: {
            status: { [Op.in]: ["PENDING", "FAILED"] },
            [Op.or]: [
                { next_run_at: null },
                { next_run_at: { [Op.lte]: now } },
            ],
        },
        order: [["createdAt", "ASC"]],
        limit: OUTBOX_BATCH_SIZE,
    });

    for (const event of events) {
        const claimed = await IntegrationEvent.update(
            { status: "PROCESSING" },
            { where: { id: event.id, status: event.status } }
        );
        if (!claimed[0]) continue;

        try {
            const result = await syncEmployeeToAll(
                event.entity_id,
                event.action,
                event.payload || {}
            );

            if (result?.success) {
                await IntegrationEvent.update(
                    {
                        status: "SUCCESS",
                        processed_at: new Date(),
                        last_error: null,
                    },
                    { where: { id: event.id } }
                );
            } else {
                const attempts = (event.attempts || 0) + 1;
                const isDead = attempts >= OUTBOX_MAX_ATTEMPTS;
                await IntegrationEvent.update(
                    {
                        status: isDead ? "DEAD" : "FAILED",
                        attempts,
                        last_error: result?.message || "Unknown sync error",
                        next_run_at: isDead
                            ? null
                            : new Date(Date.now() + getBackoffMs(attempts)),
                    },
                    { where: { id: event.id } }
                );
            }
        } catch (error) {
            const attempts = (event.attempts || 0) + 1;
            const isDead = attempts >= OUTBOX_MAX_ATTEMPTS;
            await IntegrationEvent.update(
                {
                    status: isDead ? "DEAD" : "FAILED",
                    attempts,
                    last_error: error.message,
                    next_run_at: isDead
                        ? null
                        : new Date(Date.now() + getBackoffMs(attempts)),
                },
                { where: { id: event.id } }
            );
        }
    }
};
