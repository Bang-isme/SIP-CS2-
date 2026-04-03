import Alert from "../models/Alert.js";
import { AlertsSummary } from "../models/sql/index.js";
import { Op } from "sequelize";
import dashboardCache from "../utils/cache.js";
import { refreshAlertAggregates } from "../services/alertAggregationService.js";
import {
    buildAlertAcknowledgement,
    buildLatestAlertSummaryMap,
} from "../utils/alertDashboard.js";
import {
    buildAlertEmployeesResponse,
    buildDashboardMeta,
    DashboardContractError,
    escapeLikePattern,
    normalizeAlertConfigPayload,
    normalizeAlertEmployeesQuery,
    normalizeMongoIdParam,
    sendContractError,
} from "../utils/dashboardContracts.js";
import {
    createBadRequestError,
    createConflictError,
    createNotFoundError,
    respondWithApiError,
    sendApiError,
} from "../utils/apiErrors.js";
import { buildRequestLogData } from "../utils/requestTracking.js";

const buildAlertMutationMeta = async () => {
    try {
        const result = await refreshAlertAggregates();
        dashboardCache.clear();
        return {
            alertSummariesRefreshed: true,
            result,
        };
    } catch (refreshError) {
        dashboardCache.clear();
        return {
            alertSummariesRefreshed: false,
            warning: `Alert configuration saved, but summary refresh failed: ${refreshError.message}`,
        };
    }
};

const handleAlertMutationError = (req, res, error) => {
    if (error?.code === "DUPLICATE_ACTIVE_TYPE") {
        return sendApiError(res, createConflictError(
            error.message,
            "ALERT_DUPLICATE_ACTIVE_TYPE",
        ));
    }
    if (error?.name === "ValidationError") {
        return sendApiError(res, createBadRequestError(
            error.message,
            "ALERT_MODEL_VALIDATION_FAILED",
        ));
    }
    return respondWithApiError({
        req,
        res,
        error,
        context: "AlertsController",
        defaultCode: "ALERT_UNEXPECTED_ERROR",
    });
};

const pickAlertConfigUpdates = (payload = {}) => {
    const allowedFields = ["name", "type", "threshold", "description", "isActive"];
    return allowedFields.reduce((acc, field) => {
        if (Object.prototype.hasOwnProperty.call(payload, field)) {
            acc[field] = payload[field];
        }
        return acc;
    }, {});
};

const findLatestAlertSummary = async (alertType) => {
    return AlertsSummary.findOne({
        where: { alert_type: alertType },
        order: [["computed_at", "DESC"]],
        raw: true,
    });
};

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
        const alerts = await Alert.find().populate("createdBy", "username email").populate("acknowledgedBy", "username email");
        res.json({ success: true, data: alerts });
    } catch (error) {
        return respondWithApiError({
            req,
            res,
            error,
            context: "AlertsController",
            defaultCode: "ALERT_LIST_FAILED",
        });
    }
};

/**
 * POST /api/alerts
 * Create a new alert configuration
 */
export const createAlert = async (req, res) => {
    try {
        const { name, type, threshold, description, isActive } = normalizeAlertConfigPayload(
            pickAlertConfigUpdates(req.body),
            { partial: false },
        );

        const alert = new Alert({
            name,
            type,
            threshold,
            description,
            createdBy: req.userId, // From auth middleware
            isActive: typeof isActive === "boolean" ? isActive : true,
        });

        await alert.save();
        const meta = await buildAlertMutationMeta();
        res.status(201).json({ success: true, data: alert, meta });
    } catch (error) {
        if (error instanceof DashboardContractError) {
            return sendContractError(res, error);
        }
        return handleAlertMutationError(req, res, error);
    }
};

/**
 * PUT /api/alerts/:id
 * Update an alert configuration
 */
export const updateAlert = async (req, res) => {
    try {
        const id = normalizeMongoIdParam(req.params.id);
        const rawUpdates = pickAlertConfigUpdates(req.body);
        const existingAlert = await Alert.findById(id);

        if (!existingAlert) {
            return sendApiError(res, createNotFoundError("Alert not found", "ALERT_NOT_FOUND"));
        }

        const mergedAlertState = normalizeAlertConfigPayload({
            name: Object.prototype.hasOwnProperty.call(rawUpdates, "name")
                ? rawUpdates.name
                : existingAlert.name,
            type: Object.prototype.hasOwnProperty.call(rawUpdates, "type")
                ? rawUpdates.type
                : existingAlert.type,
            threshold: Object.prototype.hasOwnProperty.call(rawUpdates, "threshold")
                ? rawUpdates.threshold
                : existingAlert.threshold,
            description: Object.prototype.hasOwnProperty.call(rawUpdates, "description")
                ? rawUpdates.description
                : existingAlert.description,
            isActive: Object.prototype.hasOwnProperty.call(rawUpdates, "isActive")
                ? rawUpdates.isActive
                : existingAlert.isActive,
        }, {
            partial: false,
        });

        const updates = Object.keys(rawUpdates).reduce((acc, field) => {
            if (Object.prototype.hasOwnProperty.call(mergedAlertState, field)) {
                acc[field] = mergedAlertState[field];
            }
            return acc;
        }, {});

        const alert = await Alert.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
            context: "query",
        });

        const meta = await buildAlertMutationMeta();
        res.json({ success: true, data: alert, meta });
    } catch (error) {
        if (error instanceof DashboardContractError) {
            return sendContractError(res, error);
        }
        return handleAlertMutationError(req, res, error);
    }
};

/**
 * POST /api/alerts/:id/acknowledge
 * Mark an active alert queue as owned/reviewed by a manager.
 */
export const acknowledgeAlert = async (req, res) => {
    try {
        const id = normalizeMongoIdParam(req.params.id);
        const note = String(req.body?.note || "").trim();

        if (note.length < 4) {
            return sendApiError(
                res,
                createBadRequestError(
                    "Acknowledgement note must be at least 4 characters.",
                    "ALERT_ACKNOWLEDGEMENT_NOTE_INVALID",
                ),
            );
        }

        const alert = await Alert.findById(id);
        if (!alert) {
            return sendApiError(res, createNotFoundError("Alert not found", "ALERT_NOT_FOUND"));
        }

        if (!alert.isActive) {
            return sendApiError(
                res,
                createConflictError(
                    "Inactive alerts cannot be acknowledged.",
                    "ALERT_INACTIVE_CANNOT_BE_ACKNOWLEDGED",
                ),
            );
        }

        const summaryRow = await findLatestAlertSummary(alert.type);
        if (!summaryRow) {
            return sendApiError(
                res,
                createConflictError(
                    "No current alert snapshot available. Refresh aggregates first.",
                    "ALERT_SUMMARY_NOT_READY",
                ),
            );
        }

        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = req.userId;
        alert.acknowledgementNote = note;
        alert.acknowledgedCount = Number(summaryRow.employee_count || 0);
        alert.acknowledgedSummaryAt = summaryRow.computed_at || new Date();

        await alert.save();
        dashboardCache.clear();

        const acknowledgedAlert = await Alert.findById(id)
            .populate("acknowledgedBy", "username email")
            .lean();

        return res.json({
            success: true,
            data: {
                alertId: id,
                acknowledgement: buildAlertAcknowledgement({
                    alertConfig: acknowledgedAlert,
                    summaryRow,
                }),
            },
        });
    } catch (error) {
        if (error instanceof DashboardContractError) {
            return sendContractError(res, error);
        }
        return handleAlertMutationError(req, res, error);
    }
};

/**
 * DELETE /api/alerts/:id
 * Delete an alert configuration
 */
export const deleteAlert = async (req, res) => {
    try {
        const id = normalizeMongoIdParam(req.params.id);
        const alert = await Alert.findByIdAndDelete(id);

        if (!alert) {
            return sendApiError(res, createNotFoundError("Alert not found", "ALERT_NOT_FOUND"));
        }

        const meta = await buildAlertMutationMeta();
        res.json({ success: true, message: "Alert deleted", meta });
    } catch (error) {
        if (error instanceof DashboardContractError) {
            return sendContractError(res, error);
        }
        return respondWithApiError({
            req,
            res,
            error,
            context: "AlertsController",
            defaultCode: "ALERT_DELETE_FAILED",
        });
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
        const {
            type,
            pageNum,
            limitNum,
            search,
            offset,
        } = normalizeAlertEmployeesQuery(req.params, req.query);
        const escapedSearch = escapeLikePattern(search);

        // Import AlertEmployee model
        const { AlertEmployee } = await import("../models/sql/index.js");

        // Build where clause
        const whereClause = { alert_type: type };
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${escapedSearch}%` } },
                { employee_id: { [Op.like]: `%${escapedSearch}%` } }
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

            return res.json(buildAlertEmployeesResponse({
                alertType: type,
                employees: [],
                total: 0,
                fullTotal: summary?.employee_count || 0,
                page: pageNum,
                limit: limitNum,
                search,
                message: summary ? "No matching employees found." : "No data. Run: node scripts/aggregate-dashboard.js",
            }));
        }

        // Get paginated employees
        const employees = await AlertEmployee.findAll({
            where: whereClause,
            order: [['days_until', 'ASC'], ['name', 'ASC'], ['employee_id', 'ASC']],
            offset,
            limit: limitNum,
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

        res.json(buildAlertEmployeesResponse({
            alertType: type,
            employees: formattedEmployees,
            total,
            page: pageNum,
            limit: limitNum,
            search,
        }));

    } catch (error) {
        if (error instanceof DashboardContractError) {
            return sendContractError(res, error);
        }
        return respondWithApiError({
            req,
            res,
            error,
            context: "AlertsController",
            defaultCode: "ALERT_EMPLOYEES_LOOKUP_FAILED",
            extraLogData: buildRequestLogData({ req, res }),
        });
    }
};


export const getTriggeredAlerts = async (req, res) => {
    try {
        const activeAlerts = await Alert.find({ isActive: true }).populate("acknowledgedBy", "username email").lean();
        if (activeAlerts.length === 0) {
            return res.json({
                success: true,
                data: [],
                meta: buildDashboardMeta({
                    dataset: "alerts",
                    totalAlerts: 0,
                    triggeredCount: 0,
                    activeTypes: [],
                }),
            });
        }

        // Check cache first
        const cacheParams = { date: new Date().toISOString().split('T')[0] };
        const cached = dashboardCache.get('alerts', cacheParams);
        if (cached) {
            return res.json({ success: true, data: cached.data, meta: cached.meta, fromCache: true });
        }

        // Read from pre-aggregated summary table
        let summaries = await AlertsSummary.findAll({ raw: true });

        // Deduplicate summaries by alert_type using the latest computed_at row.
        const summaryMap = buildLatestAlertSummaryMap(summaries);
        summaries = Array.from(summaryMap.values());

        const activeAlertMap = new Map(activeAlerts.map((alert) => [alert.type, alert]));
        summaries = summaries.filter((row) => activeAlertMap.has(row.alert_type));

        if (summaries.length === 0) {
            return res.json({
                success: true,
                data: [],
                meta: buildDashboardMeta({
                    dataset: "alerts",
                    totalAlerts: activeAlerts.length,
                    triggeredCount: 0,
                    activeTypes: activeAlerts.map((alert) => alert.type),
                }),
            });
        }

        // Import AlertEmployee for preview data
        const { AlertEmployee } = await import("../models/sql/index.js");

        // Transform summaries to expected format - fetch preview employees
        const triggeredAlerts = await Promise.all(summaries.map(async (row) => {
            const alertConfig = activeAlertMap.get(row.alert_type);

            // Fetch first 5 employees for preview display on cards
            const previewEmployees = await AlertEmployee.findAll({
                where: { alert_type: row.alert_type },
                order: [['days_until', 'ASC'], ['name', 'ASC'], ['employee_id', 'ASC']],
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
                    // Send extraData for benefits_change OR birthday (to show date)
                    extraData: (isBenefits || row.alert_type === 'birthday') ? emp.extra_data : undefined,
                };
            });

            return {
                alert: {
                    _id: alertConfig?._id,
                    name: alertConfig?.name || row.alert_type,
                    type: row.alert_type,
                    threshold: row.threshold,
                    acknowledgement: buildAlertAcknowledgement({
                        alertConfig,
                        summaryRow: row,
                    }),
                },
                matchingEmployees: matchingEmployees,
                count: row.employee_count,
            };
        }));

        // Cache the result
        const responseData = {
            data: triggeredAlerts,
            meta: buildDashboardMeta({
                dataset: "alerts",
                totalAlerts: activeAlerts.length,
                triggeredCount: triggeredAlerts.length,
                activeTypes: activeAlerts.map((alert) => alert.type),
            }),
        };
        dashboardCache.set('alerts', cacheParams, responseData);

        res.json({
            success: true,
            data: triggeredAlerts,
            meta: buildDashboardMeta({
                dataset: "alerts",
                totalAlerts: activeAlerts.length,
                triggeredCount: triggeredAlerts.length,
                activeTypes: activeAlerts.map((alert) => alert.type),
            }),
        });
    } catch (error) {
        return respondWithApiError({
            req,
            res,
            error,
            context: "AlertsController",
            defaultCode: "ALERT_TRIGGER_LOOKUP_FAILED",
            extraLogData: buildRequestLogData({ req, res, actorId: req.userId }),
        });
    }
};
