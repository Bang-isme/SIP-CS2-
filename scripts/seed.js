/**
 * Seed Script - Populate realistic demo data for MongoDB and MySQL.
 *
 * Usage:
 *   node scripts/seed.js
 *   node scripts/seed.js --profile smb
 *   node scripts/seed.js --profile mid --total 150000 --batch 3000
 *
 * Env overrides:
 *   SEED_PROFILE=smb|mid|enterprise
 *   SEED_TOTAL_RECORDS=number
 *   SEED_BATCH_SIZE=number
 */

import mongoose from "mongoose";
import { config } from "dotenv";
config();

import Employee from "../src/models/Employee.js";
import Department from "../src/models/Department.js";
import Alert from "../src/models/Alert.js";
import Counter from "../src/models/Counter.js";
import IntegrationEvent from "../src/models/IntegrationEvent.js";
import IntegrationEventAudit from "../src/models/IntegrationEventAudit.js";
import sequelize, { connectMySQL, syncDatabase } from "../src/mysqlDatabase.js";
import {
    Earning,
    VacationRecord,
    BenefitPlan,
    EmployeeBenefit,
    PayRate,
    EarningsEmployeeYear,
    EarningsSummary,
    VacationSummary,
    BenefitsSummary,
    AlertsSummary,
    AlertEmployee,
} from "../src/models/sql/index.js";

const MONGODB_URI = process.env.MONGODB_URI;

const CACHED_DATA = {
    firstNames: [
        "John", "Jane", "Mike", "Sarah", "David", "Emily", "Chris", "Lisa", "Tom", "Amy",
        "Robert", "Jessica", "William", "Jennifer", "James", "Maria", "Charles", "Susan", "Joseph", "Margaret",
        "Daniel", "Olivia", "Ethan", "Emma", "Noah", "Mia", "Liam", "Sophia", "Lucas", "Ava",
        "Benjamin", "Charlotte", "Samuel", "Grace", "Jack", "Chloe", "Leo", "Nora", "Henry", "Hannah",
    ],
    lastNames: [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", "Wilson", "Moore", "Taylor",
        "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson",
        "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright",
        "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Baker", "Nelson", "Carter",
    ],
    depts: [],
    deptByName: new Map(),
};

const DEPARTMENTS = [
    { name: "Human Resources", code: "HR" },
    { name: "Finance", code: "FIN" },
    { name: "Engineering", code: "ENG" },
    { name: "Sales", code: "SALES" },
    { name: "Marketing", code: "MKT" },
    { name: "IT Support", code: "IT" },
    { name: "Operations", code: "OPS" },
    { name: "Legal", code: "LEG" },
];

const BENEFIT_PLANS = [
    { name: "Basic Health", type: "health", monthly_cost: 200 },
    { name: "Premium Health", type: "health", monthly_cost: 450 },
    { name: "Dental Gold", type: "dental", monthly_cost: 50 },
    { name: "Vision Plus", type: "vision", monthly_cost: 30 },
    { name: "401k Standard", type: "retirement", monthly_cost: 0 },
    { name: "Life Insurance", type: "life", monthly_cost: 25 },
];

const PROFILE_CONFIGS = {
    smb: {
        label: "SMB",
        totalRecords: 50000,
        batchSize: 2000,
        shareholderRate: 0.08,
        previousYearCoverage: 0.62,
        recentBenefitChangeRate: 0.04,
        genderWeights: { Male: 0.52, Female: 0.48 },
        ethnicityWeights: {
            Caucasian: 0.46,
            Hispanic: 0.20,
            Asian: 0.18,
            "African American": 0.12,
            Other: 0.04,
        },
        employmentTypeWeights: { "Full-time": 0.82, "Part-time": 0.18 },
        departmentWeights: {
            Engineering: 0.22,
            Sales: 0.18,
            Operations: 0.16,
            Marketing: 0.14,
            Finance: 0.10,
            "Human Resources": 0.08,
            "IT Support": 0.08,
            Legal: 0.04,
        },
        hireDateRange: [new Date(2018, 0, 1), new Date(2025, 0, 1)],
        birthDateRange: [new Date(1968, 0, 1), new Date(2003, 0, 1)],
        vacationBalanceRange: { "Full-time": [0, 26], "Part-time": [0, 14] },
        vacationTakenRange: { "Full-time": [1, 16], "Part-time": [0, 10] },
        previousYearFactorRange: [0.86, 1.03],
        salaryBands: {
            "Full-time": {
                Engineering: [85000, 175000],
                Sales: [60000, 145000],
                Marketing: [62000, 125000],
                Finance: [70000, 140000],
                "Human Resources": [60000, 120000],
                "IT Support": [55000, 105000],
                Operations: [58000, 115000],
                Legal: [95000, 185000],
            },
            "Part-time": {
                Engineering: [38000, 78000],
                Sales: [32000, 68000],
                Marketing: [32000, 64000],
                Finance: [35000, 70000],
                "Human Resources": [30000, 62000],
                "IT Support": [30000, 56000],
                Operations: [30000, 60000],
                Legal: [45000, 90000],
            },
        },
        benefitPlanWeights: {
            "Full-time": {
                "Premium Health": 0.28,
                "Basic Health": 0.22,
                "401k Standard": 0.20,
                "Dental Gold": 0.12,
                "Vision Plus": 0.10,
                "Life Insurance": 0.08,
            },
            "Part-time": {
                "Basic Health": 0.34,
                "Vision Plus": 0.20,
                "Dental Gold": 0.18,
                "401k Standard": 0.12,
                "Life Insurance": 0.10,
                "Premium Health": 0.06,
            },
        },
    },
    mid: {
        label: "Mid-Market",
        totalRecords: 200000,
        batchSize: 4000,
        shareholderRate: 0.12,
        previousYearCoverage: 0.74,
        recentBenefitChangeRate: 0.05,
        genderWeights: { Male: 0.50, Female: 0.50 },
        ethnicityWeights: {
            Caucasian: 0.34,
            Hispanic: 0.23,
            Asian: 0.20,
            "African American": 0.18,
            Other: 0.05,
        },
        employmentTypeWeights: { "Full-time": 0.76, "Part-time": 0.24 },
        departmentWeights: {
            Engineering: 0.20,
            Sales: 0.17,
            Operations: 0.15,
            Marketing: 0.13,
            Finance: 0.12,
            "Human Resources": 0.09,
            "IT Support": 0.09,
            Legal: 0.05,
        },
        hireDateRange: [new Date(2016, 0, 1), new Date(2025, 0, 1)],
        birthDateRange: [new Date(1965, 0, 1), new Date(2002, 0, 1)],
        vacationBalanceRange: { "Full-time": [0, 30], "Part-time": [0, 18] },
        vacationTakenRange: { "Full-time": [0, 18], "Part-time": [0, 12] },
        previousYearFactorRange: [0.85, 1.04],
        salaryBands: {
            "Full-time": {
                Engineering: [90000, 185000],
                Sales: [62000, 150000],
                Marketing: [64000, 135000],
                Finance: [74000, 150000],
                "Human Resources": [62000, 130000],
                "IT Support": [56000, 115000],
                Operations: [62000, 125000],
                Legal: [105000, 195000],
            },
            "Part-time": {
                Engineering: [42000, 86000],
                Sales: [34000, 76000],
                Marketing: [34000, 74000],
                Finance: [38000, 78000],
                "Human Resources": [32000, 70000],
                "IT Support": [32000, 62000],
                Operations: [32000, 68000],
                Legal: [50000, 95000],
            },
        },
        benefitPlanWeights: {
            "Full-time": {
                "Premium Health": 0.30,
                "Basic Health": 0.20,
                "401k Standard": 0.22,
                "Dental Gold": 0.11,
                "Vision Plus": 0.09,
                "Life Insurance": 0.08,
            },
            "Part-time": {
                "Basic Health": 0.30,
                "Vision Plus": 0.19,
                "Dental Gold": 0.17,
                "401k Standard": 0.16,
                "Life Insurance": 0.10,
                "Premium Health": 0.08,
            },
        },
    },
    enterprise: {
        label: "Enterprise",
        totalRecords: 500000,
        batchSize: 5000,
        shareholderRate: 0.15,
        previousYearCoverage: 0.70,
        recentBenefitChangeRate: 0.05,
        genderWeights: { Male: 0.50, Female: 0.50 },
        ethnicityWeights: {
            Caucasian: 0.27,
            Hispanic: 0.22,
            Asian: 0.21,
            "African American": 0.22,
            Other: 0.08,
        },
        employmentTypeWeights: { "Full-time": 0.72, "Part-time": 0.28 },
        departmentWeights: {
            Engineering: 0.16,
            Sales: 0.14,
            Operations: 0.14,
            Marketing: 0.13,
            Finance: 0.13,
            "Human Resources": 0.11,
            "IT Support": 0.11,
            Legal: 0.08,
        },
        hireDateRange: [new Date(2014, 0, 1), new Date(2025, 0, 1)],
        birthDateRange: [new Date(1962, 0, 1), new Date(2001, 0, 1)],
        vacationBalanceRange: { "Full-time": [0, 30], "Part-time": [0, 20] },
        vacationTakenRange: { "Full-time": [0, 20], "Part-time": [0, 14] },
        previousYearFactorRange: [0.84, 1.05],
        salaryBands: {
            "Full-time": {
                Engineering: [95000, 200000],
                Sales: [65000, 160000],
                Marketing: [65000, 145000],
                Finance: [78000, 160000],
                "Human Resources": [65000, 140000],
                "IT Support": [58000, 125000],
                Operations: [65000, 135000],
                Legal: [110000, 210000],
            },
            "Part-time": {
                Engineering: [45000, 90000],
                Sales: [36000, 82000],
                Marketing: [35000, 78000],
                Finance: [40000, 85000],
                "Human Resources": [34000, 74000],
                "IT Support": [34000, 68000],
                Operations: [34000, 74000],
                Legal: [52000, 102000],
            },
        },
        benefitPlanWeights: {
            "Full-time": {
                "Premium Health": 0.30,
                "Basic Health": 0.19,
                "401k Standard": 0.24,
                "Dental Gold": 0.10,
                "Vision Plus": 0.09,
                "Life Insurance": 0.08,
            },
            "Part-time": {
                "Basic Health": 0.28,
                "Vision Plus": 0.20,
                "Dental Gold": 0.16,
                "401k Standard": 0.16,
                "Life Insurance": 0.11,
                "Premium Health": 0.09,
            },
        },
    },
};

function parseArgs(argv) {
    const options = {};

    for (let i = 0; i < argv.length; i++) {
        const raw = argv[i];
        const eqIndex = raw.indexOf("=");
        const key = eqIndex >= 0 ? raw.slice(0, eqIndex) : raw;
        const inlineValue = eqIndex >= 0 ? raw.slice(eqIndex + 1) : null;

        if (key === "--help" || key === "-h") {
            options.help = true;
            continue;
        }

        if (key === "--profile") {
            options.profile = inlineValue || argv[i + 1];
            if (!inlineValue) i++;
            continue;
        }
        if (key === "--total") {
            options.total = inlineValue || argv[i + 1];
            if (!inlineValue) i++;
            continue;
        }
        if (key === "--batch") {
            options.batch = inlineValue || argv[i + 1];
            if (!inlineValue) i++;
            continue;
        }
    }

    return options;
}

function printUsageAndExit() {
    console.log("Seed Script Usage:");
    console.log("  node scripts/seed.js [--profile smb|mid|enterprise] [--total N] [--batch N]");
    console.log("Examples:");
    console.log("  node scripts/seed.js --profile smb");
    console.log("  node scripts/seed.js --profile mid --total 180000 --batch 3000");
    process.exit(0);
}

function toPositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return min + Math.random() * (max - min);
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function toWeightedList(weightMap) {
    return Object.entries(weightMap).map(([value, weight]) => ({
        value,
        weight: Number(weight) || 0,
    })).filter((entry) => entry.weight > 0);
}

function pickWeighted(weightMap) {
    const weightedList = toWeightedList(weightMap);
    if (weightedList.length === 0) return null;

    const totalWeight = weightedList.reduce((acc, item) => acc + item.weight, 0);
    let threshold = Math.random() * totalWeight;

    for (const item of weightedList) {
        threshold -= item.weight;
        if (threshold <= 0) return item.value;
    }

    return weightedList[weightedList.length - 1].value;
}

function getSalaryBand(profileConfig, employmentType, departmentName) {
    const typeBands = profileConfig.salaryBands[employmentType] || {};
    return typeBands[departmentName] || [40000, 120000];
}

function pickBenefitPlanName(profileConfig, employmentType) {
    const weightedPlans = profileConfig.benefitPlanWeights[employmentType]
        || profileConfig.benefitPlanWeights["Full-time"];
    return pickWeighted(weightedPlans);
}

function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
}

function deriveCompensation({ employmentType, currentEarnings }) {
    if (employmentType === "Part-time") {
        const annualHours = 1040;
        return {
            payType: "HOURLY",
            payRate: Number((currentEarnings / annualHours).toFixed(2)),
        };
    }

    return {
        payType: "SALARY",
        payRate: currentEarnings,
    };
}

function getRecentChangeDate(daysBack = 45) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - daysBack);
    return toIsoDate(randomDate(start, now));
}

function isMongoQuotaError(error) {
    if (!error) return false;
    const message = `${error.message || ""} ${error?.errorResponse?.errmsg || ""}`.toLowerCase();
    return error.code === 8000 || error?.errorResponse?.code === 8000 || message.includes("space quota");
}

async function setupReferenceData() {
    console.log("[seed] Setting up reference data (Departments, Plans, PayRates)...");

    await Department.deleteMany({});
    CACHED_DATA.depts = await Department.insertMany(DEPARTMENTS);
    CACHED_DATA.deptByName = new Map(CACHED_DATA.depts.map((dept) => [dept.name, dept]));

    await Alert.deleteMany({});
    await Alert.insertMany([
        {
            name: "Hiring Anniversary",
            type: "anniversary",
            threshold: 30,
            description: "Anniversary within 30 days",
        },
        {
            name: "High Vacation Balance",
            type: "vacation",
            threshold: 25,
            description: ">25 days vacation",
        },
        {
            name: "Recent Benefits Change",
            type: "benefits_change",
            threshold: 7,
            description: "Change in last 7 days",
        },
        {
            name: "Birthday Alert",
            type: "birthday",
            threshold: 0,
            description: "Birthday this month",
        },
    ]);

    // MySQL disallows TRUNCATE on parent tables referenced by FKs unless FK checks are disabled.
    const truncateTables = [
        "sync_log",
        "alert_employees",
        "alerts_summary",
        "benefits_summary",
        "vacation_summary",
        "earnings_employee_year",
        "earnings_summary",
        "employee_benefits",
        "vacation_records",
        "earnings",
        "pay_rates",
        "benefits_plans",
    ];

    try {
        await Promise.all([
            IntegrationEvent.deleteMany({}),
            IntegrationEventAudit.deleteMany({}),
            Counter.deleteMany({
                key: {
                    $in: ["integration-event-id", "integration-audit-id"],
                },
            }),
        ]);
        await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
        for (const tableName of truncateTables) {
            await sequelize.query(`TRUNCATE TABLE \`${tableName}\``);
        }
    } catch (error) {
        console.log(`[seed] Truncate failed (${error.message}). Falling back to DELETE...`);
        await EmployeeBenefit.destroy({ where: {} });
        await VacationRecord.destroy({ where: {} });
        await Earning.destroy({ where: {} });
        await PayRate.destroy({ where: {} });
        await EarningsEmployeeYear.destroy({ where: {} });
        await EarningsSummary.destroy({ where: {} });
        await VacationSummary.destroy({ where: {} });
        await BenefitsSummary.destroy({ where: {} });
        await AlertsSummary.destroy({ where: {} });
        await AlertEmployee.destroy({ where: {} });
        await BenefitPlan.destroy({ where: {} });
    } finally {
        await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }

    return BenefitPlan.bulkCreate(BENEFIT_PLANS);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printUsageAndExit();
        return;
    }

    const profileName = (args.profile || process.env.SEED_PROFILE || "enterprise").toLowerCase();
    const profileConfig = PROFILE_CONFIGS[profileName];
    if (!profileConfig) {
        throw new Error(`Invalid profile "${profileName}". Use smb, mid, or enterprise.`);
    }

    const totalRecords = toPositiveInt(args.total || process.env.SEED_TOTAL_RECORDS, profileConfig.totalRecords);
    const batchSize = toPositiveInt(args.batch || process.env.SEED_BATCH_SIZE, profileConfig.batchSize);

    console.log(`[seed] Starting seed profile=${profileConfig.label} records=${totalRecords} batch=${batchSize}`);

    let exitCode = 0;

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("[seed] MongoDB connected");
        await connectMySQL();
        await syncDatabase();
        console.log("[seed] MySQL connected");

        const createdPlans = await setupReferenceData();
        const planByName = new Map(createdPlans.map((plan) => [plan.name, plan]));
        await Employee.deleteMany({});
        console.log("[seed] Existing employees cleared");

        const startTime = Date.now();
        let currentId = 1;
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;
        let stoppedByMongoQuota = false;

        for (let i = 0; i < totalRecords; i += batchSize) {
            const batchEmployees = [];
            const batchEarnings = [];
            const batchVacations = [];
            const batchEmployeeBenefits = [];
            const batchPayRates = [];

            for (let j = 0; j < batchSize && (i + j) < totalRecords; j++) {
                const empNum = currentId++;
                const employeeId = `EMP${String(empNum).padStart(7, "0")}`;

                const departmentName = pickWeighted(profileConfig.departmentWeights);
                const departmentDoc = CACHED_DATA.deptByName.get(departmentName) || randomItem(CACHED_DATA.depts);
                const employmentType = pickWeighted(profileConfig.employmentTypeWeights) || "Full-time";
                const gender = pickWeighted(profileConfig.genderWeights) || "Male";
                const ethnicity = pickWeighted(profileConfig.ethnicityWeights) || "Other";
                const isShareholder = Math.random() < profileConfig.shareholderRate;

                const vacationBalanceRange = profileConfig.vacationBalanceRange[employmentType] || [0, 30];
                const vacationTakenRange = profileConfig.vacationTakenRange[employmentType] || [0, 15];

                const [salaryMin, salaryMax] = getSalaryBand(profileConfig, employmentType, departmentDoc.name);
                const currentEarnings = randomInt(salaryMin, salaryMax);

                const [prevFactorMin, prevFactorMax] = profileConfig.previousYearFactorRange || [0.85, 1.03];
                const previousEarnings = Math.round(currentEarnings * randomFloat(prevFactorMin, prevFactorMax));
                const hasPreviousYear = Math.random() < profileConfig.previousYearCoverage;
                const hireDate = randomDate(profileConfig.hireDateRange[0], profileConfig.hireDateRange[1]);
                const birthDate = randomDate(profileConfig.birthDateRange[0], profileConfig.birthDateRange[1]);
                const vacationDays = randomInt(vacationBalanceRange[0], vacationBalanceRange[1]);
                const vacationTaken = randomInt(vacationTakenRange[0], vacationTakenRange[1]);
                const effectiveDate = toIsoDate(randomDate(new Date(currentYear - 4, 0, 1), new Date(currentYear, 0, 1)));
                const compensation = deriveCompensation({ employmentType, currentEarnings });

                const benefitPlanName = pickBenefitPlanName(profileConfig, employmentType);
                const selectedPlan = planByName.get(benefitPlanName) || randomItem(createdPlans);
                const hasRecentBenefitChange = Math.random() < profileConfig.recentBenefitChangeRate;

                batchEmployees.push({
                    employeeId,
                    firstName: randomItem(CACHED_DATA.firstNames),
                    lastName: randomItem(CACHED_DATA.lastNames),
                    gender,
                    ethnicity,
                    employmentType,
                    isShareholder,
                    departmentId: departmentDoc._id,
                    hireDate,
                    birthDate,
                    vacationDays,
                    paidToDate: currentEarnings,
                    paidLastYear: hasPreviousYear ? previousEarnings : 0,
                    payRate: compensation.payRate,
                    payRateId: 0,
                    annualEarnings: currentEarnings,
                    annualEarningsYear: currentYear,
                });

                batchEarnings.push({
                    employee_id: employeeId,
                    amount: currentEarnings,
                    year: currentYear,
                    month: 12,
                });

                if (hasPreviousYear) {
                    batchEarnings.push({
                        employee_id: employeeId,
                        amount: previousEarnings,
                        year: previousYear,
                        month: 12,
                    });
                }

                batchVacations.push({
                    employee_id: employeeId,
                    days_taken: vacationTaken,
                    year: currentYear,
                });

                batchEmployeeBenefits.push({
                    employee_id: employeeId,
                    plan_id: selectedPlan.id,
                    amount_paid: selectedPlan.monthly_cost * 12,
                    effective_date: effectiveDate,
                    last_change_date: hasRecentBenefitChange ? getRecentChangeDate(45) : null,
                });

                batchPayRates.push({
                    employee_id: employeeId,
                    pay_rate: compensation.payRate,
                    pay_type: compensation.payType,
                    effective_date: effectiveDate,
                    is_active: true,
                });
            }

            // Write Mongo first to avoid SQL > Mongo divergence if Mongo runs out of quota.
            try {
                await Employee.insertMany(batchEmployees, { ordered: false });
            } catch (error) {
                if (isMongoQuotaError(error)) {
                    stoppedByMongoQuota = true;
                    const mongoCount = await Employee.countDocuments();
                    console.error(`[seed] Mongo quota reached. Stopping seed. Current Mongo employees: ${mongoCount}.`);
                    break;
                }
                throw error;
            }

            const sqlTransaction = await sequelize.transaction();
            try {
                await Promise.all([
                    Earning.bulkCreate(batchEarnings, {
                        validate: false,
                        logging: false,
                        transaction: sqlTransaction,
                    }),
                    VacationRecord.bulkCreate(batchVacations, {
                        validate: false,
                        logging: false,
                        transaction: sqlTransaction,
                    }),
                    EmployeeBenefit.bulkCreate(batchEmployeeBenefits, {
                        validate: false,
                        logging: false,
                        transaction: sqlTransaction,
                    }),
                    PayRate.bulkCreate(batchPayRates, {
                        validate: false,
                        logging: false,
                        transaction: sqlTransaction,
                    }),
                ]);
                await sqlTransaction.commit();
            } catch (error) {
                await sqlTransaction.rollback();
                // Best-effort rollback of just-inserted Mongo batch to reduce cross-DB inconsistency.
                const insertedIds = batchEmployees.map((emp) => emp.employeeId);
                try {
                    await Employee.deleteMany({ employeeId: { $in: insertedIds } });
                } catch (rollbackError) {
                    console.error("[seed] Mongo rollback failed after SQL error:", rollbackError.message);
                }
                throw error;
            }

            if ((i + batchSize) % 50000 === 0 || i === 0) {
                const generated = currentId - 1;
                const progress = Math.min((generated / totalRecords) * 100, 100).toFixed(1);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                console.log(`[seed] Progress ${progress}% (${generated}) elapsed=${elapsed}s`);
            }
        }

        if (stoppedByMongoQuota) {
            const mongoCount = await Employee.countDocuments();
            throw new Error(`Seed stopped due to Mongo quota. Mongo employees=${mongoCount}. SQL writes were skipped for the failed batch.`);
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[seed] Completed profile=${profileConfig.label} records=${totalRecords} in ${totalTime}s`);
    } catch (error) {
        console.error("[seed] Seed error:", error);
        exitCode = 1;
    } finally {
        await mongoose.disconnect();
        process.exit(exitCode);
    }
}

main();
