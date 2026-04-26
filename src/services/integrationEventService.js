import { Op } from "sequelize";
import { syncEmployeeToAll } from "./syncService.js";
import { recordIntegrationEventAudit } from "./integrationAuditService.js";
import logger from "../utils/logger.js";
import { IntegrationEventStore } from "../repositories/integrationStore.js";
import {
    OUTBOX_BATCH_SIZE,
    OUTBOX_MAX_ATTEMPTS,
    OUTBOX_PROCESSING_TIMEOUT_MS,
} from "../config.js";
import { createRequestId, normalizeRequestId } from "../utils/requestTracking.js";

const resolveCorrelationId = (value) => normalizeRequestId(value) || createRequestId();

const getBackoffMs = (attempts) => {
    const baseMs = 5000;
    const exp = Math.max(attempts - 1, 0);
    return Math.min(60000, baseMs * Math.pow(2, exp));
};

const getProcessingTimeoutMinutes = () => {
    return Math.max(1, Math.floor(OUTBOX_PROCESSING_TIMEOUT_MS / 60000));
};

const getStaleProcessingWhere = (now = new Date()) => {
    return {
        status: "PROCESSING",
        updatedAt: {
            [Op.lte]: new Date(now.getTime() - OUTBOX_PROCESSING_TIMEOUT_MS),
        },
    };
};

export const enqueueIntegrationEvent = async ({
    entityType,
    entityId,
    action,
    payload,
    correlationId = null,
}) => {
    return IntegrationEventStore.create({
        entity_type: entityType,
        entity_id: entityId,
        action,
        payload: payload || {},
        correlation_id: resolveCorrelationId(correlationId),
        status: "PENDING",
        attempts: 0,
        next_run_at: null,
    });
};

export const countStuckProcessingIntegrationEvents = async ({ now = new Date() } = {}) => {
    return IntegrationEventStore.count({
        where: getStaleProcessingWhere(now),
    });
};

export const recoverStuckProcessingIntegrationEvents = async ({
    now = new Date(),
    operatorAction = null,
    actorId = null,
    requestId = null,
} = {}) => {
    const staleEvents = await IntegrationEventStore.findAll({
        where: getStaleProcessingWhere(now),
        order: [["updatedAt", "ASC"]],
    });

    if (!staleEvents.length) {
        return {
            count: 0,
            recoveredIds: [],
            timeoutMinutes: getProcessingTimeoutMinutes(),
        };
    }

    const timeoutMinutes = getProcessingTimeoutMinutes();
    const recoveredIds = [];

    for (const event of staleEvents) {
        const attempts = (event.attempts || 0) + 1;
        const isDead = attempts >= OUTBOX_MAX_ATTEMPTS;
        const nextRunAt = isDead
            ? null
            : new Date(now.getTime() + getBackoffMs(attempts));
        const lastError = [
            `Worker timeout after ${timeoutMinutes} minute(s) in PROCESSING`,
            event.last_error ? `Previous: ${event.last_error}` : null,
        ].filter(Boolean).join(" | ");

        const [updated] = await IntegrationEventStore.update(
            {
                status: isDead ? "DEAD" : "FAILED",
                attempts,
                last_error: lastError,
                next_run_at: nextRunAt,
                processed_at: null,
                ...(operatorAction ? {
                    last_operator_action: operatorAction,
                    last_operator_actor_id: actorId,
                    last_operator_request_id: requestId,
                    last_operator_at: now,
                } : {}),
            },
            { where: { id: event.id, status: "PROCESSING" } }
        );

        if (updated) {
            if (operatorAction) {
                await recordIntegrationEventAudit({
                    integrationEventId: event.id,
                    operatorAction,
                    operatorActorId: actorId,
                    operatorRequestId: requestId,
                    sourceStatus: "PROCESSING",
                    targetStatus: isDead ? "DEAD" : "FAILED",
                    details: {
                        scope: "recover-stuck",
                        timeoutMinutes,
                    },
                    occurredAt: now,
                });
            }
            recoveredIds.push(event.id);
        }
    }

    return {
        count: recoveredIds.length,
        recoveredIds,
        timeoutMinutes,
    };
};

export const processPendingIntegrationEvents = async () => {
    await recoverStuckProcessingIntegrationEvents();

    const now = new Date();
    const events = await IntegrationEventStore.findAll({
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
        const correlationId = resolveCorrelationId(event.correlation_id);
        const claimed = await IntegrationEventStore.update(
            {
                status: "PROCESSING",
                correlation_id: correlationId,
            },
            { where: { id: event.id, status: event.status } }
        );
        if (!claimed[0]) continue;

        try {
            const result = await syncEmployeeToAll(
                event.entity_id,
                event.action,
                event.payload || {},
                {
                    correlationId,
                    source: "OUTBOX_WORKER",
                    integrationEventId: event.id,
                }
            );

            if (result?.success) {
                await IntegrationEventStore.update(
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
                await IntegrationEventStore.update(
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
                logger.warn("IntegrationEventService", "Outbox event sync reported failure", {
                    eventId: event.id,
                    entityId: event.entity_id,
                    action: event.action,
                    correlationId,
                    attempts,
                    targetStatus: isDead ? "DEAD" : "FAILED",
                    message: result?.message || "Unknown sync error",
                });
            }
        } catch (error) {
            const attempts = (event.attempts || 0) + 1;
            const isDead = attempts >= OUTBOX_MAX_ATTEMPTS;
            await IntegrationEventStore.update(
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
            logger.warn("IntegrationEventService", "Outbox event sync threw exception", {
                eventId: event.id,
                entityId: event.entity_id,
                action: event.action,
                correlationId,
                attempts,
                targetStatus: isDead ? "DEAD" : "FAILED",
                errorMessage: error.message,
            });
        }
    }
};
