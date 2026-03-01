/**
 * Repair script for cross-database consistency after interrupted seed runs.
 *
 * Actions:
 * 1) Rebuild MongoDB departments when collection is empty but employees reference dept ids.
 * 2) Remove SQL orphan rows whose employee_id no longer exists in MongoDB employees.
 *
 * Usage:
 *   node scripts/repair-cross-db-consistency.js
 */

import mongoose from "mongoose";
import { config } from "dotenv";
config();

import { Op, Sequelize } from "sequelize";
import Employee from "../src/models/Employee.js";
import Department from "../src/models/Department.js";
import { connectMySQL } from "../src/mysqlDatabase.js";
import {
    Earning,
    VacationRecord,
    EmployeeBenefit,
    EarningsEmployeeYear,
} from "../src/models/sql/index.js";

const DEPARTMENT_SEED_ORDER = [
    { name: "Human Resources", code: "HR" },
    { name: "Finance", code: "FIN" },
    { name: "Engineering", code: "ENG" },
    { name: "Sales", code: "SALES" },
    { name: "Marketing", code: "MKT" },
    { name: "IT Support", code: "IT" },
    { name: "Operations", code: "OPS" },
    { name: "Legal", code: "LEG" },
];

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

async function rebuildDepartmentsFromEmployees() {
    const existingDepartments = await Department.countDocuments();
    if (existingDepartments > 0) {
        console.log(`[repair] departments already present (${existingDepartments}). Skipping rebuild.`);
        return { rebuilt: false, inserted: 0 };
    }

    const distinctDeptIds = await Employee.distinct("departmentId", {
        departmentId: { $ne: null, $exists: true },
    });

    if (!Array.isArray(distinctDeptIds) || distinctDeptIds.length === 0) {
        console.log("[repair] No employee department references found. Skipping department rebuild.");
        return { rebuilt: false, inserted: 0 };
    }

    const sortedIds = distinctDeptIds
        .map((id) => String(id))
        .sort((a, b) => a.localeCompare(b));

    const docs = sortedIds.map((id, idx) => {
        const fallback = { name: `Department-${idx + 1}`, code: `D${String(idx + 1).padStart(2, "0")}` };
        const base = DEPARTMENT_SEED_ORDER[idx] || fallback;
        return {
            _id: new mongoose.Types.ObjectId(id),
            name: base.name,
            code: base.code,
            description: "Rebuilt by repair-cross-db-consistency script",
            isActive: true,
        };
    });

    await Department.insertMany(docs, { ordered: true });
    console.log(`[repair] Rebuilt departments from employee references. Inserted ${docs.length} departments.`);
    return { rebuilt: true, inserted: docs.length };
}

async function buildMongoEmployeeIdSet() {
    const set = new Set();
    const cursor = Employee.find().select("employeeId").lean().cursor();
    for await (const row of cursor) {
        if (row.employeeId) set.add(row.employeeId);
    }
    return set;
}

async function listDistinctEmployeeIds(Model) {
    const rows = await Model.findAll({
        attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("employee_id")), "employee_id"]],
        raw: true,
    });
    return rows.map((r) => r.employee_id).filter(Boolean);
}

async function deleteOrphansForModel(Model, label, validIdSet) {
    const distinctIds = await listDistinctEmployeeIds(Model);
    const orphanIds = distinctIds.filter((id) => !validIdSet.has(id));

    if (orphanIds.length === 0) {
        console.log(`[repair] ${label}: no orphan employee_ids.`);
        return { label, orphanEmployeeIds: 0, deletedRows: 0 };
    }

    let deletedRows = 0;
    const chunks = chunkArray(orphanIds, 1000);
    for (const ids of chunks) {
        deletedRows += await Model.destroy({
            where: { employee_id: { [Op.in]: ids } },
        });
    }

    console.log(`[repair] ${label}: removed ${deletedRows} orphan rows across ${orphanIds.length} employee_ids.`);
    return { label, orphanEmployeeIds: orphanIds.length, deletedRows };
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        await connectMySQL();
        console.log("[repair] Connected to MongoDB + MySQL");

        const deptResult = await rebuildDepartmentsFromEmployees();

        const validIdSet = await buildMongoEmployeeIdSet();
        console.log(`[repair] Loaded ${validIdSet.size} Mongo employee IDs.`);

        const results = [];
        results.push(await deleteOrphansForModel(Earning, "earnings", validIdSet));
        results.push(await deleteOrphansForModel(VacationRecord, "vacation_records", validIdSet));
        results.push(await deleteOrphansForModel(EmployeeBenefit, "employee_benefits", validIdSet));
        results.push(await deleteOrphansForModel(EarningsEmployeeYear, "earnings_employee_year", validIdSet));

        const totalDeleted = results.reduce((sum, r) => sum + r.deletedRows, 0);
        console.log("[repair] Summary:");
        console.log(`  departments_rebuilt: ${deptResult.rebuilt ? "yes" : "no"} (${deptResult.inserted})`);
        console.log(`  total_deleted_orphan_rows: ${totalDeleted}`);
    } catch (error) {
        console.error("[repair] Failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

main();
