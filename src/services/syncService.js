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
    const failedLogs = await SyncLog.findAll({
        where: {
            status: "FAILED",
        },
        order: [["createdAt", "ASC"]],
        limit: 100,
    });

    logger.info('[SyncService]', `Found ${failedLogs.length} failed syncs to retry.`);

    // In adapter-based architecture, retries would re-broadcast to all adapters
    // This is a simplified implementation
    return {
        total: failedLogs.length,
        retried: 0,
        succeeded: 0,
        failed: 0,
        message: 'Retry functionality pending adapter-level implementation',
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
