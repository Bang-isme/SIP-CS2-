/**
 * Seed Script - Populate massive data (500k) for both MongoDB and MySQL
 * Run: node scripts/seed.js
 */

import mongoose from "mongoose";
import { config } from "dotenv";
config();

// Import MongoDB models
import Employee from "../src/models/Employee.js";
import Department from "../src/models/Department.js";
import Alert from "../src/models/Alert.js";

// Import MySQL models
import { connectMySQL, syncDatabase } from "../src/mysqlDatabase.js";
import {
    Earning,
    VacationRecord,
    BenefitPlan,
    EmployeeBenefit,
    PayRate,
} from "../src/models/sql/index.js";

const MONGODB_URI = process.env.MONGODB_URI;
const TOTAL_RECORDS = 500000;
const BATCH_SIZE = 5000; // Increased batch size for efficiency

// Sample data arrays
const CACHED_DATA = {
    firstNames: ["John", "Jane", "Mike", "Sarah", "David", "Emily", "Chris", "Lisa", "Tom", "Amy",
        "Robert", "Jessica", "William", "Jennifer", "James", "Maria", "Charles", "Susan", "Joseph", "Margaret"],
    lastNames: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", "Wilson", "Moore", "Taylor",
        "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson"],
    genders: ["Male", "Female"],
    ethnicities: ["Asian", "Caucasian", "Hispanic", "African American", "Other"],
    employmentTypes: ["Full-time", "Part-time"],
    depts: []
};

// Fixed Setup Data
const departments = [
    { name: "Human Resources", code: "HR" },
    { name: "Finance", code: "FIN" },
    { name: "Engineering", code: "ENG" },
    { name: "Sales", code: "SALES" },
    { name: "Marketing", code: "MKT" },
    { name: "IT Support", code: "IT" },
    { name: "Operations", code: "OPS" },
    { name: "Legal", code: "LEG" },
];

const benefitPlans = [
    { name: "Basic Health", type: "health", monthly_cost: 200 },
    { name: "Premium Health", type: "health", monthly_cost: 450 },
    { name: "Dental Gold", type: "dental", monthly_cost: 50 },
    { name: "Vision Plus", type: "vision", monthly_cost: 30 },
    { name: "401k Standard", type: "retirement", monthly_cost: 0 },
    { name: "Life Insurance", type: "life", monthly_cost: 25 },
];

const payRates = [
    { name: "L1 Junior", value: 25, tax_percentage: 0.15, type: "hourly" },
    { name: "L2 Mid", value: 45, tax_percentage: 0.22, type: "hourly" },
    { name: "L3 Senior", value: 75, tax_percentage: 0.28, type: "hourly" },
    { name: "M1 Manager", value: 85000, tax_percentage: 0.32, type: "salary" },
    { name: "D1 Director", value: 120000, tax_percentage: 0.35, type: "salary" },
];

// Helper functions (Optimized)
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function setupReferenceData() {
    console.log("🛠️ Setting up reference data (Departments, Plans, PayRates)...");

    // Clear and Init Departments
    await Department.deleteMany({});
    CACHED_DATA.depts = await Department.insertMany(departments);

    await Alert.deleteMany({});
    await Alert.insertMany([
        { name: "Hiring Anniversary", type: "anniversary", threshold: 30, description: "Anniversary within 30 days" },
        { name: "High Vacation Balance", type: "vacation", threshold: 25, description: ">25 days vacation" },
        { name: "Recent Benefits Change", type: "benefits_change", threshold: 7, description: "Change in last 7 days" },
        { name: "Birthday Alert", type: "birthday", threshold: 0, description: "Birthday this month" },
    ]);

    // Clear and Init SQL Ref Data
    try {
        await EmployeeBenefit.destroy({ where: {}, truncate: true });
        await BenefitPlan.destroy({ where: {}, truncate: true });
        await VacationRecord.destroy({ where: {}, truncate: true });
        await Earning.destroy({ where: {}, truncate: true });
        await PayRate.destroy({ where: {}, truncate: true });
    } catch (e) {
        console.log("Truncate error (likely FK constraints), attempting delete..." + e.message);
        // Fallback for FK constraints
        await EmployeeBenefit.destroy({ where: {} });
        await VacationRecord.destroy({ where: {} });
        await Earning.destroy({ where: {} });
        await BenefitPlan.destroy({ where: {} }); // might fail if referenced
        await PayRate.destroy({ where: {} });
    }

    // Re-create
    await PayRate.bulkCreate(payRates);
    const createdPlans = await BenefitPlan.bulkCreate(benefitPlans);
    return createdPlans;
}

async function main() {
    try {
        console.log(`🚀 Starting MASSIVE seed process: ${TOTAL_RECORDS} records\n`);

        // Connect DBs
        await mongoose.connect(MONGODB_URI);
        console.log("📦 MongoDB connected");
        await connectMySQL();
        await syncDatabase();
        console.log("📦 MySQL connected\n");

        const createdPlans = await setupReferenceData();
        await Employee.deleteMany({}); // Clear Mongo Employees

        console.log("⏳ Beginning batch generation...");
        const startTime = Date.now();
        let currentId = 1;

        // Batch Processing Loop
        for (let i = 0; i < TOTAL_RECORDS; i += BATCH_SIZE) {
            const batchEmployees = [];
            const batchEarnings = [];
            const batchVacations = [];
            const batchEmpBenefits = [];

            // DYNAMIC YEAR Fix: Matches Dashboard's current year query
            const currentYear = new Date().getFullYear();
            const previousYear = currentYear - 1;

            // Generate Batch Data
            for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_RECORDS; j++) {
                const empNum = currentId++;
                const empId = `EMP${String(empNum).padStart(7, "0")}`; // EMP0000001

                const dept = randomItem(CACHED_DATA.depts);

                // Mongo Employee
                batchEmployees.push({
                    employeeId: empId,
                    firstName: randomItem(CACHED_DATA.firstNames),
                    lastName: randomItem(CACHED_DATA.lastNames),
                    gender: randomItem(CACHED_DATA.genders),
                    ethnicity: randomItem(CACHED_DATA.ethnicities),
                    employmentType: randomItem(CACHED_DATA.employmentTypes),
                    isShareholder: Math.random() < 0.15,
                    departmentId: dept._id,
                    hireDate: randomDate(new Date(2015, 0, 1), new Date(2024, 0, 1)),
                    birthDate: randomDate(new Date(1970, 0, 1), new Date(2000, 0, 1)),
                    vacationDays: randomInt(0, 30),
                    paidToDate: 0,
                    paidLastYear: 0,
                    payRate: 0,
                    payRateId: 1,
                });

                // MySQL Data (Simplified for mass import)

                // 1. Earnings (Annual summary records for performance)
                batchEarnings.push({
                    employee_id: empId,
                    amount: randomInt(40000, 120000),
                    year: currentYear,
                    month: 12
                });

                // Generate previous year only for 70% of employees
                if (Math.random() > 0.3) {
                    batchEarnings.push({
                        employee_id: empId,
                        amount: randomInt(40000, 110000),
                        year: previousYear,
                        month: 12
                    });
                }

                // 2. Vacation
                batchVacations.push({
                    employee_id: empId,
                    days_taken: randomInt(0, 15),
                    year: currentYear
                });

                // 3. Benefits (1 plan per emp)
                const plan = randomItem(createdPlans);
                batchEmpBenefits.push({
                    employee_id: empId,
                    plan_id: plan.id,
                    amount_paid: plan.monthly_cost * 12,
                    effective_date: '2023-01-01',
                    last_change_date: Math.random() < 0.05 ? '2024-01-15' : null // 5% have recent changes
                });
            }

            // Bulk Insert Batch
            await Promise.all([
                Employee.insertMany(batchEmployees, { ordered: false }),
                Earning.bulkCreate(batchEarnings, { validate: false, logging: false }),
                VacationRecord.bulkCreate(batchVacations, { validate: false, logging: false }),
                EmployeeBenefit.bulkCreate(batchEmpBenefits, { validate: false, logging: false })
            ]);

            if ((i + BATCH_SIZE) % 50000 === 0 || i === 0) {
                const progress = Math.min(((currentId - 1) / TOTAL_RECORDS * 100), 100).toFixed(1);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                console.log(`... ${progress}% (${currentId - 1}) - ${elapsed}s`);
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ COMPLETED: 500,000 records generated in ${totalTime}s`);

    } catch (error) {
        console.error("❌ Seed error:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
