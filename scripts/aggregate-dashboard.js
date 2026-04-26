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
import { connectMySQL, DASHBOARD_COMPANY_SCOPE_VALUE, syncDatabase } from "../src/mysqlDatabase.js";
import Employee from "../src/models/Employee.js";
import Department from "../src/models/Department.js";
import Alert from "../src/models/Alert.js";
import { buildDepartmentNameMap } from "../src/utils/departmentMapping.js";
import {
    BenefitPlan,
    EmployeeBenefit,
    EarningsEmployeeYear,
    EarningsSummary,
    VacationSummary,
    BenefitsSummary,
    AlertsSummary
} from "../src/models/sql/index.js";
import sequelize from "../src/mysqlDatabase.js";
import { Op } from "sequelize";
import { buildBenefitsChangeMatchesFromRows } from "../src/utils/benefitsPayrollImpact.js";

const BATCH_SIZE = 5000;

function parseRuntimeOptions(argv) {
    const options = {
        targetYear: new Date().getFullYear(),
        includeDepartmentScope: false,
        skipSnapshot: false,
    };

    for (const arg of argv) {
        if (arg === "--include-department-scope") {
            options.includeDepartmentScope = true;
            continue;
        }
        if (arg === "--skip-snapshot") {
            options.skipSnapshot = true;
            continue;
        }
        if (/^\d{4}$/.test(arg)) {
            options.targetYear = parseInt(arg, 10);
        }
    }

    if (process.env.AGG_SKIP_EMPLOYEE_SNAPSHOT === "1") {
        options.skipSnapshot = true;
    }
    if (process.env.AGG_INCLUDE_DEPARTMENT_SCOPE === "1") {
        options.includeDepartmentScope = true;
    }

    return options;
}

function isMongoQuotaError(error) {
    if (!error) return false;
    const message = `${error.message || ""} ${error?.errorResponse?.errmsg || ""}`.toLowerCase();
    return error.code === 8000 || error?.errorResponse?.code === 8000 || message.includes("space quota");
}

function createScopedTotals() {
    return { current: 0, previous: 0, employee_count: 0 };
}

function getOrCreateScopedTotals(container, key) {
    if (!container[key]) {
        container[key] = createScopedTotals();
    }
    return container[key];
}

function addToScopedTotals(bucket, current, previous) {
    bucket.current += current;
    bucket.previous += previous;
    bucket.employee_count += 1;
}

function createDepartmentScopedMetricAggregate() {
    return {
        total: createScopedTotals(),
        byEmploymentType: {},
        byGender: {},
        byEthnicity: {},
        byShareholder: {},
    };
}

function getOrCreateDepartmentScopedMetricAggregate(container, departmentId) {
    if (!container.has(departmentId)) {
        container.set(departmentId, createDepartmentScopedMetricAggregate());
    }
    return container.get(departmentId);
}

function getEmployeeSummaryDimensions(employee, departmentMap) {
    const departmentId = employee.departmentId?.toString() || null;
    return {
        departmentId,
        departmentName: departmentId ? departmentMap.get(departmentId) || "Unassigned" : "Unassigned",
        gender: employee.gender || "Unknown",
        ethnicity: employee.ethnicity || "Unknown",
        employmentType: employee.employmentType || "Full-time",
        shareholderType: employee.isShareholder ? "shareholder" : "nonShareholder",
    };
}

function createScopedMetricRow(year, scopeType, scopeValue, groupType, groupValue, totals, computedAt) {
    return {
        year,
        scope_type: scopeType,
        scope_value: scopeValue,
        group_type: groupType,
        group_value: groupValue,
        current_total: totals.current,
        previous_total: totals.previous,
        employee_count: totals.employee_count,
        computed_at: computedAt,
    };
}

function appendMetricSummaryRows(rows, year, companyAggregate, departmentAggregates, computedAt, includeDepartmentScope = false) {
    rows.push(createScopedMetricRow(year, "company", DASHBOARD_COMPANY_SCOPE_VALUE, "total", "all", companyAggregate.total, computedAt));

    for (const [departmentName, totals] of Object.entries(companyAggregate.byDepartment)) {
        rows.push(createScopedMetricRow(year, "company", DASHBOARD_COMPANY_SCOPE_VALUE, "department", departmentName, totals, computedAt));
    }
    for (const [gender, totals] of Object.entries(companyAggregate.byGender)) {
        rows.push(createScopedMetricRow(year, "company", DASHBOARD_COMPANY_SCOPE_VALUE, "gender", gender, totals, computedAt));
    }
    for (const [ethnicity, totals] of Object.entries(companyAggregate.byEthnicity)) {
        rows.push(createScopedMetricRow(year, "company", DASHBOARD_COMPANY_SCOPE_VALUE, "ethnicity", ethnicity, totals, computedAt));
    }
    for (const [employmentType, totals] of Object.entries(companyAggregate.byEmploymentType)) {
        rows.push(createScopedMetricRow(year, "company", DASHBOARD_COMPANY_SCOPE_VALUE, "employmentType", employmentType, totals, computedAt));
    }
    for (const [shareholderType, totals] of Object.entries(companyAggregate.byShareholder)) {
        rows.push(createScopedMetricRow(year, "company", DASHBOARD_COMPANY_SCOPE_VALUE, "shareholder", shareholderType, totals, computedAt));
    }

    if (!includeDepartmentScope) {
        return;
    }

    for (const [departmentId, aggregate] of departmentAggregates.entries()) {
        rows.push(createScopedMetricRow(year, "department", departmentId, "total", "all", aggregate.total, computedAt));

        for (const [employmentType, totals] of Object.entries(aggregate.byEmploymentType)) {
            rows.push(createScopedMetricRow(year, "department", departmentId, "employmentType", employmentType, totals, computedAt));
        }
        for (const [gender, totals] of Object.entries(aggregate.byGender)) {
            rows.push(createScopedMetricRow(year, "department", departmentId, "gender", gender, totals, computedAt));
        }
        for (const [ethnicity, totals] of Object.entries(aggregate.byEthnicity)) {
            rows.push(createScopedMetricRow(year, "department", departmentId, "ethnicity", ethnicity, totals, computedAt));
        }
        for (const [shareholderType, totals] of Object.entries(aggregate.byShareholder)) {
            rows.push(createScopedMetricRow(year, "department", departmentId, "shareholder", shareholderType, totals, computedAt));
        }
    }
}

function createBenefitsTotals() {
    return {
        shareholder: { total: 0, count: 0 },
        nonShareholder: { total: 0, count: 0 },
    };
}

function createDepartmentBenefitsAggregate() {
    return {
        overall: createBenefitsTotals(),
        byPlan: {},
    };
}

function getOrCreateDepartmentBenefitsAggregate(container, departmentId) {
    if (!container.has(departmentId)) {
        container.set(departmentId, createDepartmentBenefitsAggregate());
    }
    return container.get(departmentId);
}

function getOrCreateBenefitsPlanAggregate(container, planName) {
    if (!container[planName]) {
        container[planName] = createBenefitsTotals();
    }
    return container[planName];
}

function addToBenefitsTotals(bucket, shareholderType, amount) {
    bucket[shareholderType].total += amount;
    bucket[shareholderType].count += 1;
}

function createBenefitsSummaryRow(scopeType, scopeValue, planName, shareholderType, totals, computedAt) {
    return {
        scope_type: scopeType,
        scope_value: scopeValue,
        plan_name: planName,
        shareholder_type: shareholderType,
        total_paid: totals.total,
        enrollment_count: totals.count,
        average_paid: totals.count > 0 ? totals.total / totals.count : 0,
        computed_at: computedAt,
    };
}

function appendBenefitsRows(rows, scopeType, scopeValue, overallTotals, planTotals, computedAt) {
    rows.push(createBenefitsSummaryRow(scopeType, scopeValue, "_overall", "shareholder", overallTotals.shareholder, computedAt));
    rows.push(createBenefitsSummaryRow(scopeType, scopeValue, "_overall", "nonShareholder", overallTotals.nonShareholder, computedAt));

    for (const [planName, totals] of Object.entries(planTotals)) {
        rows.push(createBenefitsSummaryRow(scopeType, scopeValue, planName, "shareholder", totals.shareholder, computedAt));
        rows.push(createBenefitsSummaryRow(scopeType, scopeValue, planName, "nonShareholder", totals.nonShareholder, computedAt));
    }
}

async function main() {
    const { includeDepartmentScope, targetYear, skipSnapshot } = parseRuntimeOptions(process.argv.slice(2));

    console.log("========================================");
    console.log(`Dashboard Aggregation - Year: ${targetYear}`);
    if (includeDepartmentScope) {
        console.log("Mode: include department-scoped summary rows");
    }
    if (skipSnapshot) {
        console.log("Mode: skip Mongo annualEarnings snapshot updates");
    }
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
        await aggregateEarnings(targetYear, { includeDepartmentScope, skipSnapshot });

        // === STEP 2: Aggregate Vacation ===
        await aggregateVacation(targetYear, { includeDepartmentScope });

        // === STEP 3: Aggregate Benefits ===
        await aggregateBenefits({ includeDepartmentScope });

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

async function aggregateEarnings(targetYear, options = {}) {
    console.log("1. Aggregating Earnings...");

    // Get department lookup
    const { map: deptMap, usedFallback } = await buildDepartmentNameMap({
        DepartmentModel: Department,
        EmployeeModel: Employee,
    });
    if (usedFallback) {
        console.warn("   ⚠ departments collection empty: using deterministic fallback mapping for department names.");
    }

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

    const companyAggregate = {
        total: createScopedTotals(),
        byDepartment: {},
        byGender: {},
        byEthnicity: {},
        byEmploymentType: {},
        byShareholder: {},
    };
    const departmentAggregates = new Map();
    let processedEmployeeCount = 0;
    let earningsUpdates = [];
    let snapshotWritesEnabled = !options.skipSnapshot;
    let snapshotWritesSkippedReason = options.skipSnapshot ? "cli_or_env_skip" : null;

    // Stream employees
    const cursor = Employee.find()
        .select("employeeId departmentId isShareholder gender ethnicity employmentType")
        .lean()
        .cursor({ batchSize: BATCH_SIZE });

    for await (const emp of cursor) {
        processedEmployeeCount++;
        const empId = emp.employeeId;
        const current = currentMap.get(empId) || 0;
        const previous = previousMap.get(empId) || 0;

        // Update annual earnings snapshot in MongoDB (for fast minEarnings filter).
        // If Mongo storage quota is exceeded, continue aggregation in read-only mode.
        if (snapshotWritesEnabled) {
            earningsUpdates.push({
                updateOne: {
                    filter: { _id: emp._id },
                    update: { $set: { annualEarnings: current, annualEarningsYear: targetYear } }
                }
            });
            if (earningsUpdates.length >= BATCH_SIZE) {
                try {
                    await Employee.bulkWrite(earningsUpdates, { ordered: false });
                    earningsUpdates = [];
                } catch (error) {
                    if (isMongoQuotaError(error)) {
                        snapshotWritesEnabled = false;
                        snapshotWritesSkippedReason = "mongo_space_quota";
                        earningsUpdates = [];
                        console.warn("   ⚠ Mongo space quota reached. Continuing without annualEarnings snapshot updates.");
                    } else {
                        throw error;
                    }
                }
            }
        }

        if (current === 0 && previous === 0) continue;

        const dimensions = getEmployeeSummaryDimensions(emp, deptMap);
        addToScopedTotals(companyAggregate.total, current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byDepartment, dimensions.departmentName), current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byGender, dimensions.gender), current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byEthnicity, dimensions.ethnicity), current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byEmploymentType, dimensions.employmentType), current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byShareholder, dimensions.shareholderType), current, previous);

        if (dimensions.departmentId) {
            const scopedAggregate = getOrCreateDepartmentScopedMetricAggregate(departmentAggregates, dimensions.departmentId);
            addToScopedTotals(scopedAggregate.total, current, previous);
            addToScopedTotals(getOrCreateScopedTotals(scopedAggregate.byEmploymentType, dimensions.employmentType), current, previous);
            addToScopedTotals(getOrCreateScopedTotals(scopedAggregate.byGender, dimensions.gender), current, previous);
            addToScopedTotals(getOrCreateScopedTotals(scopedAggregate.byEthnicity, dimensions.ethnicity), current, previous);
            addToScopedTotals(getOrCreateScopedTotals(scopedAggregate.byShareholder, dimensions.shareholderType), current, previous);
        }

        if (processedEmployeeCount % 100000 === 0) {
            console.log(`   Processed ${processedEmployeeCount} employees...`);
        }
    }

    if (snapshotWritesEnabled && earningsUpdates.length > 0) {
        try {
            await Employee.bulkWrite(earningsUpdates, { ordered: false });
        } catch (error) {
            if (isMongoQuotaError(error)) {
                snapshotWritesEnabled = false;
                snapshotWritesSkippedReason = "mongo_space_quota";
                console.warn("   ⚠ Mongo space quota reached during final snapshot flush. Continuing.");
            } else {
                throw error;
            }
        }
        earningsUpdates = [];
    }

    // Save to EarningsSummary table
    await EarningsSummary.destroy({ where: { year: targetYear } });

    const rows = [];
    const now = new Date();

    appendMetricSummaryRows(rows, targetYear, companyAggregate, departmentAggregates, now, options.includeDepartmentScope);

    await EarningsSummary.bulkCreate(rows);
    console.log(`   ✓ Saved ${rows.length} earnings summary rows`);
    // Save to EarningsEmployeeYear table (fast minEarnings queries)
    const currentYearRows = (currentEarnings || []).map(e => ({
        employee_id: e.employee_id,
        year: targetYear,
        total: parseFloat(e.total) || 0
    }));
    const previousYearRows = (previousEarnings || []).map(e => ({
        employee_id: e.employee_id,
        year: targetYear - 1,
        total: parseFloat(e.total) || 0
    }));

    await EarningsEmployeeYear.destroy({ where: { year: targetYear } });
    await EarningsEmployeeYear.destroy({ where: { year: targetYear - 1 } });

    if (currentYearRows.length > 0) {
        await EarningsEmployeeYear.bulkCreate(currentYearRows);
    }
    if (previousYearRows.length > 0) {
        await EarningsEmployeeYear.bulkCreate(previousYearRows);
    }

    console.log(`   OK Saved ${currentYearRows.length} earnings-employee rows for ${targetYear}`);
    console.log(`   OK Saved ${previousYearRows.length} earnings-employee rows for ${targetYear - 1}`);
    if (!snapshotWritesEnabled) {
        console.log(`   NOTE annualEarnings snapshot updates skipped (${snapshotWritesSkippedReason})`);
    }
}

async function aggregateVacation(targetYear, options = {}) {
    console.log("\n2. Aggregating Vacation...");

    const { map: deptMap, usedFallback } = await buildDepartmentNameMap({
        DepartmentModel: Department,
        EmployeeModel: Employee,
    });
    if (usedFallback) {
        console.warn("   ⚠ departments collection empty: using deterministic fallback mapping for department names.");
    }

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

    const companyAggregate = {
        total: createScopedTotals(),
        byDepartment: {},
        byGender: {},
        byEthnicity: {},
        byEmploymentType: {},
        byShareholder: {},
    };
    const departmentAggregates = new Map();

    const cursor = Employee.find()
        .select("employeeId departmentId isShareholder gender ethnicity employmentType")
        .lean()
        .cursor({ batchSize: BATCH_SIZE });

    for await (const emp of cursor) {
        const empId = emp.employeeId;
        const current = currentMap.get(empId) || 0;
        const previous = previousMap.get(empId) || 0;

        if (current === 0 && previous === 0) continue;

        const dimensions = getEmployeeSummaryDimensions(emp, deptMap);
        addToScopedTotals(companyAggregate.total, current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byDepartment, dimensions.departmentName), current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byGender, dimensions.gender), current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byEthnicity, dimensions.ethnicity), current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byEmploymentType, dimensions.employmentType), current, previous);
        addToScopedTotals(getOrCreateScopedTotals(companyAggregate.byShareholder, dimensions.shareholderType), current, previous);

        if (dimensions.departmentId) {
            const scopedAggregate = getOrCreateDepartmentScopedMetricAggregate(departmentAggregates, dimensions.departmentId);
            addToScopedTotals(scopedAggregate.total, current, previous);
            addToScopedTotals(getOrCreateScopedTotals(scopedAggregate.byEmploymentType, dimensions.employmentType), current, previous);
            addToScopedTotals(getOrCreateScopedTotals(scopedAggregate.byGender, dimensions.gender), current, previous);
            addToScopedTotals(getOrCreateScopedTotals(scopedAggregate.byEthnicity, dimensions.ethnicity), current, previous);
            addToScopedTotals(getOrCreateScopedTotals(scopedAggregate.byShareholder, dimensions.shareholderType), current, previous);
        }
    }

    await VacationSummary.destroy({ where: { year: targetYear } });

    const rows = [];
    const now = new Date();

    appendMetricSummaryRows(rows, targetYear, companyAggregate, departmentAggregates, now, options.includeDepartmentScope);

    await VacationSummary.bulkCreate(rows);
    console.log(`   ✓ Saved ${rows.length} vacation summary rows`);
}

async function aggregateBenefits(options = {}) {
    console.log("\n3. Aggregating Benefits...");

    const employeeMeta = new Map();
    const employeeCursor = Employee.find()
        .select("employeeId departmentId isShareholder")
        .lean()
        .cursor({ batchSize: BATCH_SIZE });

    for await (const employee of employeeCursor) {
        employeeMeta.set(employee.employeeId, {
            departmentId: employee.departmentId?.toString() || null,
            isShareholder: Boolean(employee.isShareholder),
        });
    }

    // Get benefits from MySQL
    const benefitsData = await sequelize.query(`
        SELECT eb.employee_id, bp.name as plan_name, SUM(eb.amount_paid) as total
        FROM employee_benefits eb
        JOIN benefits_plans bp ON eb.plan_id = bp.id
        GROUP BY eb.employee_id, bp.name
    `, { type: sequelize.QueryTypes.SELECT });

    // Aggregate
    const byPlan = {};
    const overall = createBenefitsTotals();
    const departmentAggregates = new Map();

    for (const row of (benefitsData || [])) {
        const plan = row.plan_name || "Unknown";
        const employee = employeeMeta.get(row.employee_id) || { departmentId: null, isShareholder: false };
        const isSH = employee.isShareholder;
        const amount = parseFloat(row.total) || 0;
        const key = isSH ? "shareholder" : "nonShareholder";

        addToBenefitsTotals(getOrCreateBenefitsPlanAggregate(byPlan, plan), key, amount);
        addToBenefitsTotals(overall, key, amount);

        if (employee.departmentId) {
            const departmentAggregate = getOrCreateDepartmentBenefitsAggregate(departmentAggregates, employee.departmentId);
            addToBenefitsTotals(departmentAggregate.overall, key, amount);
            addToBenefitsTotals(getOrCreateBenefitsPlanAggregate(departmentAggregate.byPlan, plan), key, amount);
        }
    }

    // Save to BenefitsSummary
    await BenefitsSummary.destroy({ where: {} });

    const rows = [];
    const now = new Date();

    appendBenefitsRows(rows, "company", DASHBOARD_COMPANY_SCOPE_VALUE, overall, byPlan, now);

    if (options.includeDepartmentScope) {
        for (const [departmentId, aggregate] of departmentAggregates.entries()) {
            appendBenefitsRows(rows, "department", departmentId, aggregate.overall, aggregate.byPlan, now);
        }
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

    // Clear existing data before rebuilding so disabled alerts cannot leave stale summaries behind
    await AlertsSummary.destroy({ where: {} });
    await AlertEmployee.sync({ force: true }); // Recreate table

    if (activeAlerts.length === 0) {
        console.log("   No active alerts configured");
        return;
    }

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
                        .cursor({ batchSize: BATCH_SIZE });

                    for await (const emp of cursor) {
                        const impact = impactByEmployee.get(emp.employeeId);
                        if (!impact) continue;

                        employeeBatch.push({
                            alert_type: "benefits_change",
                            employee_id: emp.employeeId,
                            name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                            days_until: impact.sortDays,
                            extra_data: impact.extraData,
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
                // Modified: Strict "Current Month" logic per CEO requirement
                // Old logic: Upcoming 30 days

                const cursor = Employee.find({ birthDate: { $exists: true } })
                    .select("employeeId firstName lastName birthDate")
                    .lean()
                    .cursor({ batchSize: BATCH_SIZE });

                for await (const emp of cursor) {
                    if (!emp.birthDate) continue;
                    const birthDate = new Date(emp.birthDate);

                    // Check if birth month matches current month (0-indexed)
                    if (birthDate.getMonth() === currentMonth) {
                        totalCount++;

                        // Calculate day of month for display
                        const dayOfMonth = birthDate.getDate();
                        const birthdayThisYear = new Date(currentYear, currentMonth, dayOfMonth);

                        // Calculate days until (can be negative if birthday passed this month)
                        // This allows showing "Feb 12" (past) or "Feb 28" (future)
                        const daysUntil = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));

                        employeeBatch.push({
                            alert_type: "birthday",
                            employee_id: emp.employeeId,
                            name: `${emp.firstName} ${emp.lastName || ""}`.trim(),
                            days_until: daysUntil, // Can be negative now, frontend handles display
                            extra_data: emp.birthDate?.toISOString?.() || String(emp.birthDate), // Full date for formatting
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

