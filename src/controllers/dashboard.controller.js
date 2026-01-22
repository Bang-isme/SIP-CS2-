import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import { Earning, VacationRecord, BenefitPlan, EmployeeBenefit, EarningsSummary, VacationSummary, BenefitsSummary } from "../models/sql/index.js";
import { Op, fn, col, literal } from "sequelize";
import dashboardCache from "../utils/cache.js";


/**
 * Dashboard Controller - PRE-AGGREGATION VERSION
 * 
 * Reads from pre-computed summary tables.
 * Data is populated by: node scripts/aggregate-dashboard.js [year]
 * 
 * Response time: < 100ms (reading 20-50 rows instead of 500K)
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
 * Reads from pre-aggregated EarningsSummary table
 */
export const getEarningsSummary = async (req, res) => {
    try {
        const { year } = req.query;
        const currentYear = parseInt(year) || new Date().getFullYear();
        const previousYear = currentYear - 1;

        // Check cache first
        const cacheParams = { year: currentYear };
        const cached = dashboardCache.get('earnings', cacheParams);
        if (cached) {
            return res.json({ success: true, data: cached.data, meta: cached.meta, fromCache: true });
        }

        // Read from pre-aggregated summary table
        const summaries = await EarningsSummary.findAll({
            where: { year: currentYear },
            raw: true
        });

        if (summaries.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No pre-aggregated data for ${currentYear}. Run: node scripts/aggregate-dashboard.js ${currentYear}`
            });
        }

        // Transform flat rows to nested structure expected by frontend
        const summary = {
            byDepartment: {},
            byShareholder: { shareholder: { current: 0, previous: 0 }, nonShareholder: { current: 0, previous: 0 } },
            byGender: {},
            byEthnicity: {},
            byEmploymentType: { "Full-time": { current: 0, previous: 0 }, "Part-time": { current: 0, previous: 0 } },
            totals: { current: 0, previous: 0 },
        };

        let employeeCount = 0;

        for (const row of summaries) {
            employeeCount = row.employee_count || employeeCount;
            const value = {
                current: parseFloat(row.current_total) || 0,
                previous: parseFloat(row.previous_total) || 0
            };

            switch (row.group_type) {
                case 'total':
                    summary.totals = value;
                    break;
                case 'department':
                    summary.byDepartment[row.group_value] = value;
                    break;
                case 'shareholder':
                    summary.byShareholder[row.group_value] = value;
                    break;
                case 'gender':
                    summary.byGender[row.group_value] = value;
                    break;
                case 'ethnicity':
                    summary.byEthnicity[row.group_value] = value;
                    break;
                case 'employmentType':
                    summary.byEmploymentType[row.group_value] = value;
                    break;
            }
        }

        // Cache the small result
        const responseData = { data: summary, meta: { currentYear, previousYear, employeeCount } };
        dashboardCache.set('earnings', cacheParams, responseData);

        res.json({
            success: true,
            data: summary,
            meta: { currentYear, previousYear, employeeCount },
        });
    } catch (error) {
        console.error("getEarningsSummary error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/dashboard/vacation
 * Reads from pre-aggregated VacationSummary table
 */
export const getVacationSummary = async (req, res) => {
    try {
        const { year } = req.query;
        const currentYear = parseInt(year) || new Date().getFullYear();
        const previousYear = currentYear - 1;

        // Check cache first
        const cacheParams = { year: currentYear };
        const cached = dashboardCache.get('vacation', cacheParams);
        if (cached) {
            return res.json({ success: true, data: cached.data, meta: cached.meta, fromCache: true });
        }

        // Read from pre-aggregated summary table
        const summaries = await VacationSummary.findAll({
            where: { year: currentYear },
            raw: true
        });

        if (summaries.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No pre-aggregated data for ${currentYear}. Run: node scripts/aggregate-dashboard.js ${currentYear}`
            });
        }

        // Transform flat rows to nested structure
        const summary = {
            byDepartment: {},
            byShareholder: { shareholder: { current: 0, previous: 0 }, nonShareholder: { current: 0, previous: 0 } },
            byGender: {},
            byEthnicity: {},
            byEmploymentType: { "Full-time": { current: 0, previous: 0 }, "Part-time": { current: 0, previous: 0 } },
            totals: { current: 0, previous: 0 },
        };

        let employeeCount = 0;

        for (const row of summaries) {
            employeeCount = row.employee_count || employeeCount;
            const value = {
                current: parseInt(row.current_total) || 0,
                previous: parseInt(row.previous_total) || 0
            };

            switch (row.group_type) {
                case 'total':
                    summary.totals = value;
                    break;
                case 'department':
                    summary.byDepartment[row.group_value] = value;
                    break;
                case 'shareholder':
                    summary.byShareholder[row.group_value] = value;
                    break;
                case 'gender':
                    summary.byGender[row.group_value] = value;
                    break;
                case 'ethnicity':
                    summary.byEthnicity[row.group_value] = value;
                    break;
                case 'employmentType':
                    summary.byEmploymentType[row.group_value] = value;
                    break;
            }
        }

        // Cache the small result
        const responseData = { data: summary, meta: { currentYear, previousYear, employeeCount } };
        dashboardCache.set('vacation', cacheParams, responseData);

        res.json({
            success: true,
            data: summary,
            meta: { currentYear, previousYear, employeeCount },
        });
    } catch (error) {
        console.error("getVacationSummary error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/dashboard/benefits
 * Reads from pre-aggregated BenefitsSummary table
 */
export const getBenefitsSummary = async (req, res) => {
    try {
        // Check cache first
        const cacheParams = {};
        const cached = dashboardCache.get('benefits', cacheParams);
        if (cached) {
            return res.json({ success: true, data: cached.data, meta: cached.meta, fromCache: true });
        }

        // Read from pre-aggregated summary table
        const summaries = await BenefitsSummary.findAll({ raw: true });

        if (summaries.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No pre-aggregated benefits data. Run: node scripts/aggregate-dashboard.js"
            });
        }

        // Transform to expected format
        const summary = {
            byPlan: {},
            byShareholder: {
                shareholder: { totalPaid: 0, count: 0, average: 0 },
                nonShareholder: { totalPaid: 0, count: 0, average: 0 },
            },
        };

        let planCount = 0;
        const employeeCount = await Employee.countDocuments();

        for (const row of summaries) {
            const value = {
                totalPaid: parseFloat(row.total_paid) || 0,
                count: row.enrollment_count || 0,
                average: parseFloat(row.average_paid) || 0
            };

            if (row.plan_name === "_overall") {
                summary.byShareholder[row.shareholder_type] = value;
            } else {
                planCount++;
                if (!summary.byPlan[row.plan_name]) {
                    summary.byPlan[row.plan_name] = {
                        shareholder: { totalPaid: 0, count: 0, average: 0 },
                        nonShareholder: { totalPaid: 0, count: 0, average: 0 },
                    };
                }
                summary.byPlan[row.plan_name][row.shareholder_type] = value;
            }
        }

        // Cache the small result
        const responseData = { data: summary, meta: { planCount: planCount / 2, employeeCount } };
        dashboardCache.set('benefits', cacheParams, responseData);

        res.json({
            success: true,
            data: summary,
            meta: { planCount: planCount / 2, employeeCount },
        });
    } catch (error) {
        console.error("getBenefitsSummary error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/dashboard/drilldown
 * Returns detailed employee list based on filters (paginated)
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

        // Get payroll data for these employees (small batch, max 20)
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
