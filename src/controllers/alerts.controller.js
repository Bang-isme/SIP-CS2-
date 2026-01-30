import Alert from "../models/Alert.js";
import Employee from "../models/Employee.js";
import { EmployeeBenefit, AlertsSummary } from "../models/sql/index.js";
import { Op } from "sequelize";
import dashboardCache from "../utils/cache.js";

/**
 * Alerts Controller
 * Manage alert configurations and check triggered alerts
 */

/**
 * GET /api/alerts
 * Get all alert configurations
 */
export const getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find().populate("createdBy", "username email");
        res.json({ success: true, data: alerts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/alerts
 * Create a new alert configuration
 */
export const createAlert = async (req, res) => {
    try {
        const { name, type, threshold, description } = req.body;

        const alert = new Alert({
            name,
            type,
            threshold,
            description,
            createdBy: req.userId, // From auth middleware
            isActive: true,
        });

        await alert.save();
        res.status(201).json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/alerts/:id
 * Update an alert configuration
 */
export const updateAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const alert = await Alert.findByIdAndUpdate(id, updates, { new: true });
        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found" });
        }

        res.json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/alerts/:id
 * Delete an alert configuration
 */
export const deleteAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const alert = await Alert.findByIdAndDelete(id);

        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found" });
        }

        res.json({ success: true, message: "Alert deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/alerts/:type/employees
 * Get paginated employees for a specific alert type
 * Query params: page (default 1), limit (default 100), search (optional)
 * 
 * READS FROM AlertEmployee TABLE FOR FULL PAGINATION SUPPORT
 */
export const getAlertEmployees = async (req, res) => {
    try {
        const { type } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 100, 10000); // Max 10000
        const search = (req.query.search || '').trim();
        const offset = (page - 1) * limit;

        // Import AlertEmployee model
        const { AlertEmployee } = await import("../models/sql/index.js");

        // Build where clause
        const whereClause = { alert_type: type };
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { employee_id: { [Op.like]: `%${search}%` } }
            ];
        }

        // Get total count
        const total = await AlertEmployee.count({ where: whereClause });

        if (total === 0) {
            // Check if summary exists (maybe need to run aggregate)
            const summary = await AlertsSummary.findOne({
                where: { alert_type: type },
                raw: true
            });

            return res.json({
                success: true,
                employees: [],
                total: 0,
                fullTotal: summary?.employee_count || 0,
                page,
                limit,
                totalPages: 0,
                message: summary ? "No matching employees found." : `No data. Run: node scripts/aggregate-dashboard.js`
            });
        }

        // Get paginated employees
        const employees = await AlertEmployee.findAll({
            where: whereClause,
            order: [['days_until', 'ASC'], ['name', 'ASC']],
            offset,
            limit,
            raw: true
        });

        // Transform to expected format
        const formattedEmployees = employees.map(emp => {
            const isVacation = type === 'vacation';
            return {
                employeeId: emp.employee_id,
                name: emp.name,
                // Avoid redundant data: send 'daysUntil' only for non-vacation types (Anniversary/Birthday)
                daysUntil: isVacation ? undefined : emp.days_until,
                vacationDays: isVacation ? emp.days_until : undefined,
                extraData: emp.extra_data
            };
        });

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            employees: formattedEmployees,
            total,
            page,
            limit,
            totalPages
        });

    } catch (error) {
        console.error('getAlertEmployees error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


export const getTriggeredAlerts = async (req, res) => {
    try {
        // Check cache first
        const cacheParams = { date: new Date().toISOString().split('T')[0] };
        const cached = dashboardCache.get('alerts', cacheParams);
        if (cached) {
            return res.json({ success: true, data: cached.data, meta: cached.meta, fromCache: true });
        }

        // Read from pre-aggregated summary table
        let summaries = await AlertsSummary.findAll({ raw: true });

        // Deduplicate summaries by alert_type (fix for potential duplicate aggregation rows)
        const summaryMap = new Map();
        summaries.forEach(row => {
            summaryMap.set(row.alert_type, row);
        });
        summaries = Array.from(summaryMap.values());

        if (summaries.length === 0) {
            // No pre-aggregated data - check if alerts exist
            const alertCount = await Alert.countDocuments({ isActive: true });
            if (alertCount > 0) {
                return res.status(404).json({
                    success: false,
                    message: "No pre-aggregated alerts data. Run: node scripts/aggregate-dashboard.js"
                });
            }
            // No alerts configured
            return res.json({
                success: true,
                data: [],
                meta: { totalAlerts: 0, triggeredCount: 0 }
            });
        }

        // Get alert configurations for names
        const activeAlerts = await Alert.find({ isActive: true }).lean();
        const alertMap = new Map(activeAlerts.map(a => [a.type, a]));

        // Import AlertEmployee for preview data
        const { AlertEmployee } = await import("../models/sql/index.js");

        // Transform summaries to expected format - fetch preview employees
        const triggeredAlerts = await Promise.all(summaries.map(async (row) => {
            const alertConfig = alertMap.get(row.alert_type);

            // Fetch first 5 employees for preview display on cards
            const previewEmployees = await AlertEmployee.findAll({
                where: { alert_type: row.alert_type },
                order: [['days_until', 'ASC'], ['name', 'ASC']],
                limit: 5,
                raw: true
            });

            // Format preview employees for frontend
            const matchingEmployees = previewEmployees.map(emp => {
                const isVacation = row.alert_type === 'vacation';
                const isBenefits = row.alert_type === 'benefits_change';
                return {
                    employeeId: emp.employee_id,
                    name: emp.name,
                    // Only send daysUntil if NOT vacation (generic date alerts)
                    daysUntil: isVacation ? undefined : emp.days_until,
                    // Only send vacationDays if IS vacation
                    vacationDays: isVacation ? emp.days_until : undefined,
                    // Send extraData for benefits_change
                    extraData: isBenefits ? emp.extra_data : undefined,
                };
            });

            return {
                alert: {
                    _id: alertConfig?._id,
                    name: alertConfig?.name || row.alert_type,
                    type: row.alert_type,
                    threshold: row.threshold,
                },
                matchingEmployees: matchingEmployees,
                count: row.employee_count,
            };
        }));

        // Cache the result
        const responseData = {
            data: triggeredAlerts,
            meta: { totalAlerts: activeAlerts.length, triggeredCount: triggeredAlerts.length }
        };
        dashboardCache.set('alerts', cacheParams, responseData);

        res.json({
            success: true,
            data: triggeredAlerts,
            meta: { totalAlerts: activeAlerts.length, triggeredCount: triggeredAlerts.length },
        });
    } catch (error) {
        console.error("getTriggeredAlerts error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
