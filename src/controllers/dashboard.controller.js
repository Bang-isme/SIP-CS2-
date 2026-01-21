import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import { Earning, VacationRecord, BenefitPlan, EmployeeBenefit } from "../models/sql/index.js";
import { Op, fn, col, literal } from "sequelize";

/**
 * Dashboard Controller
 * Aggregates data from both MongoDB (HR) and MySQL (Payroll)
 */

// Helper: Get employee IDs from MongoDB filtered by criteria
const getFilteredEmployeeIds = async (filters) => {
    const query = {};

    if (filters.isShareholder !== undefined) {
        query.isShareholder = filters.isShareholder === "true";
    }
    if (filters.gender) {
        query.gender = filters.gender;
    }
    if (filters.ethnicity) {
        query.ethnicity = filters.ethnicity;
    }
    if (filters.employmentType) {
        query.employmentType = filters.employmentType;
    }
    if (filters.departmentId) {
        query.departmentId = filters.departmentId;
    }

    const employees = await Employee.find(query).select("employeeId _id");
    return employees.map((e) => e.employeeId || e._id.toString());
};

/**
 * GET /api/dashboard/earnings
 * Returns total earnings by various groupings
 */
export const getEarningsSummary = async (req, res) => {
    try {
        const { year, groupBy = "department" } = req.query;
        const currentYear = year || new Date().getFullYear();
        const previousYear = parseInt(currentYear) - 1;

        // Get all employees with their demographics from MongoDB
        const employees = await Employee.find().populate("departmentId").lean();

        // Get earnings from MySQL
        const currentYearEarnings = await Earning.findAll({
            where: { year: currentYear },
            attributes: ["employee_id", [fn("SUM", col("amount")), "total"]],
            group: ["employee_id"],
            raw: true,
        });

        const previousYearEarnings = await Earning.findAll({
            where: { year: previousYear },
            attributes: ["employee_id", [fn("SUM", col("amount")), "total"]],
            group: ["employee_id"],
            raw: true,
        });

        // Create lookup maps
        const currentEarningsMap = new Map(
            currentYearEarnings.map((e) => [e.employee_id, parseFloat(e.total) || 0])
        );
        const previousEarningsMap = new Map(
            previousYearEarnings.map((e) => [e.employee_id, parseFloat(e.total) || 0])
        );

        // Aggregate by groupings
        const summary = {
            byDepartment: {},
            byShareholder: { shareholder: { current: 0, previous: 0 }, nonShareholder: { current: 0, previous: 0 } },
            byGender: {},
            byEthnicity: {},
            byEmploymentType: { "Full-time": { current: 0, previous: 0 }, "Part-time": { current: 0, previous: 0 } },
            totals: { current: 0, previous: 0 },
        };

        employees.forEach((emp) => {
            const empId = emp.employeeId || emp._id.toString();
            const currentEarning = currentEarningsMap.get(empId) || 0;
            const previousEarning = previousEarningsMap.get(empId) || 0;

            // Totals
            summary.totals.current += currentEarning;
            summary.totals.previous += previousEarning;

            // By Department
            const deptName = emp.departmentId?.name || "Unassigned";
            if (!summary.byDepartment[deptName]) {
                summary.byDepartment[deptName] = { current: 0, previous: 0 };
            }
            summary.byDepartment[deptName].current += currentEarning;
            summary.byDepartment[deptName].previous += previousEarning;

            // By Shareholder
            const shareholderKey = emp.isShareholder ? "shareholder" : "nonShareholder";
            summary.byShareholder[shareholderKey].current += currentEarning;
            summary.byShareholder[shareholderKey].previous += previousEarning;

            // By Gender
            const gender = emp.gender || "Unknown";
            if (!summary.byGender[gender]) {
                summary.byGender[gender] = { current: 0, previous: 0 };
            }
            summary.byGender[gender].current += currentEarning;
            summary.byGender[gender].previous += previousEarning;

            // By Ethnicity
            const ethnicity = emp.ethnicity || "Unknown";
            if (!summary.byEthnicity[ethnicity]) {
                summary.byEthnicity[ethnicity] = { current: 0, previous: 0 };
            }
            summary.byEthnicity[ethnicity].current += currentEarning;
            summary.byEthnicity[ethnicity].previous += previousEarning;

            // By Employment Type
            const empType = emp.employmentType || "Full-time";
            summary.byEmploymentType[empType].current += currentEarning;
            summary.byEmploymentType[empType].previous += previousEarning;
        });

        res.json({
            success: true,
            data: summary,
            meta: { currentYear, previousYear, employeeCount: employees.length },
        });
    } catch (error) {
        console.error("getEarningsSummary error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/dashboard/vacation
 * Returns vacation days summary by various groupings
 */
export const getVacationSummary = async (req, res) => {
    try {
        const { year } = req.query;
        const currentYear = year || new Date().getFullYear();
        const previousYear = parseInt(currentYear) - 1;

        const employees = await Employee.find().populate("departmentId").lean();

        // Get vacation from MySQL
        const currentYearVacation = await VacationRecord.findAll({
            where: { year: currentYear },
            attributes: ["employee_id", [fn("SUM", col("days_taken")), "total"]],
            group: ["employee_id"],
            raw: true,
        });

        const previousYearVacation = await VacationRecord.findAll({
            where: { year: previousYear },
            attributes: ["employee_id", [fn("SUM", col("days_taken")), "total"]],
            group: ["employee_id"],
            raw: true,
        });

        const currentVacationMap = new Map(
            currentYearVacation.map((v) => [v.employee_id, parseInt(v.total) || 0])
        );
        const previousVacationMap = new Map(
            previousYearVacation.map((v) => [v.employee_id, parseInt(v.total) || 0])
        );

        const summary = {
            byDepartment: {},
            byShareholder: { shareholder: { current: 0, previous: 0 }, nonShareholder: { current: 0, previous: 0 } },
            byGender: {},
            byEthnicity: {},
            byEmploymentType: { "Full-time": { current: 0, previous: 0 }, "Part-time": { current: 0, previous: 0 } },
            totals: { current: 0, previous: 0 },
        };

        employees.forEach((emp) => {
            const empId = emp.employeeId || emp._id.toString();
            const currentDays = currentVacationMap.get(empId) || 0;
            const previousDays = previousVacationMap.get(empId) || 0;

            summary.totals.current += currentDays;
            summary.totals.previous += previousDays;

            // By Department
            const deptName = emp.departmentId?.name || "Unassigned";
            if (!summary.byDepartment[deptName]) {
                summary.byDepartment[deptName] = { current: 0, previous: 0 };
            }
            summary.byDepartment[deptName].current += currentDays;
            summary.byDepartment[deptName].previous += previousDays;

            // By Shareholder
            const shareholderKey = emp.isShareholder ? "shareholder" : "nonShareholder";
            summary.byShareholder[shareholderKey].current += currentDays;
            summary.byShareholder[shareholderKey].previous += previousDays;

            // By Gender
            const gender = emp.gender || "Unknown";
            if (!summary.byGender[gender]) {
                summary.byGender[gender] = { current: 0, previous: 0 };
            }
            summary.byGender[gender].current += currentDays;
            summary.byGender[gender].previous += previousDays;

            // By Ethnicity
            const ethnicity = emp.ethnicity || "Unknown";
            if (!summary.byEthnicity[ethnicity]) {
                summary.byEthnicity[ethnicity] = { current: 0, previous: 0 };
            }
            summary.byEthnicity[ethnicity].current += currentDays;
            summary.byEthnicity[ethnicity].previous += previousDays;

            // By Employment Type
            const empType = emp.employmentType || "Full-time";
            summary.byEmploymentType[empType].current += currentDays;
            summary.byEmploymentType[empType].previous += previousDays;
        });

        res.json({
            success: true,
            data: summary,
            meta: { currentYear, previousYear, employeeCount: employees.length },
        });
    } catch (error) {
        console.error("getVacationSummary error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/dashboard/benefits
 * Returns average benefits by plan and shareholder status
 */
export const getBenefitsSummary = async (req, res) => {
    try {
        const employees = await Employee.find().lean();

        // Get all benefit plans
        const plans = await BenefitPlan.findAll({ raw: true });

        // Get employee benefits with plan info
        const employeeBenefits = await EmployeeBenefit.findAll({
            include: [{ model: BenefitPlan, as: "plan" }],
            raw: true,
            nest: true,
        });

        // Create employee shareholder lookup from MongoDB
        const shareholderMap = new Map(
            employees.map((e) => [e.employeeId || e._id.toString(), e.isShareholder || false])
        );

        // Aggregate by plan and shareholder status
        const summary = {
            byPlan: {},
            byShareholder: {
                shareholder: { totalPaid: 0, count: 0, average: 0 },
                nonShareholder: { totalPaid: 0, count: 0, average: 0 },
            },
        };

        employeeBenefits.forEach((eb) => {
            const planName = eb.plan?.name || "Unknown";
            const isShareholder = shareholderMap.get(eb.employee_id) || false;
            const amount = parseFloat(eb.amount_paid) || 0;

            // By Plan
            if (!summary.byPlan[planName]) {
                summary.byPlan[planName] = {
                    shareholder: { totalPaid: 0, count: 0, average: 0 },
                    nonShareholder: { totalPaid: 0, count: 0, average: 0 },
                };
            }

            const planKey = isShareholder ? "shareholder" : "nonShareholder";
            summary.byPlan[planName][planKey].totalPaid += amount;
            summary.byPlan[planName][planKey].count += 1;

            // Overall by shareholder
            summary.byShareholder[planKey].totalPaid += amount;
            summary.byShareholder[planKey].count += 1;
        });

        // Calculate averages
        Object.keys(summary.byPlan).forEach((plan) => {
            ["shareholder", "nonShareholder"].forEach((key) => {
                const data = summary.byPlan[plan][key];
                data.average = data.count > 0 ? data.totalPaid / data.count : 0;
            });
        });

        ["shareholder", "nonShareholder"].forEach((key) => {
            const data = summary.byShareholder[key];
            data.average = data.count > 0 ? data.totalPaid / data.count : 0;
        });

        res.json({
            success: true,
            data: summary,
            meta: { planCount: plans.length, employeeCount: employees.length },
        });
    } catch (error) {
        console.error("getBenefitsSummary error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/dashboard/drilldown
 * Returns detailed employee list based on filters
 */
export const getDrilldown = async (req, res) => {
    try {
        const { department, gender, ethnicity, employmentType, isShareholder, page = 1, limit = 20 } = req.query;

        const query = {};
        if (department) query.departmentId = department;
        if (gender) query.gender = gender;
        if (ethnicity) query.ethnicity = ethnicity;
        if (employmentType) query.employmentType = employmentType;
        if (isShareholder !== undefined) query.isShareholder = isShareholder === "true";

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const employees = await Employee.find(query)
            .populate("departmentId")
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Employee.countDocuments(query);

        // Get payroll data for these employees
        const employeeIds = employees.map((e) => e.employeeId || e._id.toString());

        const earnings = await Earning.findAll({
            where: { employee_id: { [Op.in]: employeeIds } },
            attributes: ["employee_id", [fn("SUM", col("amount")), "total"]],
            group: ["employee_id"],
            raw: true,
        });

        const earningsMap = new Map(earnings.map((e) => [e.employee_id, parseFloat(e.total) || 0]));

        const enrichedEmployees = employees.map((emp) => ({
            ...emp,
            department: emp.departmentId?.name || "Unassigned",
            totalEarnings: earningsMap.get(emp.employeeId || emp._id.toString()) || 0,
        }));

        res.json({
            success: true,
            data: enrichedEmployees,
            meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("getDrilldown error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
