import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
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
    normalizeEmployeeMutationPayload,
    sendEmployeeContractError,
} from "../utils/employeeContracts.js";
import { buildEmployeeSearchQuery } from "../utils/employeeSearch.js";
import {
    peekNextEmployeeId,
    reserveNextEmployeeId,
} from "../services/employeeIdService.js";
import { buildEmployeeSyncEvidenceSnapshot } from "../services/employeeSyncEvidenceService.js";

const EMPLOYEE_GENDER_OPTIONS = ["Male", "Female", "Other"];
const EMPLOYEE_TYPE_OPTIONS = ["Full-time", "Part-time"];

const buildEmployeePayload = (employee) => ({
    ...employee.toObject(),
    _id: employee._id?.toString(),
});

const normalizeStoredDateValue = (value) => {
    if (!value) {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return value;
};

const assertUpdateTimelineConsistency = ({
    existingEmployee,
    updateData,
    sourcePayload = {},
}) => {
    const birthDateProvided = Object.prototype.hasOwnProperty.call(updateData, "birthDate");
    const hireDateProvided = Object.prototype.hasOwnProperty.call(updateData, "hireDate");

    if (!birthDateProvided && !hireDateProvided) {
        return;
    }

    const nextBirthDate = updateData.birthDate ?? normalizeStoredDateValue(existingEmployee?.birthDate);
    const nextHireDate = updateData.hireDate ?? normalizeStoredDateValue(existingEmployee?.hireDate);

    if (!nextBirthDate || !nextHireDate) {
        return;
    }

    if (new Date(nextBirthDate) < new Date(nextHireDate)) {
        return;
    }

    const message = "Birth date must be earlier than hire date.";
    throw new EmployeeContractError("Validation failed.", {
        errors: [
            {
                field: "birthDate",
                message,
                value: birthDateProvided ? sourcePayload.birthDate : nextBirthDate,
            },
            {
                field: "hireDate",
                message,
                value: hireDateProvided ? sourcePayload.hireDate : nextHireDate,
            },
        ],
    });
};

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
    message: "Queued",
    detail: "Saved in MongoDB. Payroll dispatch is queued.",
    correlationId,
});

const buildDirectSyncState = ({
    syncResult,
    mode,
    fallbackWarning = null,
    correlationId = null,
}) => {
    const success = Boolean(syncResult?.success);
    const detail = success
        ? "Payroll sync complete."
        : "Source saved. Review downstream sync.";

    return {
        status: success ? "SUCCESS" : "FAILED",
        mode,
        consistency: success ? "EVENTUAL" : "AT_RISK",
        requiresAttention: !success || Boolean(fallbackWarning),
        message: success ? "Synced" : "Sync failed",
        detail: fallbackWarning ? `${detail} ${fallbackWarning}` : detail,
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
                message: "Sync failed",
                detail: "Source saved. Payroll dispatch failed.",
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
 * 2. Queues an SA-owned outbox event in MongoDB
 * 3. Syncs to Payroll through worker dispatch or direct fallback
 */
export const createEmployee = async (req, res) => {
    try {
        const correlationId = getRequestId({ req });
        const sourcePayload = {
            ...(req.body || {}),
        };

        if (Object.prototype.hasOwnProperty.call(sourcePayload, "employeeId")) {
            throw new EmployeeContractError("Validation failed.", {
                errors: [
                    {
                        field: "employeeId",
                        message: "employeeId is server-generated on create.",
                        value: sourcePayload.employeeId,
                    },
                ],
            });
        }

        sourcePayload.employeeId = await reserveNextEmployeeId();

        const employeeInput = normalizeEmployeeMutationPayload(sourcePayload, { mode: "create" });

        if (employeeInput.departmentId) {
            const department = await Department.findById(employeeInput.departmentId);
            if (!department) {
                return sendApiError(
                    res,
                    createBadRequestError("departmentId does not reference an existing department.", "EMPLOYEE_DEPARTMENT_NOT_FOUND"),
                );
            }
        }

        // Step 1: Create in MongoDB (HR system source-of-truth)
        const employee = new Employee(employeeInput);

        const savedEmployee = await employee.save();
        const payload = buildEmployeePayload(savedEmployee);
        const sync = await dispatchEmployeeMutation({
            action: "CREATE",
            employee: savedEmployee,
            directPayload: payload,
            outboxPayload: payload,
            correlationId,
        });

        // Return source write result plus sync-state evidence for Case Study 3
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
        if (error instanceof EmployeeContractError) {
            return sendEmployeeContractError(res, error);
        }
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
        const updateData = normalizeEmployeeMutationPayload(req.body, { mode: "update" });

        if (updateData.departmentId) {
            const department = await Department.findById(updateData.departmentId);
            if (!department) {
                return sendApiError(
                    res,
                    createBadRequestError("departmentId does not reference an existing department.", "EMPLOYEE_DEPARTMENT_NOT_FOUND"),
                );
            }
        }

        const existingEmployee = await Employee.findById(id);
        if (!existingEmployee) {
            return sendApiError(res, createNotFoundError("Employee not found", "EMPLOYEE_NOT_FOUND"));
        }

        assertUpdateTimelineConsistency({
            existingEmployee,
            updateData,
            sourcePayload: req.body,
        });

        // Step 1: Update source-of-truth in MongoDB
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
        if (error instanceof EmployeeContractError) {
            return sendEmployeeContractError(res, error);
        }
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
            message: "Employee deleted",
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

export const getEmployeeSyncEvidence = async (req, res) => {
    try {
        const employeeLookup = normalizeEmployeeLookupParam(req.params.employeeId);
        const snapshot = await buildEmployeeSyncEvidenceSnapshot(employeeLookup);

        if (!snapshot) {
            return sendApiError(
                res,
                createNotFoundError("Sync evidence not found", "EMPLOYEE_SYNC_EVIDENCE_NOT_FOUND", {
                    meta: {
                        detail: "No source, queue, or payroll evidence exists for this employee ID.",
                    },
                }),
            );
        }

        return res.json({
            success: true,
            data: snapshot,
            meta: buildEmployeeMeta({
                dataset: "employeeSyncEvidence",
                filters: {
                    employeeId: employeeLookup,
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
            defaultCode: "EMPLOYEE_SYNC_EVIDENCE_FAILED",
        });
    }
};

export const getEmployees = async (req, res) => {
    try {
        const {
            page,
            limit,
            skip,
            search,
            departmentId,
            employmentType,
        } = normalizeEmployeeListQuery(req.query);
        const query = {};

        if (search) {
            Object.assign(query, buildEmployeeSearchQuery(search));
        }

        if (departmentId) {
            query.departmentId = departmentId;
        }

        if (employmentType) {
            query.employmentType = employmentType;
        }

        const employees = await Employee.find(query).skip(skip).limit(limit);
        const total = await Employee.countDocuments(query);
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
                filters: {
                    ...(search ? { search } : {}),
                    ...(departmentId ? { departmentId } : {}),
                    ...(employmentType ? { employmentType } : {}),
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
            defaultCode: "EMPLOYEE_LIST_FAILED",
        });
    }
};

export const getEmployeeOptions = async (req, res) => {
    try {
        const departments = await Department.find({}, "_id name code isActive")
            .sort({ name: 1 })
            .lean();
        const nextEmployeeId = await peekNextEmployeeId();

        return res.json({
            success: true,
            data: {
                departments: departments.map((department) => ({
                    _id: department._id?.toString(),
                    name: department.name,
                    code: department.code,
                    isActive: Boolean(department.isActive),
                })),
                enums: {
                    gender: EMPLOYEE_GENDER_OPTIONS,
                    employmentType: EMPLOYEE_TYPE_OPTIONS,
                },
                nextEmployeeId,
            },
            meta: buildEmployeeMeta({
                dataset: "employeeOptions",
                filters: {},
                departmentCount: departments.length,
            }),
        });
    } catch (error) {
        return respondWithApiError({
            req,
            res,
            error,
            context: "EmployeeController",
            defaultCode: "EMPLOYEE_OPTIONS_FAILED",
        });
    }
};
