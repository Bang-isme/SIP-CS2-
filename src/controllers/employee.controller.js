import Employee from "../models/Employee.js";
import { syncEmployeeToPayroll } from "../services/syncService.js";
import { enqueueIntegrationEvent } from "../services/integrationEventService.js";
import { OUTBOX_ENABLED } from "../config.js";
import logger from "../utils/logger.js";
import { buildRequestLogData, getRequestId } from "../utils/requestTracking.js";
import {
    createBadRequestError,
    createConflictError,
    createNotFoundError,
    respondWithApiError,
    sendApiError,
} from "../utils/apiErrors.js";
import {
    buildEmployeeMeta,
    EmployeeContractError,
    isMongoObjectId,
    normalizeEmployeeListQuery,
    normalizeEmployeeLookupParam,
    sendEmployeeContractError,
} from "../utils/employeeContracts.js";

const buildEmployeePayload = (employee) => ({
    ...employee.toObject(),
    _id: employee._id?.toString(),
});

const handleEmployeeMutationError = (req, res, error) => {
    if (error?.name === "ValidationError") {
        return sendApiError(
            res,
            createBadRequestError(error.message, "EMPLOYEE_VALIDATION_FAILED"),
        );
    }

    if (error?.code === 11000) {
        return sendApiError(
            res,
            createConflictError(
                "Employee with the same employeeId already exists",
                "EMPLOYEE_DUPLICATE_ID",
            ),
        );
    }

    return sendApiError(res, error, { defaultCode: "EMPLOYEE_MUTATION_FAILED" });
};

const logUnexpectedEmployeeMutationError = (label, error, { req = null, res = null, actorId = null, extra = {} } = {}) => {
    const isExpected = error?.name === "ValidationError" || error?.code === 11000;
    if (!isExpected) {
        logger.error("EmployeeController", label, error, buildRequestLogData({ req, res, actorId, ...extra }));
    }
};

const buildQueuedSyncState = ({ correlationId = null } = {}) => ({
    status: "QUEUED",
    mode: "OUTBOX",
    consistency: "EVENTUAL",
    requiresAttention: false,
    message: "Source record saved; integration event queued for async sync",
    correlationId,
});

const buildDirectSyncState = ({
    syncResult,
    mode,
    fallbackWarning = null,
    correlationId = null,
}) => {
    const success = Boolean(syncResult?.success);
    const baseMessage = success
        ? "Synced to downstream integrations"
        : "Source record saved, but one or more downstream syncs failed";

    return {
        status: success ? "SUCCESS" : "FAILED",
        mode,
        consistency: success ? "EVENTUAL" : "AT_RISK",
        requiresAttention: !success || Boolean(fallbackWarning),
        message: fallbackWarning ? `${baseMessage}. ${fallbackWarning}` : baseMessage,
        warning: fallbackWarning || null,
        results: syncResult?.results || [],
        correlationId: syncResult?.correlationId || correlationId,
    };
};

const dispatchEmployeeMutation = async ({
    action,
    employee,
    directPayload,
    outboxPayload,
    correlationId = null,
}) => {
    if (!OUTBOX_ENABLED) {
        const syncResult = await syncEmployeeToPayroll(
            employee.employeeId,
            action,
            directPayload,
            {
                correlationId,
                source: "EMPLOYEE_CONTROLLER_DIRECT",
            },
        );
        return buildDirectSyncState({
            syncResult,
            mode: "DIRECT",
            correlationId,
        });
    }

    try {
        await enqueueIntegrationEvent({
            entityType: "employee",
            entityId: employee.employeeId,
            action,
            payload: outboxPayload,
            correlationId,
        });

        return buildQueuedSyncState({ correlationId });
    } catch (enqueueError) {
        logger.warn("EmployeeController", "Outbox enqueue failed; falling back to direct sync", {
            employeeId: employee.employeeId,
            action,
            correlationId,
            mode: "DIRECT_FALLBACK",
            warning: enqueueError.message,
        });

        try {
            const syncResult = await syncEmployeeToPayroll(
                employee.employeeId,
                action,
                directPayload,
                {
                    correlationId,
                    source: "EMPLOYEE_CONTROLLER_FALLBACK",
                },
            );
            return buildDirectSyncState({
                syncResult,
                mode: "DIRECT_FALLBACK",
                fallbackWarning: `Outbox enqueue failed: ${enqueueError.message}`,
                correlationId,
            });
        } catch (syncError) {
            logger.error(
                "EmployeeController",
                "Outbox enqueue and direct fallback both failed",
                syncError,
                {
                    employeeId: employee.employeeId,
                    action,
                    correlationId,
                    enqueueError: enqueueError.message,
                    mode: "DIRECT_FALLBACK",
                },
            );
            return {
                status: "FAILED",
                mode: "DIRECT_FALLBACK",
                consistency: "AT_RISK",
                requiresAttention: true,
                message: "Source record saved, but downstream sync dispatch failed after outbox fallback",
                warning: `Outbox enqueue failed: ${enqueueError.message}. Direct sync failed: ${syncError.message}`,
                results: [],
                correlationId,
            };
        }
    }
};

/**
 * Create Employee - Case Study 3: Data Consistency
 * 
 * 1. Creates employee in HR system (MongoDB)
 * 2. Syncs to Payroll system (MySQL) via syncService
 */
export const createEmployee = async (req, res) => {
    try {
        const correlationId = getRequestId({ req });
        const { employeeId, firstName, lastName, vacationDays, paidToDate, paidLastYear, payRate, payRateId,
            gender, ethnicity, employmentType, isShareholder, departmentId, hireDate, birthDate } = req.body;

        // Step 1: Create in MongoDB (HR System)
        const employee = new Employee({
            employeeId,
            firstName,
            lastName,
            gender,
            ethnicity,
            employmentType,
            isShareholder,
            departmentId,
            hireDate,
            birthDate,
            vacationDays,
            paidToDate,
            paidLastYear,
            payRate,
            payRateId
        });

        const savedEmployee = await employee.save();
        const payload = buildEmployeePayload(savedEmployee);
        const sync = await dispatchEmployeeMutation({
            action: "CREATE",
            employee: savedEmployee,
            directPayload: payload,
            outboxPayload: payload,
            correlationId,
        });

        // Return success with sync status
        return res.status(201).json({
            success: true,
            data: {
                _id: savedEmployee._id,
                employeeId: savedEmployee.employeeId,
                firstName: savedEmployee.firstName,
                lastName: savedEmployee.lastName,
                gender: savedEmployee.gender,
                employmentType: savedEmployee.employmentType,
                isShareholder: savedEmployee.isShareholder,
            },
            sync,
        });
    } catch (error) {
        logUnexpectedEmployeeMutationError("createEmployee error", error, {
            req,
            res,
            extra: { employeeId: req.body?.employeeId, action: "CREATE" },
        });
        return handleEmployeeMutationError(req, res, error);
    }
};

/**
 * Update Employee - Case Study 3: Data Consistency
 */
export const updateEmployee = async (req, res) => {
    try {
        const correlationId = getRequestId({ req });
        const { id } = req.params;
        const updateData = req.body;

        // Step 1: Update in MongoDB
        const employee = await Employee.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
            context: "query",
        });

        if (!employee) {
            return sendApiError(res, createNotFoundError("Employee not found", "EMPLOYEE_NOT_FOUND"));
        }

        const payload = buildEmployeePayload(employee);
        const sync = await dispatchEmployeeMutation({
            action: "UPDATE",
            employee,
            directPayload: payload,
            outboxPayload: payload,
            correlationId,
        });

        return res.json({
            success: true,
            data: employee,
            sync,
        });
    } catch (error) {
        logUnexpectedEmployeeMutationError("updateEmployee error", error, {
            req,
            res,
            extra: { targetId: req.params?.id, action: "UPDATE" },
        });
        return handleEmployeeMutationError(req, res, error);
    }
};

/**
 * Delete Employee - Case Study 3: Data Consistency
 */
export const deleteEmployee = async (req, res) => {
    try {
        const correlationId = getRequestId({ req });
        const { id } = req.params;

        const employee = await Employee.findByIdAndDelete(id);

        if (!employee) {
            return sendApiError(res, createNotFoundError("Employee not found", "EMPLOYEE_NOT_FOUND"));
        }

        const sync = await dispatchEmployeeMutation({
            action: "DELETE",
            employee,
            directPayload: { employeeId: employee.employeeId },
            outboxPayload: { employeeId: employee.employeeId },
            correlationId,
        });

        return res.json({
            success: true,
            message: "Employee deleted from source system",
            sync,
        });
    } catch (error) {
        logUnexpectedEmployeeMutationError("deleteEmployee error", error, {
            req,
            res,
            extra: { targetId: req.params?.id, action: "DELETE" },
        });
        return handleEmployeeMutationError(req, res, error);
    }
};

export const getEmployee = async (req, res) => {
    try {
        const employeeLookup = normalizeEmployeeLookupParam(req.params.employeeId);
        let employee = await Employee.findOne({ employeeId: employeeLookup });
        let lookupMode = "employeeId";

        if (!employee && isMongoObjectId(employeeLookup)) {
            employee = await Employee.findById(employeeLookup);
            if (employee) {
                lookupMode = "mongoIdFallback";
            }
        }

        if (!employee) {
            return sendApiError(res, createNotFoundError("Employee not found", "EMPLOYEE_NOT_FOUND"));
        }

        return res.json({
            success: true,
            data: employee,
            meta: buildEmployeeMeta({
                dataset: "employeeDetail",
                filters: {
                    employeeId: employeeLookup,
                    lookupMode,
                },
            }),
        });
    } catch (error) {
        if (error instanceof EmployeeContractError) {
            return sendEmployeeContractError(res, error);
        }
        return respondWithApiError({
            req,
            res,
            error,
            context: "EmployeeController",
            defaultCode: "EMPLOYEE_DETAIL_LOOKUP_FAILED",
        });
    }
};

export const getEmployees = async (req, res) => {
    try {
        const { page, limit, skip } = normalizeEmployeeListQuery(req.query);

        const employees = await Employee.find().skip(skip).limit(limit);
        const total = await Employee.countDocuments();
        const totalPages = Math.ceil(total / limit);

        return res.json({
            success: true,
            data: employees,
            pagination: {
                total,
                page,
                limit,
                pages: totalPages,
            },
            meta: buildEmployeeMeta({
                dataset: "employees",
                total,
                page,
                limit,
                totalPages,
                filters: {},
            }),
        });
    } catch (error) {
        if (error instanceof EmployeeContractError) {
            return sendEmployeeContractError(res, error);
        }
        return respondWithApiError({
            req,
            res,
            error,
            context: "EmployeeController",
            defaultCode: "EMPLOYEE_LIST_FAILED",
        });
    }
};
