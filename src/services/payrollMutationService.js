import { PayRate, SyncLog, sequelize } from "../models/sql/index.js";
import logger from "../utils/logger.js";
import { createBadRequestError } from "../utils/apiErrors.js";
import { createRequestId, normalizeRequestId } from "../utils/requestTracking.js";

const normalizeDecimal = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePayType = (input) => {
  const normalized = String(input || "HOURLY").trim().toUpperCase();
  const allowed = new Set(["HOURLY", "SALARY", "COMMISSION", "TERMINATED"]);
  return allowed.has(normalized) ? normalized : "HOURLY";
};

const resolveEmployeeId = (employeeData = {}) => {
  const resolved = employeeData.employeeId || employeeData._id?.toString();
  return String(resolved || "").trim();
};

const buildSyncLog = ({ employeeId, action, syncContext }) => ({
  source_system: "HR_MongoDB",
  target_system: "Payroll_Service",
  entity_type: "employee",
  entity_id: employeeId,
  correlation_id: syncContext.correlationId || null,
  action,
  status: "PENDING",
});

const buildSyncLogWhere = ({ employeeId, action, correlationId }) => ({
  entity_type: "employee",
  entity_id: employeeId,
  action,
  correlation_id: correlationId,
});

const resolvePayrollCorrelationId = (syncContext = {}) =>
  normalizeRequestId(syncContext.correlationId) || createRequestId();

const buildSuccessPayload = ({
  employeeId,
  action,
  correlationId,
  idempotent = false,
  deduplicated = false,
  detail = "Payroll write applied",
}) => ({
  success: true,
  message: "Payroll synced",
  data: {
    employeeId,
    action,
    correlationId,
    idempotent,
    deduplicated,
  },
  meta: {
    detail,
  },
});

const findLatestPayRate = (employeeId, transaction) => PayRate.findOne({
  where: {
    employee_id: employeeId,
  },
  order: [["effective_date", "DESC"], ["id", "DESC"]],
  transaction,
});

const findActivePayRate = (employeeId, transaction) => PayRate.findOne({
  where: {
    employee_id: employeeId,
    is_active: true,
  },
  order: [["effective_date", "DESC"], ["id", "DESC"]],
  transaction,
});

const handleCreate = async (data, transaction) => {
  const employeeId = resolveEmployeeId(data);
  const existingRate = await findActivePayRate(employeeId, transaction);

  if (!existingRate) {
    await PayRate.create({
      employee_id: employeeId,
      pay_rate: data.payRate || 0,
      pay_type: normalizePayType(data.payType),
      effective_date: new Date(),
      is_active: true,
    }, { transaction });
    return { mutated: true };
  }

  return { mutated: false, reason: "already-exists" };
};

const handleUpdate = async (data, transaction) => {
  const employeeId = resolveEmployeeId(data);
  if (data.payRate === undefined && data.payType === undefined) {
    return { mutated: false, reason: "no-payroll-fields" };
  }

  const currentRate = await findActivePayRate(employeeId, transaction);
  const nextPayRate = data.payRate !== undefined
    ? normalizeDecimal(data.payRate)
    : normalizeDecimal(currentRate?.pay_rate);
  const nextPayType = normalizePayType(data.payType !== undefined ? data.payType : currentRate?.pay_type);

  if (
    currentRate
    && normalizeDecimal(currentRate.pay_rate) === nextPayRate
    && normalizePayType(currentRate.pay_type) === nextPayType
  ) {
    return { mutated: false, reason: "unchanged" };
  }

  await PayRate.update(
    { is_active: false },
    { where: { employee_id: employeeId, is_active: true }, transaction },
  );

  await PayRate.create({
    employee_id: employeeId,
    pay_rate: nextPayRate,
    pay_type: nextPayType,
    effective_date: new Date(),
    is_active: true,
  }, { transaction });

  return { mutated: true };
};

const handleDelete = async (data, transaction) => {
  const employeeId = resolveEmployeeId(data);
  const currentRate = await findActivePayRate(employeeId, transaction);
  const latestRate = currentRate || await findLatestPayRate(employeeId, transaction);

  if (!currentRate && normalizePayType(latestRate?.pay_type) === "TERMINATED") {
    return { mutated: false, reason: "already-terminated" };
  }

  await PayRate.update(
    {
      is_active: false,
    },
    { where: { employee_id: employeeId, is_active: true }, transaction },
  );

  await PayRate.create({
    employee_id: employeeId,
    pay_rate: normalizeDecimal(latestRate?.pay_rate),
    pay_type: "TERMINATED",
    effective_date: new Date(),
    is_active: false,
  }, { transaction });

  return { mutated: true };
};

const actionHandlers = {
  CREATE: handleCreate,
  UPDATE: handleUpdate,
  DELETE: handleDelete,
};

export const applyPayrollMutation = async ({
  employeeData = {},
  action,
  syncContext = {},
} = {}) => {
  const resolvedAction = String(action || "").trim().toUpperCase();
  const employeeId = resolveEmployeeId(employeeData);
  const normalizedCorrelationId = resolvePayrollCorrelationId(syncContext);

  if (!employeeId) {
    throw createBadRequestError("employeeId is required for payroll sync.", "PAYROLL_SYNC_EMPLOYEE_ID_REQUIRED");
  }

  const mutationHandler = actionHandlers[resolvedAction];
  if (!mutationHandler) {
    throw createBadRequestError(`Unknown payroll sync action: ${action}`, "PAYROLL_SYNC_ACTION_INVALID");
  }

  const transaction = await sequelize.transaction();
  const syncLog = buildSyncLog({
    employeeId,
    action: resolvedAction,
    syncContext: {
      ...syncContext,
      correlationId: normalizedCorrelationId,
    },
  });
  const syncLogWhere = buildSyncLogWhere({
    employeeId,
    action: resolvedAction,
    correlationId: normalizedCorrelationId,
  });

  try {
    const [claimedLog, created] = await SyncLog.findOrCreate({
      where: syncLogWhere,
      defaults: syncLog,
      transaction,
    });

    if (!created) {
      if (claimedLog.status === "SUCCESS") {
        await transaction.rollback();
        logger.info("PayrollMutationService", "Duplicate payroll mutation skipped", {
          employeeId,
          action: resolvedAction,
          correlationId: normalizedCorrelationId,
          source: syncContext.source || null,
          integrationEventId: syncContext.integrationEventId || null,
        });

        return buildSuccessPayload({
          employeeId,
          action: resolvedAction,
          correlationId: normalizedCorrelationId,
          idempotent: true,
          deduplicated: true,
          detail: "Duplicate delivery ignored",
        });
      }

      if (claimedLog.status === "PENDING") {
        await transaction.rollback();
        logger.info("PayrollMutationService", "Payroll mutation already in progress for this correlationId", {
          employeeId,
          action: resolvedAction,
          correlationId: normalizedCorrelationId,
          source: syncContext.source || null,
          integrationEventId: syncContext.integrationEventId || null,
        });

        return buildSuccessPayload({
          employeeId,
          action: resolvedAction,
          correlationId: normalizedCorrelationId,
          idempotent: true,
          deduplicated: true,
          detail: "Duplicate delivery ignored",
        });
      }

      await SyncLog.update(
        {
          status: "PENDING",
          error_message: null,
          completed_at: null,
        },
        {
          where: { id: claimedLog.id },
          transaction,
        },
      );
    }

    const mutationResult = await mutationHandler(employeeData, transaction);
    await SyncLog.update(
      {
        status: "SUCCESS",
        error_message: null,
        completed_at: new Date(),
      },
      {
        where: syncLogWhere,
        transaction,
      },
    );
    await transaction.commit();

    logger.info("PayrollMutationService", "Payroll mutation applied", {
      employeeId,
      action: resolvedAction,
      correlationId: normalizedCorrelationId,
      source: syncContext.source || null,
      integrationEventId: syncContext.integrationEventId || null,
    });

    return buildSuccessPayload({
      employeeId,
      action: resolvedAction,
      correlationId: normalizedCorrelationId,
      idempotent: !mutationResult?.mutated,
      deduplicated: false,
      detail: mutationResult?.mutated
        ? "Payroll write applied"
        : ({
          "already-exists": "Active payroll record already exists",
          "no-payroll-fields": "No payroll change needed",
          "unchanged": "No payroll change needed",
          "already-terminated": "Employee already terminated",
        }[mutationResult?.reason] || "No payroll change needed"),
    });
  } catch (error) {
    await transaction.rollback();

    await SyncLog.upsert({
      ...syncLog,
      status: "FAILED",
      error_message: error.message,
      completed_at: new Date(),
    });

    logger.warn("PayrollMutationService", "Payroll mutation failed", {
      employeeId,
      action: resolvedAction,
      correlationId: normalizedCorrelationId,
      source: syncContext.source || null,
      integrationEventId: syncContext.integrationEventId || null,
      errorMessage: error.message,
    });

    return {
      success: false,
      message: "Sync failed",
      data: {
        employeeId,
        action: resolvedAction,
        correlationId: normalizedCorrelationId,
      },
      meta: {
        detail: error.message,
      },
    };
  }
};

export default {
  applyPayrollMutation,
};
