/**
 * Sync Service - Case Study 3: Data Consistency
 * 
 * Handles synchronization between HR (MongoDB) and Payroll (MySQL) systems.
 * Implements Eventual Consistency pattern with retry mechanism.
 */

import { SyncLog, Earning, PayRate } from "../models/sql/index.js";
import logger from "../utils/logger.js";

const MAX_RETRIES = 3;

/**
 * Sync employee data to Payroll system (MySQL)
 * Called after successful MongoDB operation
 * 
 * @param {string} employeeId - The employee's ID
 * @param {string} action - CREATE, UPDATE, or DELETE
 * @param {object} employeeData - Employee data to sync
 * @returns {object} - Sync result with status
 */
export const syncEmployeeToPayroll = async (employeeId, action, employeeData = {}) => {
    // Create sync log entry
    const syncLog = await SyncLog.create({
        entity_type: "employee",
        entity_id: employeeId,
        action: action,
        status: "PENDING",
    });

    try {
        switch (action) {
            case "CREATE":
                // Initialize employee in Payroll system
                // Note: Actual earnings/benefits would be added separately
                // This ensures the employee exists in the system
                await ensurePayrollRecordExists(employeeId, employeeData);
                break;

            case "UPDATE":
                // Update would sync changed fields if applicable
                await updatePayrollRecord(employeeId, employeeData);
                break;

            case "DELETE":
                // Soft delete or cascade in Payroll
                await removePayrollRecord(employeeId);
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        // Mark as success
        await syncLog.update({
            status: "SUCCESS",
            completed_at: new Date(),
        });

        return { success: true, syncLogId: syncLog.id };

    } catch (error) {
        // Mark as failed
        await syncLog.update({
            status: "FAILED",
            error_message: error.message,
            retry_count: syncLog.retry_count + 1,
        });

        logger.error('SyncService', `Failed to sync employee ${employeeId}`, error);

        return { success: false, error: error.message, syncLogId: syncLog.id };
    }
};

/**
 * Ensure employee exists in Payroll system
 */
const ensurePayrollRecordExists = async (employeeId, data) => {
    // Check if employee has any payroll records
    const existingEarning = await Earning.findOne({
        where: { employee_id: employeeId }
    });

    if (!existingEarning) {
        // Create an initial placeholder record to register employee in Payroll
        // In a real system, this might create a PayRate entry or similar
        const payRateId = data.payRateId || 1; // Default pay rate

        const existingPayRate = await PayRate.findOne({
            where: { employee_id: employeeId }
        });

        if (!existingPayRate) {
            await PayRate.create({
                employee_id: employeeId,
                pay_rate: data.payRate || 0,
                pay_rate_id: payRateId,
            });
        }
    }

    logger.info('SyncService', `Employee ${employeeId} synced to Payroll (CREATE)`);
};

/**
 * Update employee payroll record
 */
const updatePayrollRecord = async (employeeId, data) => {
    if (data.payRate !== undefined) {
        await PayRate.update(
            { pay_rate: data.payRate },
            { where: { employee_id: employeeId } }
        );
    }

    logger.info('SyncService', `Employee ${employeeId} synced to Payroll (UPDATE)`);
};

/**
 * Remove employee from Payroll (soft delete approach)
 */
const removePayrollRecord = async (employeeId) => {
    // In a real system, you might soft-delete or archive
    // For now, we'll log this action but not actually delete payroll history
    logger.info('SyncService', `Employee ${employeeId} marked for removal in Payroll (DELETE)`);

    // Note: We don't delete earnings/vacation records - they're historical data
    // Only mark the employee as inactive if needed
};

/**
 * Retry failed sync operations (called by cron job or manually)
 * @returns {object} - Results of retry attempts
 */
export const retryFailedSyncs = async () => {
    const failedLogs = await SyncLog.findAll({
        where: {
            status: "FAILED",
            retry_count: { $lt: MAX_RETRIES }
        },
        order: [["createdAt", "ASC"]],
        limit: 100,
    });

    const results = {
        total: failedLogs.length,
        retried: 0,
        succeeded: 0,
        failed: 0,
    };

    for (const log of failedLogs) {
        results.retried++;

        try {
            // Re-attempt the sync
            const syncResult = await syncEmployeeToPayroll(
                log.entity_id,
                log.action,
                {} // Would need to fetch current data
            );

            if (syncResult.success) {
                results.succeeded++;
            } else {
                results.failed++;
            }
        } catch (error) {
            results.failed++;
            logger.error('SyncService', `Retry failed for ${log.entity_id}`, error);
        }
    }

    return results;
};

/**
 * Get sync status for an entity
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
    retryFailedSyncs,
    getSyncStatus,
};
