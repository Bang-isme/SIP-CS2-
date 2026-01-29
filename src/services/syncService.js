/**
 * Sync Service (Refactored for Case Study 4)
 * 
 * Now uses the ServiceRegistry to broadcast sync operations to all active adapters.
 * The service doesn't know about specific integrations - it just calls the registry.
 * 
 * BACKWARDS COMPATIBLE: Keeps the old export name `syncEmployeeToPayroll` for existing callers.
 */

import serviceRegistry from '../registry/ServiceRegistry.js';
import { SyncLog } from "../models/sql/index.js";
import logger from "../utils/logger.js";

/**
 * Sync employee data to all registered external systems.
 * @param {string} employeeId - Employee ID.
 * @param {string} action - 'CREATE' | 'UPDATE' | 'DELETE'.
 * @param {Object} employeeData - Employee data from MongoDB.
 * @returns {Promise<Object>} Aggregated result from all adapters.
 */
export async function syncEmployeeToPayroll(employeeId, action, employeeData = {}) {
    const integrations = serviceRegistry.getIntegrations();

    if (integrations.length === 0) {
        logger.warn('[SyncService]', 'No active integrations found.');
        return { success: true, message: 'No integrations configured', results: [] };
    }

    logger.info('[SyncService]', `Broadcasting ${action} to ${integrations.length} integration(s)...`);

    // Prepare data object for adapters
    const dataForSync = {
        employeeId,
        ...employeeData,
    };

    const results = await Promise.allSettled(
        integrations.map(adapter => adapter.sync(dataForSync, action))
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
export const retryFailedSyncs = async () => {
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

    logger.info('[SyncService]', `Found ${failedLogs.length} failed syncs to retry.`);

    // 2. Group by Entity ID (to prevent double-processing same employee)
    const uniqueEntities = [...new Set(failedLogs.map(log => log.entity_id))];
    let successCount = 0;
    let failCount = 0;

    // 3. Import Employee model for dynamic lookup
    const { default: Employee } = await import("../models/Employee.js"); // Dynamic import to avoid circular dep

    // 4. Process each unique entity
    for (const employeeId of uniqueEntities) {
        try {
            // Get fresh data from Source of Truth (MongoDB)
            // We assume logical ID is stored in SyncLog, but let's check if it's _id or employeeId
            // The adapters seem to use 'id' or 'employeeId' depending on context. 
            // Ideally we need to find by correct field. 
            // In createEmployee, we called sync with `employeeId` (string).

            const employee = await Employee.findOne({ employeeId: employeeId });

            if (!employee) {
                logger.warn('[SyncService]', `Retry skipped: Employee ${employeeId} not found in DB.`);
                continue;
            }

            // Determine appropriate action (default to UPDATE for retries to be safe)
            // Ideally we should check the original action from SyncLog, 
            // but fetching fresh data implies an "UPDATE" state synchronization.
            const action = "UPDATE";

            // Retry sync
            const result = await syncEmployeeToAll(employeeId, action, employee.toObject());

            if (result.success) {
                successCount++;
                logger.info('[SyncService]', `Retry SUCCESS for ${employeeId}`);

                // Update historical logs to resolved (or just leave them and add a SUCCESS log)
                // Better practice: update the FAILED logs to RESOLVED or effectively 'archive' them
                await SyncLog.update({ status: 'RESOLVED' }, {
                    where: {
                        entity_id: employeeId,
                        status: 'FAILED'
                    }
                });
            } else {
                failCount++;
                logger.error('[SyncService]', `Retry FAILED for ${employeeId}`);
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
            logger.error('[SyncService]', `Retry EXCEPTION for ${employeeId}: ${err.message}`);
        }
    }

    return {
        total: failedLogs.length,
        uniqueEntities: uniqueEntities.length,
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
