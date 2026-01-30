/**
 * Data Quality Audit Script
 * Run: node scripts/audit-data.js
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

import Employee from '../src/models/Employee.js';
import Department from '../src/models/Department.js';
import { connectMySQL } from '../src/mysqlDatabase.js';
import { Earning, VacationRecord, EmployeeBenefit, BenefitPlan } from '../src/models/sql/index.js';
import { Op, Sequelize } from 'sequelize';

async function auditHRData() {
    console.log('\n=== A. HR DATA (MongoDB) ===\n');

    const total = await Employee.countDocuments();
    console.log('Total Employees:', total);

    // By Department
    const depts = await Department.find().lean();
    const deptMap = new Map(depts.map(d => [d._id.toString(), d.name]));
    const byDept = await Employee.aggregate([
        { $group: { _id: '$departmentId', count: { $sum: 1 } } }
    ]);
    console.log('\nBy Department:');
    byDept.forEach(d => {
        const name = deptMap.get(d._id?.toString()) || 'Unknown';
        const pct = (d.count / total * 100).toFixed(2);
        console.log(`  ${name}: ${d.count} (${pct}%)`);
    });

    // By Employment Type
    const byType = await Employee.aggregate([
        { $group: { _id: '$employmentType', count: { $sum: 1 } } }
    ]);
    console.log('\nBy Employment Type:');
    byType.forEach(t => {
        const pct = (t.count / total * 100).toFixed(2);
        console.log(`  ${t._id}: ${t.count} (${pct}%)`);
    });

    // By Gender
    const byGender = await Employee.aggregate([
        { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);
    console.log('\nBy Gender:');
    byGender.forEach(g => {
        const pct = (g.count / total * 100).toFixed(2);
        console.log(`  ${g._id}: ${g.count} (${pct}%)`);
    });

    // By Ethnicity
    const byEthnicity = await Employee.aggregate([
        { $group: { _id: '$ethnicity', count: { $sum: 1 } } }
    ]);
    console.log('\nBy Ethnicity:');
    byEthnicity.forEach(e => {
        const pct = (e.count / total * 100).toFixed(2);
        console.log(`  ${e._id}: ${e.count} (${pct}%)`);
    });

    // Shareholders
    const shareholders = await Employee.countDocuments({ isShareholder: true });
    console.log('\nShareholders:', shareholders, `(${(shareholders / total * 100).toFixed(2)}%)`);

    // Age distribution (sample)
    const sample = await Employee.find().limit(1000).lean();
    const ages = sample.map(e => {
        const birth = new Date(e.birthDate);
        return new Date().getFullYear() - birth.getFullYear();
    });
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);
    console.log('\nAge Stats (sample 1000):');
    console.log(`  Min: ${minAge}, Max: ${maxAge}, Avg: ${avgAge.toFixed(1)}`);

    // Tenure distribution
    const tenures = sample.map(e => {
        const hire = new Date(e.hireDate);
        return new Date().getFullYear() - hire.getFullYear();
    });
    const avgTenure = tenures.reduce((a, b) => a + b, 0) / tenures.length;
    console.log('\nTenure Stats (sample 1000):');
    console.log(`  Min: ${Math.min(...tenures)}, Max: ${Math.max(...tenures)}, Avg: ${avgTenure.toFixed(1)} years`);

    // Vacation days distribution
    const vacDays = await Employee.aggregate([
        { $group: { _id: null, avg: { $avg: '$vacationDays' }, min: { $min: '$vacationDays' }, max: { $max: '$vacationDays' } } }
    ]);
    console.log('\nVacation Days (balance):');
    console.log(`  Min: ${vacDays[0]?.min}, Max: ${vacDays[0]?.max}, Avg: ${vacDays[0]?.avg?.toFixed(1)}`);

    return { total, byDept, byType, byGender, byEthnicity, shareholders };
}

async function auditPayrollData() {
    console.log('\n=== B. PAYROLL DATA (SQL) ===\n');

    const currentYear = new Date().getFullYear();

    // Earnings stats
    const earningsStats = await Earning.findAll({
        where: { year: currentYear },
        attributes: [
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            [Sequelize.fn('MIN', Sequelize.col('amount')), 'min'],
            [Sequelize.fn('MAX', Sequelize.col('amount')), 'max'],
            [Sequelize.fn('AVG', Sequelize.col('amount')), 'avg']
        ],
        raw: true
    });
    console.log('Earnings (Current Year):');
    console.log(`  Records: ${earningsStats[0].count}`);
    console.log(`  Min: $${Number(earningsStats[0].min).toLocaleString()}`);
    console.log(`  Max: $${Number(earningsStats[0].max).toLocaleString()}`);
    console.log(`  Avg: $${Number(earningsStats[0].avg).toLocaleString()}`);

    // Previous year
    const prevStats = await Earning.findAll({
        where: { year: currentYear - 1 },
        attributes: [
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            [Sequelize.fn('AVG', Sequelize.col('amount')), 'avg']
        ],
        raw: true
    });
    console.log(`\nEarnings (Previous Year): ${prevStats[0].count} records, Avg: $${Number(prevStats[0].avg).toLocaleString()}`);

    // YoY ratio
    const yoyRatio = (prevStats[0].count / earningsStats[0].count * 100).toFixed(1);
    console.log(`YoY Coverage: ${yoyRatio}% of current employees have previous year data`);

    // Vacation records
    const vacStats = await VacationRecord.findAll({
        where: { year: currentYear },
        attributes: [
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            [Sequelize.fn('MIN', Sequelize.col('days_taken')), 'min'],
            [Sequelize.fn('MAX', Sequelize.col('days_taken')), 'max'],
            [Sequelize.fn('AVG', Sequelize.col('days_taken')), 'avg']
        ],
        raw: true
    });
    console.log('\nVacation Taken (Current Year):');
    console.log(`  Records: ${vacStats[0].count}`);
    console.log(`  Min: ${vacStats[0].min} days, Max: ${vacStats[0].max} days, Avg: ${Number(vacStats[0].avg).toFixed(1)} days`);

    // Benefits
    const benefitsCount = await EmployeeBenefit.count();
    const benefitsByPlan = await EmployeeBenefit.findAll({
        attributes: [
            'plan_id',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            [Sequelize.fn('AVG', Sequelize.col('amount_paid')), 'avgPaid']
        ],
        group: ['plan_id'],
        raw: true
    });

    const plans = await BenefitPlan.findAll({ raw: true });
    const planMap = new Map(plans.map(p => [p.id, p.name]));

    console.log('\nBenefits Enrollment:');
    console.log(`  Total: ${benefitsCount}`);
    benefitsByPlan.forEach(b => {
        const name = planMap.get(b.plan_id) || 'Unknown';
        console.log(`  ${name}: ${b.count} (Avg paid: $${Number(b.avgPaid).toLocaleString()})`);
    });

    // Recent benefit changes
    const recentChanges = await EmployeeBenefit.count({
        where: { last_change_date: { [Op.not]: null } }
    });
    console.log(`\nRecent Benefit Changes: ${recentChanges} (${(recentChanges / benefitsCount * 100).toFixed(2)}%)`);

    return { earningsStats, vacStats, benefitsCount };
}

async function auditCrossSystem() {
    console.log('\n=== C. CROSS-DATABASE CONSISTENCY ===\n');

    // Get sample employee IDs from MongoDB
    const mongoEmps = await Employee.find().limit(100).select('employeeId').lean();
    const mongoIds = mongoEmps.map(e => e.employeeId);

    // Check if they exist in SQL
    const sqlEarnings = await Earning.count({
        where: { employee_id: { [Op.in]: mongoIds } }
    });
    console.log(`Sample cross-check (100 employees):`);
    console.log(`  MongoDB IDs found in Earnings: ${sqlEarnings > 0 ? 'YES' : 'NO'}`);

    // Check for orphan records
    const allSqlIds = await Earning.findAll({
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('employee_id')), 'id']],
        raw: true
    });
    const sqlIdSet = new Set(allSqlIds.map(e => e.id));

    // Sample check
    const mongoTotal = await Employee.countDocuments();
    console.log(`\nTotal MongoDB Employees: ${mongoTotal}`);
    console.log(`Total Unique SQL Employee IDs: ${sqlIdSet.size}`);

    const coverage = (sqlIdSet.size / mongoTotal * 100).toFixed(2);
    console.log(`SQL Coverage: ${coverage}%`);
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
        await connectMySQL();
        console.log('MySQL connected');

        await auditHRData();
        await auditPayrollData();
        await auditCrossSystem();

        console.log('\n=== AUDIT COMPLETE ===\n');

    } catch (error) {
        console.error('Audit error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
