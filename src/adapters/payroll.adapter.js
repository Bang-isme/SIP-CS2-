/**
 * Payroll Adapter
 * Syncs employee data to MySQL Payroll System.
 * This is a refactor of the original syncService logic.
 */

import BaseAdapter from './base.adapter.js';
import { PayRate, SyncLog } from '../models/sql/index.js';
import { sequelize } from '../models/sql/index.js';

const normalizePayType = (input) => {
    const normalized = String(input || 'HOURLY').trim().toUpperCase();
    const allowed = new Set(['HOURLY', 'SALARY', 'COMMISSION', 'TERMINATED']);
    return allowed.has(normalized) ? normalized : 'HOURLY';
};

export class PayrollAdapter extends BaseAdapter {
    constructor() {
        super('PayrollAdapter');
    }

    async sync(employeeData, action) {
        const t = await sequelize.transaction();
        const syncLog = {
            source_system: 'HR_MongoDB',
            target_system: 'Payroll_MySQL',
            entity_type: 'employee',
            entity_id: employeeData.employeeId || employeeData._id?.toString(),
            action: action,
            status: 'PENDING',
            created_at: new Date(),
        };

        try {
            switch (action) {
                case 'CREATE':
                    await this._handleCreate(employeeData, t);
                    break;
                case 'UPDATE':
                    await this._handleUpdate(employeeData, t);
                    break;
                case 'DELETE':
                    await this._handleDelete(employeeData, t);
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            await t.commit();
            syncLog.status = 'SUCCESS';
            syncLog.synced_at = new Date();
            await SyncLog.create(syncLog);
            console.log(`[${this.name}] ${action} synced for employee ${syncLog.entity_id}`);
            return { success: true, message: `Synced to Payroll` };

        } catch (error) {
            await t.rollback();
            syncLog.status = 'FAILED';
            syncLog.error_message = error.message;
            await SyncLog.create(syncLog);
            console.error(`[${this.name}] Sync failed:`, error.message);
            return { success: false, message: error.message };
        }
    }

    async _handleCreate(data, t) {
        const employeeId = data.employeeId || data._id?.toString();
        // Ensure PayRate exists for this employee
        const existingRate = await PayRate.findOne({ where: { employee_id: employeeId }, transaction: t });
        if (!existingRate) {
            await PayRate.create({
                employee_id: employeeId,
                pay_rate: data.payRate || 0,
                pay_type: normalizePayType(data.payType),
                effective_date: new Date(),
                is_active: true,
            }, { transaction: t });
        }
    }

    async _handleUpdate(data, t) {
        const employeeId = data.employeeId || data._id?.toString();
        if (data.payRate !== undefined || data.payType !== undefined) {
            const updatePayload = {
                effective_date: new Date(),
                is_active: true,
            };
            if (data.payRate !== undefined) {
                updatePayload.pay_rate = data.payRate;
            }
            if (data.payType !== undefined) {
                updatePayload.pay_type = normalizePayType(data.payType);
            }

            await PayRate.update(
                updatePayload,
                { where: { employee_id: employeeId }, transaction: t }
            );
        }
    }

    async _handleDelete(data, t) {
        const employeeId = data.employeeId || data._id?.toString();
        // Soft delete or mark as inactive in payroll, not hard delete earnings history
        await PayRate.update(
            {
                pay_type: 'TERMINATED',
                is_active: false,
                effective_date: new Date(),
            },
            { where: { employee_id: employeeId }, transaction: t }
        );
    }

    async healthCheck() {
        try {
            await sequelize.authenticate();
            return { healthy: true, message: 'MySQL Payroll connected' };
        } catch (error) {
            return { healthy: false, message: error.message };
        }
    }
}

export default PayrollAdapter;
