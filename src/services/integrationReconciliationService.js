import { Op } from "sequelize";
import Employee from "../models/Employee.js";
import { PayRate } from "../models/sql/index.js";
import { DashboardCache } from "../utils/cache.js";
import logger from "../utils/logger.js";

const DEFAULT_SAMPLE_LIMIT = 5;
const DEFAULT_REPAIR_LIMIT = 100;
const DEFAULT_CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_ENDPOINT = "integrationReconciliation";
const CACHE_PARAMS = Object.freeze({
  scope: "sa-payroll-active-pay-rates",
  version: 1,
});

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const reconciliationCache = new DashboardCache({
  ttl: parsePositiveInteger(process.env.INTEGRATION_RECONCILIATION_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS),
  maxEntries: 5,
});

const normalizeEmployeeId = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizePayRate = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
};

const formatDateOnly = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
};

const normalizeAffectedCount = (result) => {
  if (Array.isArray(result)) {
    const [count] = result;
    return Number.isFinite(Number(count)) ? Number(count) : 0;
  }
  return Number.isFinite(Number(result)) ? Number(result) : 0;
};

const compareDatesDescending = (left, right) => {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
};

const comparePayrollRows = (left, right) => {
  const employeeCompare = normalizeEmployeeId(left?.employee_id)
    .localeCompare(normalizeEmployeeId(right?.employee_id));
  if (employeeCompare !== 0) return employeeCompare;

  const effectiveCompare = compareDatesDescending(left?.effective_date, right?.effective_date);
  if (effectiveCompare !== 0) return effectiveCompare;

  const updatedCompare = compareDatesDescending(left?.updatedAt, right?.updatedAt);
  if (updatedCompare !== 0) return updatedCompare;

  return (Number(right?.id) || 0) - (Number(left?.id) || 0);
};

export const getActivePayrollCoverageWhere = () => ({
  is_active: true,
  pay_type: { [Op.ne]: "TERMINATED" },
});

export const computeIntegrationReconciliationSnapshot = ({
  sourceEmployees = [],
  activePayRates = [],
  checkedAt = new Date().toISOString(),
  sampleLimit = DEFAULT_SAMPLE_LIMIT,
} = {}) => {
  const limitedSampleSize = parsePositiveInteger(sampleLimit, DEFAULT_SAMPLE_LIMIT);
  const payrollByEmployee = new Map();
  const duplicateActivePayroll = [];
  const duplicateSeen = new Set();

  for (const row of [...activePayRates].sort(comparePayrollRows)) {
    if (row?.is_active === false || row?.pay_type === "TERMINATED") {
      continue;
    }
    const employeeId = normalizeEmployeeId(row?.employee_id);
    if (!employeeId) continue;

    if (!payrollByEmployee.has(employeeId)) {
      payrollByEmployee.set(employeeId, row);
      continue;
    }

    if (!duplicateSeen.has(employeeId)) {
      duplicateSeen.add(employeeId);
      duplicateActivePayroll.push(employeeId);
    }
  }

  const sourceEmployeeIds = new Set();
  const missingInPayroll = [];
  const payRateMismatch = [];
  let missingInPayrollCount = 0;
  let payRateMismatchCount = 0;

  for (const employee of sourceEmployees) {
    const employeeId = normalizeEmployeeId(employee?.employeeId);
    if (!employeeId) continue;
    sourceEmployeeIds.add(employeeId);

    const payrollRow = payrollByEmployee.get(employeeId);
    if (!payrollRow) {
      missingInPayrollCount += 1;
      if (missingInPayroll.length < limitedSampleSize) {
        missingInPayroll.push(employeeId);
      }
      continue;
    }

    const sourcePayRate = normalizePayRate(employee?.payRate);
    const payrollPayRate = normalizePayRate(payrollRow?.pay_rate);

    if (sourcePayRate !== payrollPayRate) {
      payRateMismatchCount += 1;
      if (payRateMismatch.length < limitedSampleSize) {
        payRateMismatch.push({
          employeeId,
          sourcePayRate,
          payrollPayRate,
        });
      }
    }
  }

  const extraInPayroll = [];
  let extraInPayrollCount = 0;
  for (const employeeId of payrollByEmployee.keys()) {
    if (sourceEmployeeIds.has(employeeId)) continue;
    extraInPayrollCount += 1;
    if (extraInPayroll.length < limitedSampleSize) {
      extraInPayroll.push(employeeId);
    }
  }

  const sourceEmployeeCount = sourceEmployeeIds.size;
  const downstreamCoveredEmployeeCount = payrollByEmployee.size;
  const duplicateActivePayrollCount = duplicateActivePayroll.length;
  const issueCount = (
    missingInPayrollCount
    + extraInPayrollCount
    + duplicateActivePayrollCount
    + payRateMismatchCount
  );
  const alignedSourceEmployeeCount = Math.max(
    0,
    sourceEmployeeCount - missingInPayrollCount - payRateMismatchCount,
  );
  const parityRate = sourceEmployeeCount > 0
    ? Number(((alignedSourceEmployeeCount / sourceEmployeeCount) * 100).toFixed(1))
    : 100;

  return {
    status: issueCount === 0 ? "healthy" : "attention",
    checkedAt,
    freshnessTtlMs: reconciliationCache.ttl,
    scope: {
      sourceSystem: "SA",
      downstreamSystem: "Payroll",
      downstreamCoverage: "Active pay_rates",
      sampleLimit: limitedSampleSize,
    },
    summary: {
      sourceEmployeeCount,
      downstreamCoveredEmployeeCount,
      missingInPayrollCount,
      extraInPayrollCount,
      duplicateActivePayrollCount,
      payRateMismatchCount,
      alignedSourceEmployeeCount,
      issueCount,
      parityRate,
    },
    samples: {
      missingInPayroll,
      extraInPayroll,
      duplicateActivePayroll: duplicateActivePayroll.slice(0, limitedSampleSize),
      payRateMismatch,
    },
  };
};

export const buildIntegrationReconciliationSnapshot = async ({
  forceRefresh = false,
  cache = reconciliationCache,
  sourceModel = Employee,
  payRateModel = PayRate,
  sampleLimit = DEFAULT_SAMPLE_LIMIT,
} = {}) => {
  if (!forceRefresh) {
    const cached = cache.get(CACHE_ENDPOINT, CACHE_PARAMS);
    if (cached) {
      return cached;
    }
  }

  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const [sourceEmployees, activePayRates] = await Promise.all([
    sourceModel.find({}, { employeeId: 1, payRate: 1, _id: 0 }).lean(),
    payRateModel.findAll({
      attributes: [
        "id",
        "employee_id",
        "pay_rate",
        "pay_type",
        "is_active",
        "effective_date",
        "updatedAt",
      ],
      where: getActivePayrollCoverageWhere(),
      raw: true,
    }),
  ]);

  const snapshot = computeIntegrationReconciliationSnapshot({
    sourceEmployees,
    activePayRates,
    checkedAt,
    sampleLimit,
  });

  cache.set(CACHE_ENDPOINT, CACHE_PARAMS, snapshot);

  logger.info("IntegrationReconciliationService", "Built reconciliation snapshot", {
    durationMs: Date.now() - startedAt,
    sourceEmployeeCount: snapshot.summary.sourceEmployeeCount,
    downstreamCoveredEmployeeCount: snapshot.summary.downstreamCoveredEmployeeCount,
    issueCount: snapshot.summary.issueCount,
    status: snapshot.status,
  });

  return snapshot;
};

export const repairExtraPayrollCoverage = async ({
  sourceModel = Employee,
  payRateModel = PayRate,
  sequelizeInstance = null,
  maxRepairCount = DEFAULT_REPAIR_LIMIT,
  actorId = null,
  requestId = null,
  now = () => new Date(),
} = {}) => {
  const repairLimit = parsePositiveInteger(maxRepairCount, DEFAULT_REPAIR_LIMIT);
  const [sourceEmployees, activePayRates] = await Promise.all([
    sourceModel.find({}, { employeeId: 1, _id: 0 }).lean(),
    payRateModel.findAll({
      attributes: [
        "id",
        "employee_id",
        "pay_rate",
        "pay_type",
        "is_active",
        "effective_date",
        "updatedAt",
      ],
      where: getActivePayrollCoverageWhere(),
      raw: true,
    }),
  ]);

  const sourceEmployeeIds = new Set(
    sourceEmployees
      .map((employee) => normalizeEmployeeId(employee?.employeeId))
      .filter(Boolean),
  );
  const payrollByExtraEmployee = new Map();

  for (const row of [...activePayRates].sort(comparePayrollRows)) {
    const employeeId = normalizeEmployeeId(row?.employee_id);
    if (!employeeId || sourceEmployeeIds.has(employeeId) || payrollByExtraEmployee.has(employeeId)) {
      continue;
    }
    payrollByExtraEmployee.set(employeeId, row);
  }

  const detectedExtraIds = [...payrollByExtraEmployee.keys()];
  const repairedEmployeeIds = detectedExtraIds.slice(0, repairLimit);
  if (repairedEmployeeIds.length === 0) {
    return {
      repaired: false,
      repairedEmployeeIds: [],
      detectedExtraCount: detectedExtraIds.length,
      deactivatedCount: 0,
      terminatedRowsCreated: 0,
      remainingExtraCount: 0,
      actorId,
      requestId,
    };
  }

  const sequelizeForTransaction = sequelizeInstance || payRateModel.sequelize;
  const transaction = await sequelizeForTransaction.transaction();
  const effectiveDate = formatDateOnly(now());

  try {
    const updateResult = await payRateModel.update(
      { is_active: false },
      {
        where: {
          employee_id: { [Op.in]: repairedEmployeeIds },
          ...getActivePayrollCoverageWhere(),
        },
        transaction,
      },
    );
    const terminatedRows = repairedEmployeeIds.map((employeeId) => {
      const row = payrollByExtraEmployee.get(employeeId);
      return {
        employee_id: employeeId,
        pay_rate: normalizePayRate(row?.pay_rate),
        pay_type: "TERMINATED",
        effective_date: effectiveDate,
        is_active: false,
      };
    });
    await payRateModel.bulkCreate(terminatedRows, { transaction });
    await transaction.commit();
    reconciliationCache.clear();

    const result = {
      repaired: true,
      repairedEmployeeIds,
      detectedExtraCount: detectedExtraIds.length,
      deactivatedCount: normalizeAffectedCount(updateResult),
      terminatedRowsCreated: terminatedRows.length,
      remainingExtraCount: Math.max(0, detectedExtraIds.length - repairedEmployeeIds.length),
      actorId,
      requestId,
    };

    logger.info("IntegrationReconciliationService", "Repaired extra payroll coverage", result);
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.warn("IntegrationReconciliationService", "Failed to repair extra payroll coverage", {
      errorMessage: error.message,
      actorId,
      requestId,
      detectedExtraCount: detectedExtraIds.length,
      attemptedRepairCount: repairedEmployeeIds.length,
    });
    throw error;
  }
};

export default buildIntegrationReconciliationSnapshot;
