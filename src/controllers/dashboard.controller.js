import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import { Earning, VacationRecord, BenefitPlan, EmployeeBenefit, EarningsSummary, EarningsEmployeeYear, VacationSummary, BenefitsSummary } from "../models/sql/index.js";
import { Op, fn, col } from "sequelize";
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
        const currentYear = new Date().getFullYear();
        const earningsYear = parseInt(req.query.year) || currentYear;
        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(parseInt(limit) || 20, 10000);
        const bulkMode = req.query.bulk === "1" || limitNum >= 1000;
        const summaryMode = req.query.summary || (bulkMode ? "fast" : "full");

        const query = {};
        const applyEmployeeIdFilter = (ids) => {
            if (!Array.isArray(ids) || ids.length === 0) return false;
            if (!query.employeeId) {
                query.employeeId = { $in: ids };
                return true;
            }
            if (query.employeeId?.$in) {
                const idSet = new Set(query.employeeId.$in);
                const intersection = ids.filter(id => idSet.has(id));
                query.employeeId = { $in: intersection };
                return intersection.length > 0;
            }
            // Fallback: if query.employeeId is a direct value, keep it
            return true;
        };
        if (department) {
            // Check if input is ObjectId or Name
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(department);
            if (isObjectId) {
                query.departmentId = department;
            } else {
                // Look up by name
                const deptDoc = await Department.findOne({ name: department });
                if (deptDoc) {
                    query.departmentId = deptDoc._id;
                } else {
                    return res.json({
                        success: true,
                        data: [],
                        meta: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
                    });
                }
            }
        }

        if (req.query.benefitPlan) {
            const plan = await BenefitPlan.findOne({ where: { name: req.query.benefitPlan } });
            if (plan) {
                const enrollments = await EmployeeBenefit.findAll({
                    where: { plan_id: plan.id },
                    attributes: ['employee_id'],
                    raw: true
                });
                const empIds = enrollments.map(e => e.employee_id);
                // Filter by employeeId (assuming sync uses logical ID)
                const ok = applyEmployeeIdFilter(empIds);
                if (!ok) {
                    return res.json({
                        success: true,
                        data: [],
                        meta: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
                    });
                }
            } else {
                // Plan not found -> return empty
                return res.json({
                    success: true,
                    data: [],
                    meta: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
                });
            }
        }



        if (req.query.search) {
            const searchTerm = req.query.search.trim();
            if (searchTerm) {
                const searchRegex = new RegExp(searchTerm, 'i');
                query.$or = [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { employeeId: searchRegex },
                    // Allow searching "First Last" space separated
                    ...(searchTerm.includes(' ') ? [] : [])
                ];
                // If search term has space, simple split logic or just rely on individual regex (simpler for now)
                // But let's handle full name search properly if needed.
                // For now, simpler regex is robust enough for "Amy", "A01", etc.
            }
        }

        if (gender) query.gender = gender;
        if (ethnicity) query.ethnicity = ethnicity;
        if (employmentType) query.employmentType = employmentType;
        if (isShareholder !== undefined) query.isShareholder = isShareholder === "true";

        // CEO Query: "Employees earning over $X" - Mongo filter using annualEarnings snapshot
        const minEarnings = parseFloat(req.query.minEarnings);
        const hasMinEarnings = Number.isFinite(minEarnings) && minEarnings > 0;

        if (hasMinEarnings) {
            const snapshotCount = await Employee.countDocuments({ annualEarningsYear: earningsYear });
            if (snapshotCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No earnings snapshot for ${earningsYear}. Run: node scripts/aggregate-dashboard.js ${earningsYear}`
                });
            }

            query.annualEarningsYear = earningsYear;
            query.annualEarnings = { $gte: minEarnings };
        }

        const skip = (pageNum - 1) * limitNum;
        let employeeQuery = Employee.find(query);
        if (bulkMode) {
            employeeQuery = employeeQuery.select("employeeId firstName lastName departmentId gender ethnicity employmentType isShareholder vacationDays annualEarnings annualEarningsYear");
        } else {
            employeeQuery = employeeQuery.populate("departmentId");
        }

        const [employees, total] = await Promise.all([
            employeeQuery.skip(skip).limit(limitNum).lean(),
            Employee.countDocuments(query)
        ]);

        let departmentMap = null;
        if (bulkMode) {
            const depts = await Department.find().select("_id name").lean();
            departmentMap = new Map(depts.map(d => [d._id.toString(), d.name]));
        }

        // Get payroll data for these employees (small batch, max 20)
        const employeeIds = employees.map((e) => e.employeeId || e._id.toString());

        const earningsMap = new Map();
        const idsNeedingLookup = [];

        for (const emp of employees) {
            const id = emp.employeeId || emp._id.toString();
            const isSnapshotValid = emp.annualEarningsYear === earningsYear && Number.isFinite(emp.annualEarnings);
            if (isSnapshotValid) {
                earningsMap.set(id, emp.annualEarnings);
            } else {
                idsNeedingLookup.push(id);
            }
        }

        if (idsNeedingLookup.length > 0) {
            const earnings = await EarningsEmployeeYear.findAll({
                where: { year: earningsYear, employee_id: { [Op.in]: idsNeedingLookup } },
                attributes: ["employee_id", "total"],
                raw: true,
            });
            for (const row of earnings) {
                earningsMap.set(row.employee_id, parseFloat(row.total) || 0);
            }
        }

        // Fetch Benefit info if context is relevant
        let benefitMap = new Map();
        if (req.query.benefitPlan) {
            const plan = await BenefitPlan.findOne({ where: { name: req.query.benefitPlan } });
            if (plan) {
                const benefits = await EmployeeBenefit.findAll({
                    where: {
                        employee_id: { [Op.in]: employeeIds },
                        plan_id: plan.id
                    },
                    attributes: ["employee_id", "amount_paid"],
                    raw: true
                });
                benefitMap = new Map(benefits.map(b => [b.employee_id, parseFloat(b.amount_paid) || 0]));
            }
        }

        const getDepartmentName = (emp) => {
            if (bulkMode) {
                const deptId = emp.departmentId ? emp.departmentId.toString() : "";
                return departmentMap?.get(deptId) || "Unassigned";
            }
            return emp.departmentId?.name || "Unassigned";
        };

        let enrichedEmployees = employees.map((emp) => ({
            ...emp,
            department: getDepartmentName(emp),
            totalEarnings: earningsMap.get(emp.employeeId || emp._id.toString()) || 0,
            benefitCost: benefitMap.get(emp.employeeId || emp._id.toString()) || 0
        }));

        // Safety filter: ensure minEarnings constraint holds in the response
        if (hasMinEarnings) {
            enrichedEmployees = enrichedEmployees.filter(emp => emp.totalEarnings >= minEarnings);
        }

        // Calculate Summary Totals for the entire filtered set (not just paginated page)
        const hasShareholderFilter = isShareholder !== undefined && isShareholder !== '';
        const hasActiveFilter = Boolean(department || gender || ethnicity || employmentType || hasShareholderFilter || hasMinEarnings);
        const context = req.query.context || 'earnings';

        let summaryTotalEarnings = 0;
        let summaryTotalBenefits = 0;
        let summaryTotalVacation = 0;
        let summaryCount = total;
        let summarySource = "fast-count";
        let summaryCalculated = false;
        let summaryPartial = summaryMode === "fast";

        if (summaryMode !== "fast" && !hasActiveFilter) {
            // =====================================================
            // FAST PATH: Use Pre-aggregated data for "All" case
            // =====================================================
            const [earningsTotal, benefitsTotal, vacationTotal] = await Promise.all([
                EarningsSummary.findOne({
                    where: { year: currentYear, group_type: 'total', group_value: 'all' },
                    raw: true
                }),
                BenefitsSummary.findOne({
                    where: { plan_name: '_overall', shareholder_type: 'shareholder' },
                    raw: true
                }).then(async (sh) => {
                    const nonSh = await BenefitsSummary.findOne({
                        where: { plan_name: '_overall', shareholder_type: 'nonShareholder' },
                        raw: true
                    });
                    return {
                        total: (parseFloat(sh?.total_paid) || 0) + (parseFloat(nonSh?.total_paid) || 0)
                    };
                }),
                VacationSummary.findOne({
                    where: { year: currentYear, group_type: 'total', group_value: 'all' },
                    raw: true
                })
            ]);

            summaryTotalEarnings = parseFloat(earningsTotal?.current_total) || 0;
            summaryTotalBenefits = parseFloat(benefitsTotal?.total) || 0;
            summaryTotalVacation = parseInt(vacationTotal?.current_total) || 0;
            summaryCount = parseInt(earningsTotal?.employee_count) || total;
            summarySource = "pre-aggregated";
            summaryCalculated = false;
            summaryPartial = false;
        } else if (summaryMode !== "fast") {
            // =====================================================
            // FILTERED PATH
            // =====================================================
            const matchCount = total;
            summaryCount = matchCount;

            // Check if we can use pre-aggregated data for SINGLE dimension filter
            const activeFilters = [
                gender ? { type: 'gender', value: gender } : null,
                department ? { type: 'department', value: department } : null,
                ethnicity ? { type: 'ethnicity', value: ethnicity } : null,
                employmentType ? { type: 'employmentType', value: employmentType } : null,
                hasShareholderFilter ? { type: 'shareholder', value: isShareholder === 'true' ? 'shareholder' : 'nonShareholder' } : null
            ].filter(Boolean);

            // If SINGLE dimension filter, try pre-aggregated path
            if (activeFilters.length === 1 && !hasMinEarnings) {
                const filter = activeFilters[0];
                const [earningsAgg, vacationAgg] = await Promise.all([
                    EarningsSummary.findOne({
                        where: { year: currentYear, group_type: filter.type, group_value: filter.value },
                        raw: true
                    }),
                    VacationSummary.findOne({
                        where: { year: currentYear, group_type: filter.type, group_value: filter.value },
                        raw: true
                    })
                ]);

                if (earningsAgg) {
                    summaryTotalEarnings = parseFloat(earningsAgg.current_total) || 0;
                    summaryTotalVacation = parseInt(vacationAgg?.current_total) || 0;

                    // BenefitsSummary doesn't have gender/dept breakdown
                    // Only calculate Benefits if context requires it (not earnings, not vacation)
                    if (context === 'benefits' || !context) {
                        // Calculate benefits real-time using cursor (not skip/limit for performance)
                        const cursor = Employee.find(query).select("employeeId _id").lean().cursor();
                        let benefitsTotal = 0;
                        let batchIdsBuffer = [];

                        for await (const doc of cursor) {
                            batchIdsBuffer.push(doc.employeeId || doc._id.toString());

                            if (batchIdsBuffer.length >= 50000) {
                                const currentBatchIds = [...batchIdsBuffer];
                                batchIdsBuffer = [];
                                const batchBenefits = await EmployeeBenefit.findOne({
                                    where: { employee_id: { [Op.in]: currentBatchIds } },
                                    attributes: [[fn("SUM", col("amount_paid")), "total"]],
                                    raw: true
                                });
                                benefitsTotal += parseFloat(batchBenefits?.total) || 0;
                            }
                        }
                        // Process remaining
                        if (batchIdsBuffer.length > 0) {
                            const batchBenefits = await EmployeeBenefit.findOne({
                                where: { employee_id: { [Op.in]: batchIdsBuffer } },
                                attributes: [[fn("SUM", col("amount_paid")), "total"]],
                                raw: true
                            });
                            benefitsTotal += parseFloat(batchBenefits?.total) || 0;
                        }
                        summaryTotalBenefits = benefitsTotal;
                    }
                }
                summarySource = "pre-aggregated";
            }
            // Multi-dimension filter or minEarnings:
            // Use batched calculation for datasets up to 1,000,000 records
            // This prevents "0" totals while keeping memory usage safe (50k batches)
            else if (matchCount > 0 && matchCount <= 1000000) {
                // OPTIMIZED BATCH: Use Cursor + Parallel Processing
                // 1. Stream IDs from Mongo (no skip() penalty)
                // 2. Buffer into batches (50k)
                // 3. Fire-and-forget MySQL queries (Promise.all)

                const cursor = Employee.find(query).select("employeeId _id").lean().cursor();
                let batchIdsBuffer = [];
                const parallelPromises = [];

                for await (const doc of cursor) {
                    batchIdsBuffer.push(doc.employeeId || doc._id.toString());

                    if (batchIdsBuffer.length >= 50000) {
                        const currentBatchIds = [...batchIdsBuffer];
                        batchIdsBuffer = [];

                        const batchPromise = (async () => {
                            const subPromises = [];

                            // Earnings - Only needed for 'earnings' context or generic
                            if (context === 'earnings' || !context) {
                                subPromises.push(EarningsEmployeeYear.findOne({
                                    where: { year: earningsYear, employee_id: { [Op.in]: currentBatchIds } },
                                    attributes: [[fn("SUM", col("total")), "total"]],
                                    raw: true
                                }));
                            } else { subPromises.push(Promise.resolve({ total: 0 })); }

                            // Benefits - Only needed for 'benefits' context or generic
                            if (context === 'benefits' || !context) {
                                subPromises.push(EmployeeBenefit.findOne({
                                    where: { employee_id: { [Op.in]: currentBatchIds } },
                                    attributes: [[fn("SUM", col("amount_paid")), "total"]],
                                    raw: true
                                }));
                            } else { subPromises.push(Promise.resolve({ total: 0 })); }

                            // Vacation - Only needed for 'vacation' context or generic
                            if (context === 'vacation' || !context) {
                                subPromises.push(VacationRecord.findOne({
                                    where: { employee_id: { [Op.in]: currentBatchIds } },
                                    attributes: [[fn("SUM", col("days_taken")), "total"]],
                                    raw: true
                                }));
                            } else { subPromises.push(Promise.resolve({ total: 0 })); }

                            const [eRes, bRes, vRes] = await Promise.all(subPromises);
                            return {
                                earnings: parseFloat(eRes?.total) || 0,
                                benefits: parseFloat(bRes?.total) || 0,
                                vacation: parseInt(vRes?.total) || 0
                            };
                        })();
                        parallelPromises.push(batchPromise);
                    }
                }

                // Process remaining buffer
                if (batchIdsBuffer.length > 0) {
                    const currentBatchIds = [...batchIdsBuffer];
                    const batchPromise = (async () => {
                        const subPromises = [];
                        // Earnings - context-aware
                        if (context === 'earnings' || !context) { subPromises.push(EarningsEmployeeYear.findOne({ where: { year: earningsYear, employee_id: { [Op.in]: currentBatchIds } }, attributes: [[fn("SUM", col("total")), "total"]], raw: true })); } else { subPromises.push(Promise.resolve({ total: 0 })); }
                        // Benefits - context-aware
                        if (context === 'benefits' || !context) { subPromises.push(EmployeeBenefit.findOne({ where: { employee_id: { [Op.in]: currentBatchIds } }, attributes: [[fn("SUM", col("amount_paid")), "total"]], raw: true })); } else { subPromises.push(Promise.resolve({ total: 0 })); }
                        // Vacation - context-aware
                        if (context === 'vacation' || !context) { subPromises.push(VacationRecord.findOne({ where: { employee_id: { [Op.in]: currentBatchIds } }, attributes: [[fn("SUM", col("days_taken")), "total"]], raw: true })); } else { subPromises.push(Promise.resolve({ total: 0 })); }

                        const [eRes, bRes, vRes] = await Promise.all(subPromises);
                        return { earnings: parseFloat(eRes?.total) || 0, benefits: parseFloat(bRes?.total) || 0, vacation: parseInt(vRes?.total) || 0 };
                    })();
                    parallelPromises.push(batchPromise);
                }

                const results = await Promise.all(parallelPromises);
                summaryTotalEarnings = results.reduce((acc, c) => acc + c.earnings, 0);
                summaryTotalBenefits = results.reduce((acc, c) => acc + c.benefits, 0);
                summaryTotalVacation = results.reduce((acc, c) => acc + c.vacation, 0);
                summarySource = "realtime-batched";
            }
            // If > 1M, we admit defeat and show count only to avoid timeout
            else {
                // > 1M records: Just show count.
                // This is extremely rare for filtered queries.
            }
            if (summarySource === "fast-count") {
                summarySource = "realtime";
            }
            summaryCalculated = true;
            summaryPartial = false;
        }

        res.json({
            success: true,
            data: enrichedEmployees,
            meta: {
                total: total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
                minEarningsApplied: hasMinEarnings ? minEarnings : null
            },
            summary: {
                totalEarnings: summaryTotalEarnings,
                totalBenefits: summaryTotalBenefits,
                totalVacation: summaryTotalVacation,
                count: summaryCount,
                calculated: summaryCalculated,
                source: summarySource,
                partial: summaryPartial,
                mode: summaryMode
            }
        });
    } catch (error) {
        console.error("getDrilldown error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/dashboard/drilldown/export
 * Streams CSV export for current filters (no pagination)
 */
export const exportDrilldownCsv = async (req, res) => {
    try {
        const { department, gender, ethnicity, employmentType, isShareholder } = req.query;
        const currentYear = new Date().getFullYear();
        const earningsYear = parseInt(req.query.year) || currentYear;

        const query = {};

        if (department) {
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(department);
            if (isObjectId) {
                query.departmentId = department;
            } else {
                const deptDoc = await Department.findOne({ name: department });
                if (deptDoc) {
                    query.departmentId = deptDoc._id;
                } else {
                    return res.status(404).json({ success: false, message: "Department not found." });
                }
            }
        }

        if (req.query.search) {
            const searchTerm = req.query.search.trim();
            if (searchTerm) {
                const searchRegex = new RegExp(searchTerm, 'i');
                query.$or = [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { employeeId: searchRegex }
                ];
            }
        }

        if (gender) query.gender = gender;
        if (ethnicity) query.ethnicity = ethnicity;
        if (employmentType) query.employmentType = employmentType;
        if (isShareholder !== undefined) query.isShareholder = isShareholder === "true";

        const minEarnings = parseFloat(req.query.minEarnings);
        const hasMinEarnings = Number.isFinite(minEarnings) && minEarnings > 0;

        if (hasMinEarnings) {
            const snapshotCount = await Employee.countDocuments({ annualEarningsYear: earningsYear });
            if (snapshotCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No earnings snapshot for ${earningsYear}. Run: node scripts/aggregate-dashboard.js ${earningsYear}`
                });
            }
            query.annualEarningsYear = earningsYear;
            query.annualEarnings = { $gte: minEarnings };
        }

        const depts = await Department.find().select("_id name").lean();
        const deptMap = new Map(depts.map(d => [d._id.toString(), d.name]));

        const isVacation = req.query.context === 'vacation';
        const fileDate = new Date().toISOString().slice(0, 10);

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="drilldown_export_${fileDate}.csv"`);

        const headers = [
            "EmployeeID",
            "Name",
            "Department",
            "Gender",
            "Ethnicity",
            "Type",
            "Shareholder",
            isVacation ? "VacationDays" : "TotalEarnings"
        ];
        res.write(headers.join(",") + "\n");

        const cursor = Employee.find(query)
            .select("employeeId firstName lastName departmentId gender ethnicity employmentType isShareholder vacationDays annualEarnings annualEarningsYear")
            .lean()
            .cursor();

        const escapeCsv = (value) => {
            if (value === null || value === undefined) return "";
            const str = String(value);
            if (/[",\n]/.test(str)) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        for await (const emp of cursor) {
            const deptName = deptMap.get(emp.departmentId?.toString()) || "Unassigned";
            const isSnapshotValid = emp.annualEarningsYear === earningsYear && Number.isFinite(emp.annualEarnings);
            const totalEarnings = isSnapshotValid ? emp.annualEarnings : 0;
            const row = [
                escapeCsv(emp.employeeId || ""),
                escapeCsv(`${emp.firstName || ""} ${emp.lastName || ""}`.trim()),
                escapeCsv(deptName),
                escapeCsv(emp.gender || ""),
                escapeCsv(emp.ethnicity || ""),
                escapeCsv(emp.employmentType || ""),
                escapeCsv(emp.isShareholder ? "Yes" : "No"),
                escapeCsv(isVacation ? (emp.vacationDays || 0) : totalEarnings)
            ].join(",");

            if (!res.write(row + "\n")) {
                await new Promise((resolve) => res.once("drain", resolve));
            }
        }

        res.end();
    } catch (error) {
        console.error("exportDrilldownCsv error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/dashboard/departments
 * Returns list of all departments for filter dropdowns
 */
export const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 }).select("name");
        res.json({
            success: true,
            data: departments.map(d => d.name)
        });
    } catch (error) {
        console.error("getDepartments error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
