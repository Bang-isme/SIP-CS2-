/**
 * Sync Service (Refactored for Case Study 4)
 * 
 * Now uses the ServiceRegistry to broadcast sync operations to all active adapters.
 * The service doesn't know about specific integrations - it just calls the registry.
 * 
 * BACKWARDS COMPATIBLE: Keeps the old export name `syncEmployeeToPayroll` for existing callers.
 */

import serviceRegistry from '../registry/serviceRegistry.js';
import { SyncLog } from "../models/sql/index.js";
import logger from "../utils/logger.js";
import { createRequestId, normalizeRequestId } from "../utils/requestTracking.js";

const buildSyncContext = ({
    correlationId = null,
    source = "SYNC_SERVICE",
    integrationEventId = null,
} = {}) => ({
    correlationId: normalizeRequestId(correlationId) || createRequestId(),
    source,
    integrationEventId,
});

/**
 * Sync employee data to all registered external systems.
 * @param {string} employeeId - Employee ID.
 * @param {string} action - 'CREATE' | 'UPDATE' | 'DELETE'.
 * @param {Object} employeeData - Employee data from MongoDB.
 * @param {Object} syncContext - Correlation/source metadata for async tracing.
 * @returns {Promise<Object>} Aggregated result from all adapters.
 */
export async function syncEmployeeToPayroll(employeeId, action, employeeData = {}, syncContext = {}) {
    const integrations = serviceRegistry.getIntegrations();
    const resolvedSyncContext = buildSyncContext(syncContext);

    if (integrations.length === 0) {
        logger.warn("SyncService", "No active integrations found", {
            employeeId,
            action,
            correlationId: resolvedSyncContext.correlationId,
            source: resolvedSyncContext.source,
            integrationEventId: resolvedSyncContext.integrationEventId,
        });
        return {
            success: true,
            message: "No integrations configured",
            results: [],
            correlationId: resolvedSyncContext.correlationId,
        };
    }

    logger.info("SyncService", "Broadcasting employee sync to integrations", {
        employeeId,
        action,
        integrationCount: integrations.length,
        correlationId: resolvedSyncContext.correlationId,
        source: resolvedSyncContext.source,
        integrationEventId: resolvedSyncContext.integrationEventId,
    });

    // Prepare data object for adapters
    const dataForSync = {
        employeeId,
        ...employeeData,
    };

    const results = await Promise.allSettled(
        integrations.map((adapter) => adapter.sync(dataForSync, action, resolvedSyncContext))
    );

    const aggregatedResults = results.map((result, index) => ({
        adapter: integrations[index].name,
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason?.message : null,
    }));

    // Check if all succeeded
    const allSucceeded = aggregatedResults.every(r => r.status === 'fulfilled' && r.value?.success);

    return {
        success: allSucceeded,
        message: allSucceeded ? 'All integrations synced' : 'Some integrations failed',
        results: aggregatedResults,
        correlationId: resolvedSyncContext.correlationId,
    };
}

/**
 * Sync employee data to all systems (alias for syncEmployeeToPayroll).
 */
export const syncEmployeeToAll = syncEmployeeToPayroll;

/**
 * Initialize sync service (calls registry initialization).
 */
export async function initSyncService() {
    await serviceRegistry.initialize();
}

/**
 * Check health of all integrations.
 */
export async function checkIntegrationHealth() {
    return serviceRegistry.healthCheckAll();
}

/**
 * Retry failed sync operations (kept for backwards compatibility).
 * TODO: Could iterate through adapters that support retry.
 */
export const retryFailedSyncs = async ({ fallbackCorrelationId = null } = {}) => {
    // 1. Fetch failed logs
    const failedLogs = await SyncLog.findAll({
        where: {
            status: "FAILED",
        },
        order: [["createdAt", "ASC"]],
        limit: 100, // Batch limit
    });

    if (failedLogs.length === 0) {
        return { message: 'No failed syncs found.' };
    }

    logger.info("SyncService", "Retrying failed sync logs", {
        failedLogCount: failedLogs.length,
        fallbackCorrelationId: normalizeRequestId(fallbackCorrelationId),
    });

    // 2. Group by Entity ID and keep the latest failed action per entity.
    const latestFailedLogByEntity = new Map();
    failedLogs.forEach((log) => {
        latestFailedLogByEntity.set(log.entity_id, log);
    });
    const retryTargets = Array.from(latestFailedLogByEntity.values());
    let successCount = 0;
    let failCount = 0;

    // 3. Import Employee model for dynamic lookup
    const { default: Employee } = await import("../models/Employee.js"); // Dynamic import to avoid circular dep

    // 4. Process each unique entity
    for (const failedLog of retryTargets) {
        const employeeId = failedLog.entity_id;
        const retryContext = buildSyncContext({
            correlationId: failedLog.correlation_id || fallbackCorrelationId,
            source: "SYNC_RETRY_MANUAL",
        });
        try {
            const action = failedLog.action || "UPDATE";
            let payload = { employeeId };

            if (action !== "DELETE") {
                const employee = await Employee.findOne({ employeeId });
                if (!employee) {
                    logger.warn("SyncService", "Retry skipped because employee no longer exists", {
                        employeeId,
                        action,
                        correlationId: retryContext.correlationId,
                        source: retryContext.source,
                    });
                    failCount++;
                    continue;
                }
                payload = employee.toObject();
            }

            // Retry sync
            const result = await syncEmployeeToAll(employeeId, action, payload, retryContext);

            if (result.success) {
                successCount++;
                logger.info("SyncService", "Retry sync succeeded", {
                    employeeId,
                    action,
                    correlationId: retryContext.correlationId,
                    source: retryContext.source,
                });

                // Keep status transition inside SyncLog enum contract (PENDING/SUCCESS/FAILED)
                await SyncLog.update({ status: 'SUCCESS' }, {
                    where: {
                        entity_id: employeeId,
                        status: 'FAILED'
                    }
                });
            } else {
                failCount++;
                logger.warn("SyncService", "Retry sync returned failure", {
                    employeeId,
                    action,
                    correlationId: retryContext.correlationId,
                    source: retryContext.source,
                });
                // Increment retry count on logs
                await SyncLog.update({ retry_count: SyncLog.sequelize.literal('retry_count + 1') }, {
                    where: {
                        entity_id: employeeId,
                        status: 'FAILED'
                    }
                });
            }

        } catch (err) {
            failCount++;
            logger.error(
                "SyncService",
                `Retry exception for ${employeeId} [correlationId=${retryContext.correlationId}]`,
                err,
            );
        }
    }

    return {
        total: failedLogs.length,
        uniqueEntities: retryTargets.length,
        retried: successCount + failCount,
        succeeded: successCount,
        failed: failCount,
        message: `Retry complete. Success: ${successCount}, Failed: ${failCount}`,
    };
};

/**
 * Get sync status for an entity (kept for backwards compatibility).
 */
export const getSyncStatus = async (entityType, entityId) => {
    const log = await SyncLog.findOne({
        where: {
            entity_type: entityType,
            entity_id: entityId,
        },
        order: [["createdAt", "DESC"]],
    });
    return log;
};

export default {
    syncEmployeeToPayroll,
    syncEmployeeToAll,
    initSyncService,
    checkIntegrationHealth,
    retryFailedSyncs,
    getSyncStatus,
};
