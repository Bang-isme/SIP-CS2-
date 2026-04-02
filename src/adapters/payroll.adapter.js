/**
 * Payroll Adapter
 * Syncs employee data to MySQL Payroll System.
 * This is a refactor of the original syncService logic.
 */

import BaseAdapter from './base.adapter.js';
import { PayRate, SyncLog } from '../models/sql/index.js';
import { sequelize } from '../models/sql/index.js';
import logger from '../utils/logger.js';

const normalizePayType = (input) => {
    const normalized = String(input || 'HOURLY').trim().toUpperCase();
    const allowed = new Set(['HOURLY', 'SALARY', 'COMMISSION', 'TERMINATED']);
    return allowed.has(normalized) ? normalized : 'HOURLY';
};

export class PayrollAdapter extends BaseAdapter {
    constructor() {
        super('PayrollAdapter');
    }

    async sync(employeeData, action, syncContext = {}) {
        const t = await sequelize.transaction();
        const syncLog = {
            source_system: 'HR_MongoDB',
            target_system: 'Payroll_MySQL',
            entity_type: 'employee',
            entity_id: employeeData.employeeId || employeeData._id?.toString(),
            correlation_id: syncContext.correlationId || null,
            action: action,
            status: 'PENDING',
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
            syncLog.completed_at = new Date();
            await SyncLog.create(syncLog);
            logger.info(this.name, 'Employee synced to payroll', {
                employeeId: syncLog.entity_id,
                action,
                correlationId: syncLog.correlation_id,
                source: syncContext.source || null,
                integrationEventId: syncContext.integrationEventId || null,
            });
            return { success: true, message: `Synced to Payroll` };

        } catch (error) {
            await t.rollback();
            syncLog.status = 'FAILED';
            syncLog.error_message = error.message;
            syncLog.completed_at = new Date();
            await SyncLog.create(syncLog);
            logger.warn(this.name, 'Payroll sync failed', {
                employeeId: syncLog.entity_id,
                action,
                correlationId: syncLog.correlation_id,
                source: syncContext.source || null,
                integrationEventId: syncContext.integrationEventId || null,
                errorMessage: error.message,
            });
            return { success: false, message: error.message };
        }
    }

    async _handleCreate(data, t) {
        const employeeId = data.employeeId || data._id?.toString();
        const existingRate = await PayRate.findOne({
            where: {
                employee_id: employeeId,
                is_active: true,
            },
            order: [["effective_date", "DESC"], ["id", "DESC"]],
            transaction: t,
        });
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
            const currentRate = await PayRate.findOne({
                where: {
                    employee_id: employeeId,
                    is_active: true,
                },
                order: [["effective_date", "DESC"], ["id", "DESC"]],
                transaction: t,
            });
            await PayRate.update(
                { is_active: false },
                { where: { employee_id: employeeId, is_active: true }, transaction: t }
            );

            await PayRate.create({
                employee_id: employeeId,
                pay_rate: data.payRate !== undefined
                    ? data.payRate
                    : Number(currentRate?.pay_rate || 0),
                pay_type: normalizePayType(data.payType !== undefined ? data.payType : currentRate?.pay_type),
                effective_date: new Date(),
                is_active: true,
            }, { transaction: t });
        }
    }

    async _handleDelete(data, t) {
        const employeeId = data.employeeId || data._id?.toString();
        const currentRate = await PayRate.findOne({
            where: {
                employee_id: employeeId,
                is_active: true,
            },
            order: [["effective_date", "DESC"], ["id", "DESC"]],
            transaction: t,
        });

        await PayRate.update(
            {
                is_active: false,
            },
            { where: { employee_id: employeeId, is_active: true }, transaction: t }
        );

        await PayRate.create({
            employee_id: employeeId,
            pay_rate: Number(currentRate?.pay_rate || 0),
            pay_type: 'TERMINATED',
            effective_date: new Date(),
            is_active: false,
        }, { transaction: t });
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
