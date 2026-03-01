/**
 * Cleanup SQL rows whose employee_id does not exist in MongoDB employees.
 *
 * Usage:
 *   node scripts/cleanup-sql-orphans.js
 */

import mongoose from "mongoose";
import { config } from "dotenv";
config();

import { Op, Sequelize } from "sequelize";
import Employee from "../src/models/Employee.js";
import { connectMySQL } from "../src/mysqlDatabase.js";
import {
    Earning,
    VacationRecord,
    EmployeeBenefit,
    EarningsEmployeeYear,
} from "../src/models/sql/index.js";

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

async function buildValidEmployeeSet() {
    const set = new Set();
    const cursor = Employee.find().select("employeeId").lean().cursor();
    for await (const row of cursor) {
        if (row.employeeId) set.add(row.employeeId);
    }
    return set;
}

async function getDistinctEmployeeIds(Model) {
    const rows = await Model.findAll({
        attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("employee_id")), "employee_id"]],
        raw: true,
    });
    return rows.map((r) => r.employee_id).filter(Boolean);
}

async function cleanupModel(Model, label, validEmployeeSet) {
    const distinctIds = await getDistinctEmployeeIds(Model);
    const orphanIds = distinctIds.filter((id) => !validEmployeeSet.has(id));

    if (orphanIds.length === 0) {
        console.log(`[cleanup] ${label}: no orphan employee_ids`);
        return { label, orphanIds: 0, deletedRows: 0 };
    }

    let deletedRows = 0;
    const chunks = chunkArray(orphanIds, 1000);
    for (const ids of chunks) {
        deletedRows += await Model.destroy({
            where: { employee_id: { [Op.in]: ids } },
        });
    }

    console.log(`[cleanup] ${label}: deleted ${deletedRows} rows for ${orphanIds.length} orphan employee_ids`);
    return { label, orphanIds: orphanIds.length, deletedRows };
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        await connectMySQL();
        console.log("[cleanup] Connected to MongoDB + MySQL");

        const validEmployeeSet = await buildValidEmployeeSet();
        console.log(`[cleanup] Loaded ${validEmployeeSet.size} valid Mongo employee IDs`);

        const results = [];
        results.push(await cleanupModel(Earning, "earnings", validEmployeeSet));
        results.push(await cleanupModel(VacationRecord, "vacation_records", validEmployeeSet));
        results.push(await cleanupModel(EmployeeBenefit, "employee_benefits", validEmployeeSet));
        results.push(await cleanupModel(EarningsEmployeeYear, "earnings_employee_year", validEmployeeSet));

        const totalDeleted = results.reduce((sum, row) => sum + row.deletedRows, 0);
        console.log(`[cleanup] Total deleted orphan rows: ${totalDeleted}`);
    } catch (error) {
        console.error("[cleanup] Failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

main();
