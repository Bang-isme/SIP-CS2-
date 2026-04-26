import {
    recoverStuckProcessingIntegrationEvents,
} from "../services/integrationEventService.js";
import { buildIntegrationMetricsSnapshot } from "../services/integrationMetricsService.js";
import {
    buildIntegrationReconciliationSnapshot,
    repairExtraPayrollCoverage,
} from "../services/integrationReconciliationService.js";
import {
    buildIntegrationMeta,
    IntegrationContractError,
    normalizeIntegrationAuditQuery,
    normalizeIntegrationEventIdParam,
    normalizeIntegrationListQuery,
    normalizeReplayPayload,
    REPLAYABLE_STATUSES,
    sendIntegrationContractError,
} from "../utils/integrationContracts.js";
import {
    createNotFoundError,
    respondWithApiError,
    sendApiError,
} from "../utils/apiErrors.js";
import {
    replayIntegrationEventsByFilter,
    requeueDeadIntegrationEvents,
    requeueIntegrationEventById,
} from "../services/integrationOperatorService.js";
import { listIntegrationEventAudits } from "../services/integrationAuditService.js";
import { IntegrationEventStore } from "../repositories/integrationStore.js";

export const listIntegrationEvents = async (req, res) => {
    try {
        const {
            status,
            limit,
            page,
            offset,
        } = normalizeIntegrationListQuery(req.query);

        const where = {};
        if (status) where.status = status;

        const [total, events] = await Promise.all([
            IntegrationEventStore.count({ where }),
            IntegrationEventStore.findAll({
                where,
                order: [["createdAt", "DESC"]],
                limit,
                offset,
            }),
        ]);

        res.json({
            success: true,
            data: events,
            meta: buildIntegrationMeta({
                dataset: "integrationEvents",
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
                totalPages: Math.ceil(total / limit),
                filters: {
                    status: status || null,
                },
                actorId: req.userId || null,
            }),
        });
    } catch (error) {
        if (error instanceof IntegrationContractError) {
            return sendIntegrationContractError(res, error);
        }
        return respondWithApiError({
            req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_EVENT_LIST_FAILED",
        });
    }
};

export const getIntegrationMetrics = async (_req, res) => {
    try {
        const metrics = await buildIntegrationMetricsSnapshot();
        res.json({
            success: true,
            data: metrics,
            meta: buildIntegrationMeta({
                dataset: "integrationMetrics",
                generatedAt: new Date().toISOString(),
                actorId: _req.userId || null,
                filters: {},
            }),
        });
    } catch (error) {
        return respondWithApiError({
            req: _req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_METRICS_FAILED",
        });
    }
};

export const getIntegrationReconciliation = async (req, res) => {
    try {
        const forceRefresh = ["1", "true", "yes"].includes(String(req.query?.fresh || "").toLowerCase());
        const snapshot = await buildIntegrationReconciliationSnapshot({ forceRefresh });
        res.json({
            success: true,
            data: snapshot,
            meta: buildIntegrationMeta({
                dataset: "integrationReconciliation",
                generatedAt: snapshot.checkedAt,
                actorId: req.userId || null,
                filters: { fresh: forceRefresh },
            }),
        });
    } catch (error) {
        return respondWithApiError({
            req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_RECONCILIATION_FAILED",
        });
    }
};

export const repairIntegrationReconciliation = async (req, res) => {
    try {
        const result = await repairExtraPayrollCoverage({
            actorId: req.userId || null,
            requestId: req.requestId || null,
        });

        res.json({
            success: true,
            message: result.repaired
                ? "Payroll extras repaired"
                : "No payroll extras",
            data: result,
            meta: buildIntegrationMeta({
                dataset: "integrationReconciliationRepair",
                generatedAt: new Date().toISOString(),
                actorId: req.userId || null,
                filters: {
                    repair: "extra-active-payroll",
                },
            }),
        });
    } catch (error) {
        return respondWithApiError({
            req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_RECONCILIATION_REPAIR_FAILED",
        });
    }
};

export const getIntegrationEventAudit = async (req, res) => {
    try {
        const id = normalizeIntegrationEventIdParam(req.params.id);
        const {
            limit,
            page,
            offset,
        } = normalizeIntegrationAuditQuery(req.query);
        const result = await listIntegrationEventAudits({
            integrationEventId: id,
            limit,
            offset,
        });

        res.json({
            success: true,
            data: result.rows,
            meta: buildIntegrationMeta({
                dataset: "integrationEventAudit",
                actorId: req.userId || null,
                total: result.total,
                page,
                limit,
                pages: Math.ceil(result.total / limit),
                totalPages: Math.ceil(result.total / limit),
                filters: { id },
            }),
        });
    } catch (error) {
        if (error instanceof IntegrationContractError) {
            return sendIntegrationContractError(res, error);
        }
        return respondWithApiError({
            req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_AUDIT_LOOKUP_FAILED",
        });
    }
};

export const retryIntegrationEvent = async (req, res) => {
    try {
        const id = normalizeIntegrationEventIdParam(req.params.id);
        const event = await requeueIntegrationEventById(id, {
            actorId: req.userId || null,
            requestId: req.requestId || null,
        });
        if (!event) {
            return sendApiError(
                res,
                createNotFoundError("Event not found", "INTEGRATION_EVENT_NOT_FOUND"),
            );
        }

        res.json({
            success: true,
            message: "Retry queued",
            data: {
                id,
                previousStatus: event.status,
                entityType: event.entity_type,
                entityId: event.entity_id,
                action: event.action,
            },
            meta: buildIntegrationMeta({
                dataset: "integrationRetry",
                actorId: req.userId || null,
                filters: { id },
            }),
        });
    } catch (error) {
        if (error instanceof IntegrationContractError) {
            return sendIntegrationContractError(res, error);
        }
        return respondWithApiError({
            req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_RETRY_FAILED",
        });
    }
};

export const retryDeadIntegrationEvents = async (req, res) => {
    try {
        const count = await requeueDeadIntegrationEvents({
            actorId: req.userId || null,
            requestId: req.requestId || null,
        });

        res.json({
            success: true,
            message: "Dead events queued",
            data: { count },
            meta: buildIntegrationMeta({
                dataset: "integrationRetryDead",
                actorId: req.userId || null,
                filters: { status: "DEAD" },
            }),
        });
    } catch (error) {
        return respondWithApiError({
            req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_RETRY_DEAD_FAILED",
        });
    }
};

export const recoverStuckIntegrationEvents = async (req, res) => {
    try {
        const result = await recoverStuckProcessingIntegrationEvents({
            actorId: req.userId || null,
            requestId: req.requestId || null,
            operatorAction: "recover-stuck",
        });

        res.json({
            success: true,
            message: result.count
                ? "Processing recovered"
                : "No stale processing",
            data: result,
            meta: buildIntegrationMeta({
                dataset: "integrationRecoverStuck",
                actorId: req.userId || null,
                filters: { status: "PROCESSING" },
            }),
        });
    } catch (error) {
        return respondWithApiError({
            req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_RECOVER_STUCK_FAILED",
        });
    }
};

export const replayIntegrationEvents = async (req, res) => {
    try {
        const {
            status,
            entityType,
            entityId,
            fromDays,
            fromDate,
        } = normalizeReplayPayload(req.body || {});
        const statuses = status ? [status] : REPLAYABLE_STATUSES;
        const since = fromDate
            || (Number.isInteger(fromDays)
                ? new Date(Date.now() - fromDays * 24 * 60 * 60 * 1000)
                : null);
        const result = await replayIntegrationEventsByFilter({
            statuses,
            entityType,
            entityId,
            since,
        }, {
            actorId: req.userId || null,
            requestId: req.requestId || null,
        });

        res.json({
            success: true,
            message: "Replay queued",
            data: { count: result.count },
            meta: buildIntegrationMeta({
                dataset: "integrationReplay",
                actorId: req.userId || null,
                filters: result.filters,
            }),
        });
    } catch (error) {
        if (error instanceof IntegrationContractError) {
            return sendIntegrationContractError(res, error);
        }
        return respondWithApiError({
            req,
            res,
            error,
            context: "IntegrationController",
            defaultCode: "INTEGRATION_REPLAY_FAILED",
        });
    }
};
