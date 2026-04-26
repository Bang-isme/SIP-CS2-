import { Op } from "sequelize";
import Alert from "../models/Alert.js";
import Employee from "../models/Employee.js";
import { AlertEmployee, AlertsSummary, BenefitPlan, EmployeeBenefit, sequelize } from "../models/sql/index.js";
import { buildBenefitsChangeMatchesFromRows } from "../utils/benefitsPayrollImpact.js";
import logger from "../utils/logger.js";

const EMPLOYEE_BATCH_SIZE = 5000;
const SQL_INSERT_BATCH_SIZE = 5000;

const flushEmployeeBatch = async (rows, transaction) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    await AlertEmployee.bulkCreate(rows, { transaction });
};

export const refreshAlertAggregates = async () => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const now = new Date();

        await AlertEmployee.sync();
        return await sequelize.transaction(async (transaction) => {
            await AlertsSummary.destroy({ where: {}, transaction });
            await AlertEmployee.destroy({ where: {}, transaction });

            const activeAlerts = await Alert.find({ isActive: true }).lean();
            if (activeAlerts.length === 0) {
                return {
                    processedAlerts: 0,
                    summaryRows: 0,
                    totalMatchedEmployees: 0,
                };
            }

            const summaryRows = [];
            let totalMatchedEmployees = 0;

            for (const alert of activeAlerts) {
                let employeeBatch = [];
                let totalCount = 0;

                switch (alert.type) {
                    case "anniversary": {
                        const threshold = alert.threshold || 30;
                        const cursor = Employee.find({ hireDate: { $exists: true } })
                            .select("employeeId firstName lastName hireDate")
                            .lean()
                            .cursor({ batchSize: EMPLOYEE_BATCH_SIZE });

                        for await (const emp of cursor) {
                            if (!emp.hireDate) continue;
                            const hireDate = new Date(emp.hireDate);
                            const anniversaryThisYear = new Date(currentYear, hireDate.getMonth(), hireDate.getDate());

                            if (anniversaryThisYear < today) {
                                anniversaryThisYear.setFullYear(currentYear + 1);
                            }

                            const daysUntil = Math.ceil((anniversaryThisYear - today) / (1000 * 60 * 60 * 24));
                            if (daysUntil < 0 || daysUntil > threshold) continue;

                            totalCount += 1;
                            employeeBatch.push({
                                alert_type: "anniversary",
                                employee_id: emp.employeeId,
                                name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                                days_until: daysUntil,
                                extra_data: emp.hireDate?.toISOString?.() || String(emp.hireDate),
                                aggregated_at: now,
                            });

                            if (employeeBatch.length >= SQL_INSERT_BATCH_SIZE) {
                                await flushEmployeeBatch(employeeBatch, transaction);
                                employeeBatch = [];
                            }
                        }
                        break;
                    }

                    case "vacation": {
                        const threshold = alert.threshold || 20;
                        totalCount = await Employee.countDocuments({ vacationDays: { $gt: threshold } });

                        const cursor = Employee.find({ vacationDays: { $gt: threshold } })
                            .select("employeeId firstName lastName vacationDays")
                            .lean()
                            .cursor({ batchSize: EMPLOYEE_BATCH_SIZE });

                        for await (const emp of cursor) {
                            employeeBatch.push({
                                alert_type: "vacation",
                                employee_id: emp.employeeId,
                                name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                                days_until: emp.vacationDays,
                                extra_data: String(emp.vacationDays),
                                aggregated_at: now,
                            });

                            if (employeeBatch.length >= SQL_INSERT_BATCH_SIZE) {
                                await flushEmployeeBatch(employeeBatch, transaction);
                                employeeBatch = [];
                            }
                        }
                        break;
                    }

                    case "benefits_change": {
                        const threshold = alert.threshold || 7;
                        const cutoffDate = new Date();
                        cutoffDate.setDate(cutoffDate.getDate() - threshold);

                        const recentChanges = await EmployeeBenefit.findAll({
                            where: {
                                last_change_date: { [Op.gte]: cutoffDate.toISOString().split("T")[0] },
                            },
                            include: [{
                                model: BenefitPlan,
                                as: "plan",
                                attributes: ["name"],
                                required: false,
                            }],
                            raw: true,
                            nest: true,
                        });

                        const benefitMatches = buildBenefitsChangeMatchesFromRows(recentChanges, { now });
                        const impactByEmployee = new Map(benefitMatches.map((item) => [item.employeeId, item]));
                        const changedEmployeeIds = benefitMatches.map((item) => item.employeeId);
                        totalCount = changedEmployeeIds.length;

                        if (changedEmployeeIds.length > 0) {
                            const cursor = Employee.find({ employeeId: { $in: changedEmployeeIds } })
                                .select("employeeId firstName lastName")
                                .lean()
                                .cursor({ batchSize: EMPLOYEE_BATCH_SIZE });

                            for await (const emp of cursor) {
                                const impact = impactByEmployee.get(emp.employeeId);
                                if (!impact) continue;

                                employeeBatch.push({
                                    alert_type: "benefits_change",
                                    employee_id: emp.employeeId,
                                    name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                                    days_until: impact.sortDays,
                                    extra_data: impact.extraData,
                                    aggregated_at: now,
                                });

                                if (employeeBatch.length >= SQL_INSERT_BATCH_SIZE) {
                                    await flushEmployeeBatch(employeeBatch, transaction);
                                    employeeBatch = [];
                                }
                            }
                        }
                        break;
                    }

                    case "birthday": {
                        const cursor = Employee.find({ birthDate: { $exists: true } })
                            .select("employeeId firstName lastName birthDate")
                            .lean()
                            .cursor({ batchSize: EMPLOYEE_BATCH_SIZE });

                        for await (const emp of cursor) {
                            if (!emp.birthDate) continue;
                            const birthDate = new Date(emp.birthDate);
                            if (birthDate.getMonth() !== currentMonth) continue;

                            totalCount += 1;
                            const dayOfMonth = birthDate.getDate();
                            const birthdayThisYear = new Date(currentYear, currentMonth, dayOfMonth);
                            const daysUntil = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));

                            employeeBatch.push({
                                alert_type: "birthday",
                                employee_id: emp.employeeId,
                                name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                                days_until: daysUntil,
                                extra_data: emp.birthDate?.toISOString?.() || String(emp.birthDate),
                                aggregated_at: now,
                            });

                            if (employeeBatch.length >= SQL_INSERT_BATCH_SIZE) {
                                await flushEmployeeBatch(employeeBatch, transaction);
                                employeeBatch = [];
                            }
                        }
                        break;
                    }
                }

                if (employeeBatch.length > 0) {
                    await flushEmployeeBatch(employeeBatch, transaction);
                }

                totalMatchedEmployees += totalCount;

                if (totalCount > 0) {
                    summaryRows.push({
                        alert_type: alert.type,
                        threshold: alert.threshold || 0,
                        employee_count: totalCount,
                        matching_employees: JSON.stringify([]),
                        computed_at: now,
                    });
                }
            }

            if (summaryRows.length > 0) {
                await AlertsSummary.bulkCreate(summaryRows, { transaction });
            }

            return {
                processedAlerts: activeAlerts.length,
                summaryRows: summaryRows.length,
                totalMatchedEmployees,
            };
        });
    } catch (error) {
        logger.error("AlertAggregationService", "Failed to refresh alert aggregates", error);
        throw error;
    }
};
