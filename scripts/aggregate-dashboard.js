/**
 * Dashboard Aggregation Batch Job
 * 
 * This script pre-computes dashboard analytics and stores them
 * in summary tables for instant retrieval.
 * 
 * Run: node scripts/aggregate-dashboard.js [year]
 * 
 * Schedule via cron: Run once per day or after bulk imports
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { MONGODB_URI } from "../src/config.js";
import { connectMySQL, syncDatabase } from "../src/mysqlDatabase.js";
import Employee from "../src/models/Employee.js";
import Department from "../src/models/Department.js";
import Alert from "../src/models/Alert.js";
import {
    Earning,
    VacationRecord,
    BenefitPlan,
    EmployeeBenefit,
    EarningsSummary,
    VacationSummary,
    BenefitsSummary,
    AlertsSummary
} from "../src/models/sql/index.js";
import sequelize from "../src/mysqlDatabase.js";
import { Op } from "sequelize";

const BATCH_SIZE = 5000;

async function main() {
    const targetYear = parseInt(process.argv[2]) || new Date().getFullYear();

    console.log("========================================");
    console.log(`Dashboard Aggregation - Year: ${targetYear}`);
    console.log("========================================\n");

    const startTime = Date.now();

    try {
        // Connect databases
        console.log("Connecting to databases...");
        await mongoose.connect(MONGODB_URI);
        await connectMySQL();
        await syncDatabase();
        console.log("✓ Connected\n");

        // === STEP 1: Aggregate Earnings ===
        await aggregateEarnings(targetYear);

        // === STEP 2: Aggregate Vacation ===
        await aggregateVacation(targetYear);

        // === STEP 3: Aggregate Benefits ===
        await aggregateBenefits();

        // === STEP 4: Aggregate Alerts ===
        await aggregateAlerts();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log("\n========================================");
        console.log(`✓ Completed in ${duration} seconds`);
        console.log("========================================");

        process.exit(0);
    } catch (error) {
        console.error("Aggregation failed:", error);
        process.exit(1);
    }
}

async function aggregateEarnings(targetYear) {
    console.log("1. Aggregating Earnings...");

    // Get department lookup
    const departments = await Department.find().lean();
    const deptMap = new Map(departments.map(d => [d._id.toString(), d.name]));

    // Get earnings from MySQL (already grouped by employee)
    const [currentEarnings, previousEarnings] = await Promise.all([
        sequelize.query(`
            SELECT employee_id, SUM(amount) as total 
            FROM earnings WHERE year = :year GROUP BY employee_id
        `, { replacements: { year: targetYear }, type: sequelize.QueryTypes.SELECT }),
        sequelize.query(`
            SELECT employee_id, SUM(amount) as total 
            FROM earnings WHERE year = :year GROUP BY employee_id
        `, { replacements: { year: targetYear - 1 }, type: sequelize.QueryTypes.SELECT })
    ]);

    const currentMap = new Map((currentEarnings || []).map(e => [e.employee_id, parseFloat(e.total) || 0]));
    const previousMap = new Map((previousEarnings || []).map(e => [e.employee_id, parseFloat(e.total) || 0]));

    // Initialize aggregators
    const byDepartment = {};
    const byGender = {};
    const byEthnicity = {};
    const byEmploymentType = {};
    const byShareholder = { shareholder: { current: 0, previous: 0 }, nonShareholder: { current: 0, previous: 0 } };
    let total = { current: 0, previous: 0 };
    let employeeCount = 0;

    // Stream employees
    const cursor = Employee.find()
        .select("employeeId departmentId isShareholder gender ethnicity employmentType")
        .lean()
        .cursor({ batchSize: BATCH_SIZE });

    for await (const emp of cursor) {
        employeeCount++;
        const empId = emp.employeeId;
        const current = currentMap.get(empId) || 0;
        const previous = previousMap.get(empId) || 0;

        if (current === 0 && previous === 0) continue;

        total.current += current;
        total.previous += previous;

        // Department
        const dept = deptMap.get(emp.departmentId?.toString()) || "Unassigned";
        if (!byDepartment[dept]) byDepartment[dept] = { current: 0, previous: 0 };
        byDepartment[dept].current += current;
        byDepartment[dept].previous += previous;

        // Gender
        const gender = emp.gender || "Unknown";
        if (!byGender[gender]) byGender[gender] = { current: 0, previous: 0 };
        byGender[gender].current += current;
        byGender[gender].previous += previous;

        // Ethnicity
        const ethnicity = emp.ethnicity || "Unknown";
        if (!byEthnicity[ethnicity]) byEthnicity[ethnicity] = { current: 0, previous: 0 };
        byEthnicity[ethnicity].current += current;
        byEthnicity[ethnicity].previous += previous;

        // Employment Type
        const empType = emp.employmentType || "Full-time";
        if (!byEmploymentType[empType]) byEmploymentType[empType] = { current: 0, previous: 0 };
        byEmploymentType[empType].current += current;
        byEmploymentType[empType].previous += previous;

        // Shareholder
        const shKey = emp.isShareholder ? "shareholder" : "nonShareholder";
        byShareholder[shKey].current += current;
        byShareholder[shKey].previous += previous;

        if (employeeCount % 100000 === 0) {
            console.log(`   Processed ${employeeCount} employees...`);
        }
    }

    // Save to EarningsSummary table
    await EarningsSummary.destroy({ where: { year: targetYear } });

    const rows = [];
    const now = new Date();

    rows.push({ year: targetYear, group_type: "total", group_value: "all", current_total: total.current, previous_total: total.previous, employee_count: employeeCount, computed_at: now });

    for (const [k, v] of Object.entries(byDepartment)) {
        rows.push({ year: targetYear, group_type: "department", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }
    for (const [k, v] of Object.entries(byGender)) {
        rows.push({ year: targetYear, group_type: "gender", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }
    for (const [k, v] of Object.entries(byEthnicity)) {
        rows.push({ year: targetYear, group_type: "ethnicity", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }
    for (const [k, v] of Object.entries(byEmploymentType)) {
        rows.push({ year: targetYear, group_type: "employmentType", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }
    for (const [k, v] of Object.entries(byShareholder)) {
        rows.push({ year: targetYear, group_type: "shareholder", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }

    await EarningsSummary.bulkCreate(rows);
    console.log(`   ✓ Saved ${rows.length} earnings summary rows`);
}

async function aggregateVacation(targetYear) {
    console.log("\n2. Aggregating Vacation...");

    const departments = await Department.find().lean();
    const deptMap = new Map(departments.map(d => [d._id.toString(), d.name]));

    const [currentVacation, previousVacation] = await Promise.all([
        sequelize.query(`
            SELECT employee_id, SUM(days_taken) as total 
            FROM vacation_records WHERE year = :year GROUP BY employee_id
        `, { replacements: { year: targetYear }, type: sequelize.QueryTypes.SELECT }),
        sequelize.query(`
            SELECT employee_id, SUM(days_taken) as total 
            FROM vacation_records WHERE year = :year GROUP BY employee_id
        `, { replacements: { year: targetYear - 1 }, type: sequelize.QueryTypes.SELECT })
    ]);

    const currentMap = new Map((currentVacation || []).map(v => [v.employee_id, parseInt(v.total) || 0]));
    const previousMap = new Map((previousVacation || []).map(v => [v.employee_id, parseInt(v.total) || 0]));

    const byDepartment = {};
    const byGender = {};
    const byEthnicity = {};
    const byEmploymentType = {};
    const byShareholder = { shareholder: { current: 0, previous: 0 }, nonShareholder: { current: 0, previous: 0 } };
    let total = { current: 0, previous: 0 };
    let employeeCount = 0;

    const cursor = Employee.find()
        .select("employeeId departmentId isShareholder gender ethnicity employmentType")
        .lean()
        .cursor({ batchSize: BATCH_SIZE });

    for await (const emp of cursor) {
        employeeCount++;
        const empId = emp.employeeId;
        const current = currentMap.get(empId) || 0;
        const previous = previousMap.get(empId) || 0;

        if (current === 0 && previous === 0) continue;

        total.current += current;
        total.previous += previous;

        const dept = deptMap.get(emp.departmentId?.toString()) || "Unassigned";
        if (!byDepartment[dept]) byDepartment[dept] = { current: 0, previous: 0 };
        byDepartment[dept].current += current;
        byDepartment[dept].previous += previous;

        const gender = emp.gender || "Unknown";
        if (!byGender[gender]) byGender[gender] = { current: 0, previous: 0 };
        byGender[gender].current += current;
        byGender[gender].previous += previous;

        const ethnicity = emp.ethnicity || "Unknown";
        if (!byEthnicity[ethnicity]) byEthnicity[ethnicity] = { current: 0, previous: 0 };
        byEthnicity[ethnicity].current += current;
        byEthnicity[ethnicity].previous += previous;

        const empType = emp.employmentType || "Full-time";
        if (!byEmploymentType[empType]) byEmploymentType[empType] = { current: 0, previous: 0 };
        byEmploymentType[empType].current += current;
        byEmploymentType[empType].previous += previous;

        const shKey = emp.isShareholder ? "shareholder" : "nonShareholder";
        byShareholder[shKey].current += current;
        byShareholder[shKey].previous += previous;
    }

    await VacationSummary.destroy({ where: { year: targetYear } });

    const rows = [];
    const now = new Date();

    rows.push({ year: targetYear, group_type: "total", group_value: "all", current_total: total.current, previous_total: total.previous, employee_count: employeeCount, computed_at: now });

    for (const [k, v] of Object.entries(byDepartment)) {
        rows.push({ year: targetYear, group_type: "department", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }
    for (const [k, v] of Object.entries(byGender)) {
        rows.push({ year: targetYear, group_type: "gender", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }
    for (const [k, v] of Object.entries(byEthnicity)) {
        rows.push({ year: targetYear, group_type: "ethnicity", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }
    for (const [k, v] of Object.entries(byEmploymentType)) {
        rows.push({ year: targetYear, group_type: "employmentType", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }
    for (const [k, v] of Object.entries(byShareholder)) {
        rows.push({ year: targetYear, group_type: "shareholder", group_value: k, current_total: v.current, previous_total: v.previous, employee_count: employeeCount, computed_at: now });
    }

    await VacationSummary.bulkCreate(rows);
    console.log(`   ✓ Saved ${rows.length} vacation summary rows`);
}

async function aggregateBenefits() {
    console.log("\n3. Aggregating Benefits...");

    // Get shareholders from MongoDB
    const shareholders = await Employee.find({ isShareholder: true }).select("employeeId").lean();
    const shareholderSet = new Set(shareholders.map(e => e.employeeId));

    // Get benefits from MySQL
    const benefitsData = await sequelize.query(`
        SELECT eb.employee_id, bp.name as plan_name, SUM(eb.amount_paid) as total
        FROM employee_benefits eb
        JOIN benefits_plans bp ON eb.plan_id = bp.id
        GROUP BY eb.employee_id, bp.name
    `, { type: sequelize.QueryTypes.SELECT });

    // Aggregate
    const byPlan = {};
    const overall = {
        shareholder: { total: 0, count: 0 },
        nonShareholder: { total: 0, count: 0 }
    };

    for (const row of (benefitsData || [])) {
        const plan = row.plan_name || "Unknown";
        const isSH = shareholderSet.has(row.employee_id);
        const amount = parseFloat(row.total) || 0;
        const key = isSH ? "shareholder" : "nonShareholder";

        if (!byPlan[plan]) {
            byPlan[plan] = {
                shareholder: { total: 0, count: 0 },
                nonShareholder: { total: 0, count: 0 }
            };
        }

        byPlan[plan][key].total += amount;
        byPlan[plan][key].count += 1;
        overall[key].total += amount;
        overall[key].count += 1;
    }

    // Save to BenefitsSummary
    await BenefitsSummary.destroy({ where: {} });

    const rows = [];
    const now = new Date();

    // Overall
    rows.push({
        plan_name: "_overall",
        shareholder_type: "shareholder",
        total_paid: overall.shareholder.total,
        enrollment_count: overall.shareholder.count,
        average_paid: overall.shareholder.count > 0 ? overall.shareholder.total / overall.shareholder.count : 0,
        computed_at: now
    });
    rows.push({
        plan_name: "_overall",
        shareholder_type: "nonShareholder",
        total_paid: overall.nonShareholder.total,
        enrollment_count: overall.nonShareholder.count,
        average_paid: overall.nonShareholder.count > 0 ? overall.nonShareholder.total / overall.nonShareholder.count : 0,
        computed_at: now
    });

    // By Plan
    for (const [plan, data] of Object.entries(byPlan)) {
        rows.push({
            plan_name: plan,
            shareholder_type: "shareholder",
            total_paid: data.shareholder.total,
            enrollment_count: data.shareholder.count,
            average_paid: data.shareholder.count > 0 ? data.shareholder.total / data.shareholder.count : 0,
            computed_at: now
        });
        rows.push({
            plan_name: plan,
            shareholder_type: "nonShareholder",
            total_paid: data.nonShareholder.total,
            enrollment_count: data.nonShareholder.count,
            average_paid: data.nonShareholder.count > 0 ? data.nonShareholder.total / data.nonShareholder.count : 0,
            computed_at: now
        });
    }

    await BenefitsSummary.bulkCreate(rows);
    console.log(`   ✓ Saved ${rows.length} benefits summary rows`);
}

async function aggregateAlerts() {
    console.log("\n4. Aggregating Alerts...");

    // Import AlertEmployee model
    const { default: AlertEmployee } = await import("../src/models/sql/AlertEmployee.js");

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const BATCH_INSERT_SIZE = 5000; // Insert in batches for efficiency

    // Get active alerts configuration
    const activeAlerts = await Alert.find({ isActive: true }).lean();

    if (activeAlerts.length === 0) {
        console.log("   No active alerts configured");
        return;
    }

    // Clear existing data
    await AlertsSummary.destroy({ where: {} });
    await AlertEmployee.sync({ force: true }); // Recreate table

    const summaryRows = [];
    const now = new Date();

    for (const alert of activeAlerts) {
        let employeeBatch = [];
        let totalCount = 0;

        console.log(`   Processing ${alert.type} alert...`);

        switch (alert.type) {
            case "anniversary": {
                const threshold = alert.threshold || 30;
                const cursor = Employee.find({ hireDate: { $exists: true } })
                    .select("employeeId firstName lastName hireDate")
                    .lean()
                    .cursor({ batchSize: BATCH_SIZE });

                for await (const emp of cursor) {
                    if (!emp.hireDate) continue;
                    const hireDate = new Date(emp.hireDate);
                    const anniversaryThisYear = new Date(currentYear, hireDate.getMonth(), hireDate.getDate());

                    if (anniversaryThisYear < today) {
                        anniversaryThisYear.setFullYear(currentYear + 1);
                    }

                    const daysUntil = Math.ceil((anniversaryThisYear - today) / (1000 * 60 * 60 * 24));
                    if (daysUntil >= 0 && daysUntil <= threshold) {
                        totalCount++;
                        employeeBatch.push({
                            alert_type: "anniversary",
                            employee_id: emp.employeeId,
                            name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                            days_until: daysUntil,
                            extra_data: emp.hireDate?.toISOString?.() || String(emp.hireDate),
                            aggregated_at: now
                        });

                        // Bulk insert when batch is full
                        if (employeeBatch.length >= BATCH_INSERT_SIZE) {
                            await AlertEmployee.bulkCreate(employeeBatch);
                            employeeBatch = [];
                        }
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
                    .cursor({ batchSize: BATCH_SIZE });

                for await (const emp of cursor) {
                    employeeBatch.push({
                        alert_type: "vacation",
                        employee_id: emp.employeeId,
                        name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                        days_until: emp.vacationDays,
                        extra_data: String(emp.vacationDays),
                        aggregated_at: now
                    });

                    if (employeeBatch.length >= BATCH_INSERT_SIZE) {
                        await AlertEmployee.bulkCreate(employeeBatch);
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
                    raw: true,
                });

                const changedEmployeeIds = [...new Set(recentChanges.map(c => c.employee_id))];
                totalCount = changedEmployeeIds.length;

                if (changedEmployeeIds.length > 0) {
                    const cursor = Employee.find({ employeeId: { $in: changedEmployeeIds } })
                        .select("employeeId firstName lastName")
                        .lean()
                        .cursor({ batchSize: BATCH_SIZE });

                    for await (const emp of cursor) {
                        employeeBatch.push({
                            alert_type: "benefits_change",
                            employee_id: emp.employeeId,
                            name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                            days_until: null,
                            extra_data: null,
                            aggregated_at: now
                        });

                        if (employeeBatch.length >= BATCH_INSERT_SIZE) {
                            await AlertEmployee.bulkCreate(employeeBatch);
                            employeeBatch = [];
                        }
                    }
                }
                break;
            }

            case "birthday": {
                const threshold = alert.threshold || 30;
                const cursor = Employee.find({ birthDate: { $exists: true } })
                    .select("employeeId firstName lastName birthDate")
                    .lean()
                    .cursor({ batchSize: BATCH_SIZE });

                for await (const emp of cursor) {
                    if (!emp.birthDate) continue;
                    const birthDate = new Date(emp.birthDate);
                    const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

                    if (birthdayThisYear < today) {
                        birthdayThisYear.setFullYear(currentYear + 1);
                    }

                    const daysUntil = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));
                    if (daysUntil >= 0 && daysUntil <= threshold) {
                        totalCount++;
                        employeeBatch.push({
                            alert_type: "birthday",
                            employee_id: emp.employeeId,
                            name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                            days_until: daysUntil,
                            extra_data: emp.birthDate?.toISOString?.() || String(emp.birthDate),
                            aggregated_at: now
                        });

                        if (employeeBatch.length >= BATCH_INSERT_SIZE) {
                            await AlertEmployee.bulkCreate(employeeBatch);
                            employeeBatch = [];
                        }
                    }
                }
                break;
            }
        }

        // Insert remaining employees
        if (employeeBatch.length > 0) {
            await AlertEmployee.bulkCreate(employeeBatch);
        }

        // Save summary (count only, no employees list)
        if (totalCount > 0) {
            summaryRows.push({
                alert_type: alert.type,
                threshold: alert.threshold || 0,
                employee_count: totalCount,
                matching_employees: JSON.stringify([]), // Empty - data is in AlertEmployee table
                computed_at: now
            });
        }

        console.log(`      ✓ ${alert.type}: ${totalCount} employees saved`);
    }

    if (summaryRows.length > 0) {
        await AlertsSummary.bulkCreate(summaryRows);
    }
    console.log(`   ✓ Saved ${summaryRows.length} alerts summary rows`);
}

main();

