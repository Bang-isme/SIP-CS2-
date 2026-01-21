/**
 * Seed Script - Populate sample data for both MongoDB and MySQL
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

// Sample data
const departments = [
    { name: "Human Resources", code: "HR" },
    { name: "Finance", code: "FIN" },
    { name: "Engineering", code: "ENG" },
    { name: "Sales", code: "SALES" },
    { name: "Marketing", code: "MKT" },
];

const genders = ["Male", "Female", "Other"];
const ethnicities = ["Asian", "Caucasian", "Hispanic", "African American", "Other"];
const employmentTypes = ["Full-time", "Part-time"];

const firstNames = ["John", "Jane", "Mike", "Sarah", "David", "Emily", "Chris", "Lisa", "Tom", "Amy"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", "Wilson", "Moore", "Taylor"];

const benefitPlans = [
    { name: "Basic Health Insurance", type: "health", monthly_cost: 200 },
    { name: "Premium Health Insurance", type: "health", monthly_cost: 450 },
    { name: "Dental Plan", type: "dental", monthly_cost: 50 },
    { name: "Vision Plan", type: "vision", monthly_cost: 30 },
    { name: "401k Retirement", type: "retirement", monthly_cost: 0 },
    { name: "Life Insurance", type: "life", monthly_cost: 25 },
];

const payRates = [
    { name: "Junior", value: 25, tax_percentage: 0.15, type: "hourly" },
    { name: "Mid-Level", value: 45, tax_percentage: 0.22, type: "hourly" },
    { name: "Senior", value: 75, tax_percentage: 0.28, type: "hourly" },
    { name: "Manager", value: 85000, tax_percentage: 0.32, type: "salary" },
    { name: "Director", value: 120000, tax_percentage: 0.35, type: "salary" },
];

// Helper functions
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function seedMongoDB() {
    console.log("🌱 Seeding MongoDB...");

    // Clear existing data
    await Department.deleteMany({});
    await Employee.deleteMany({});
    await Alert.deleteMany({});

    // Create departments
    const createdDepts = await Department.insertMany(departments);
    console.log(`✅ Created ${createdDepts.length} departments`);

    // Create employees
    const employees = [];
    for (let i = 1; i <= 50; i++) {
        const hireDate = randomDate(new Date(2015, 0, 1), new Date(2024, 11, 31));
        const birthDate = randomDate(new Date(1970, 0, 1), new Date(2000, 11, 31));

        employees.push({
            employeeId: `EMP${String(i).padStart(4, "0")}`,
            firstName: randomItem(firstNames),
            lastName: randomItem(lastNames),
            gender: randomItem(genders),
            ethnicity: randomItem(ethnicities),
            employmentType: randomItem(employmentTypes),
            isShareholder: Math.random() < 0.2, // 20% are shareholders
            departmentId: randomItem(createdDepts)._id,
            hireDate,
            birthDate,
            vacationDays: randomInt(0, 30),
            paidToDate: randomInt(20000, 150000),
            paidLastYear: randomInt(20000, 150000),
            payRate: randomInt(25, 100),
            payRateId: randomInt(1, 5),
        });
    }

    const createdEmployees = await Employee.insertMany(employees);
    console.log(`✅ Created ${createdEmployees.length} employees`);

    // Create default alerts
    const alerts = [
        { name: "Hiring Anniversary Alert", type: "anniversary", threshold: 30, description: "Employees with anniversary within 30 days" },
        { name: "Vacation Accumulation Alert", type: "vacation", threshold: 20, description: "Employees with more than 20 vacation days" },
        { name: "Benefits Change Alert", type: "benefits_change", threshold: 7, description: "Benefits changes in last 7 days" },
        { name: "Birthday This Month", type: "birthday", threshold: 0, description: "Employees with birthdays this month" },
    ];

    await Alert.insertMany(alerts);
    console.log(`✅ Created ${alerts.length} alerts`);

    return createdEmployees;
}

async function seedMySQL(employees) {
    console.log("🌱 Seeding MySQL...");

    // Clear existing data
    await EmployeeBenefit.destroy({ where: {} });
    await BenefitPlan.destroy({ where: {} });
    await VacationRecord.destroy({ where: {} });
    await Earning.destroy({ where: {} });
    await PayRate.destroy({ where: {} });

    // Create pay rates
    const createdPayRates = await PayRate.bulkCreate(payRates);
    console.log(`✅ Created ${createdPayRates.length} pay rates`);

    // Create benefit plans
    const createdPlans = await BenefitPlan.bulkCreate(benefitPlans);
    console.log(`✅ Created ${createdPlans.length} benefit plans`);

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Create earnings for each employee
    const earnings = [];
    const vacations = [];
    const employeeBenefits = [];

    for (const emp of employees) {
        const empId = emp.employeeId;

        // Earnings for current year (monthly)
        for (let month = 1; month <= 12; month++) {
            if (month <= new Date().getMonth() + 1) {
                earnings.push({
                    employee_id: empId,
                    amount: randomInt(3000, 15000),
                    year: currentYear,
                    month,
                });
            }
        }

        // Earnings for previous year
        for (let month = 1; month <= 12; month++) {
            earnings.push({
                employee_id: empId,
                amount: randomInt(3000, 15000),
                year: previousYear,
                month,
            });
        }

        // Vacation records
        vacations.push({
            employee_id: empId,
            days_taken: randomInt(0, 15),
            year: currentYear,
        });
        vacations.push({
            employee_id: empId,
            days_taken: randomInt(0, 20),
            year: previousYear,
        });

        // Employee benefits (assign 1-3 random plans)
        const numPlans = randomInt(1, 3);
        const assignedPlans = new Set();
        for (let i = 0; i < numPlans; i++) {
            const plan = randomItem(createdPlans);
            if (!assignedPlans.has(plan.id)) {
                assignedPlans.add(plan.id);
                employeeBenefits.push({
                    employee_id: empId,
                    plan_id: plan.id,
                    amount_paid: randomInt(500, 5000),
                    effective_date: randomDate(new Date(2020, 0, 1), new Date()).toISOString().split("T")[0],
                    last_change_date: Math.random() < 0.1 ? new Date().toISOString().split("T")[0] : null,
                });
            }
        }
    }

    await Earning.bulkCreate(earnings);
    console.log(`✅ Created ${earnings.length} earnings records`);

    await VacationRecord.bulkCreate(vacations);
    console.log(`✅ Created ${vacations.length} vacation records`);

    await EmployeeBenefit.bulkCreate(employeeBenefits);
    console.log(`✅ Created ${employeeBenefits.length} employee benefit enrollments`);
}

async function main() {
    try {
        console.log("🚀 Starting seed process...\n");

        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log("📦 MongoDB connected");

        // Connect to MySQL
        await connectMySQL();
        await syncDatabase();
        console.log("📦 MySQL connected\n");

        // Seed MongoDB
        const employees = await seedMongoDB();

        // Seed MySQL
        await seedMySQL(employees);

        console.log("\n✅ Seeding complete!");
        console.log("📊 Summary:");
        console.log("   - 5 Departments");
        console.log("   - 50 Employees");
        console.log("   - 4 Alert configurations");
        console.log("   - 5 Pay rates");
        console.log("   - 6 Benefit plans");
        console.log("   - Earnings records (current + previous year)");
        console.log("   - Vacation records");
        console.log("   - Employee benefit enrollments");

    } catch (error) {
        console.error("❌ Seed error:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
