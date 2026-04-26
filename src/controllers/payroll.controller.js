import { Op } from "sequelize";
import { PayRate, SyncLog } from "../models/sql/index.js";
import { DASHBOARD_PORT, SA_PORT } from "../config.js";
import {
  createBadRequestError,
  createNotFoundError,
  respondWithApiError,
  sendApiError,
} from "../utils/apiErrors.js";
import { applyPayrollMutation } from "../services/payrollMutationService.js";

const DEFAULT_PAGE_LIMIT = 25;
const MAX_PAGE_LIMIT = 100;

const normalizePage = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeLimit = (value) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_LIMIT;
  return Math.min(parsed, MAX_PAGE_LIMIT);
};

const buildPayRateDto = (record) => ({
  id: record.id,
  employeeId: record.employee_id,
  payRate: Number(record.pay_rate),
  payType: record.pay_type,
  effectiveDate: record.effective_date,
  isActive: Boolean(record.is_active),
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const buildSyncLogDto = (record) => ({
  id: record.id,
  entityType: record.entity_type,
  entityId: record.entity_id,
  action: record.action,
  status: record.status,
  correlationId: record.correlation_id || null,
  retryCount: record.retry_count || 0,
  errorMessage: record.error_message || null,
  completedAt: record.completed_at || null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const buildPayrollMeta = ({ page, limit, total, filters = {} }) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
  filters,
});

const stripApiSuffix = (url = "") => url.replace(/\/api\/?$/, "");
const buildRequestOrigin = (req) => `${req.protocol}://${req.get("host")}`;
const buildSiblingOrigin = (req, port) => {
  const url = new URL(buildRequestOrigin(req));
  url.port = String(port);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
};

const resolveSaApiBaseUrl = (req) => {
  if (process.env.SA_PUBLIC_API_BASE_URL) {
    return process.env.SA_PUBLIC_API_BASE_URL;
  }
  return `${buildSiblingOrigin(req, SA_PORT)}/api`;
};

export const getPayrollConsoleConfig = (req, res) => {
  const saApiBaseUrl = resolveSaApiBaseUrl(req);
  const saServiceUrl = stripApiSuffix(saApiBaseUrl);
  const payrollServiceUrl = buildRequestOrigin(req);
  const dashboardServiceUrl = buildSiblingOrigin(req, DASHBOARD_PORT);

  return res.json({
    success: true,
    data: {
      saApiBaseUrl,
      service: req.app.locals.serviceInfo || null,
      links: {
        payrollHomeUrl: payrollServiceUrl,
        payrollHealthUrl: `${payrollServiceUrl}/api/health`,
        saHomeUrl: saServiceUrl,
        saDocsUrl: `${saServiceUrl}/api/contracts/docs/`,
        saHealthUrl: `${saServiceUrl}/api/health/live`,
        dashboardHomeUrl: dashboardServiceUrl,
        dashboardLoginUrl: `${dashboardServiceUrl}/login`,
        dashboardHealthUrl: `${dashboardServiceUrl}/api/health`,
      },
    },
  });
};

export const getPayrollInternalHealth = (req, res) => {
  return res.json({
    success: true,
    data: {
      service: req.app.locals.serviceInfo || null,
      internalService: req.internalService || null,
      ready: true,
    },
  });
};

export const syncPayrollInternalMutation = async (req, res) => {
  try {
    const action = String(req.body?.action || "").trim().toUpperCase();
    if (!action) {
      return sendApiError(
        res,
        createBadRequestError("Sync action required", "PAYROLL_SYNC_ACTION_REQUIRED", {
          meta: {
            detail: "Provide an action before sending payroll sync.",
          },
        }),
      );
    }

    const employeeData = req.body?.employeeData || {};
    const syncContext = {
      ...(req.body?.syncContext || {}),
      source: req.body?.syncContext?.source || req.internalService?.name || "INTERNAL_SERVICE",
    };

    const result = await applyPayrollMutation({
      employeeData,
      action,
      syncContext,
    });

    return res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "PayrollController",
      defaultCode: "PAYROLL_INTERNAL_SYNC_FAILED",
    });
  }
};

export const listPayrollPayRates = async (req, res) => {
  try {
    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || req.query.employeeId || "").trim();
    const history = req.query.history === "1" || req.query.history === "true";
    const where = {};

    if (!history) {
      where.is_active = true;
    }
    if (search) {
      where.employee_id = { [Op.like]: `%${search}%` };
    }

    const result = await PayRate.findAndCountAll({
      where,
      order: [["employee_id", "ASC"], ["effective_date", "DESC"], ["id", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: result.rows.map(buildPayRateDto),
      meta: buildPayrollMeta({
        page,
        limit,
        total: result.count,
        filters: {
          ...(search ? { search } : {}),
          history,
        },
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "PayrollController",
      defaultCode: "PAYROLL_LIST_FAILED",
    });
  }
};

export const getPayrollPayRateByEmployeeId = async (req, res) => {
  try {
    const employeeId = String(req.params.employeeId || "").trim();
    const history = await PayRate.findAll({
      where: { employee_id: employeeId },
      order: [["effective_date", "DESC"], ["id", "DESC"]],
      limit: 20,
    });

    if (history.length === 0) {
      return sendApiError(res, createNotFoundError("Payroll record not found", "PAYROLL_RECORD_NOT_FOUND", {
        meta: {
          detail: "No payroll snapshot exists for this employee yet.",
        },
      }));
    }

    const syncLog = await SyncLog.findAll({
      where: {
        entity_type: "employee",
        entity_id: employeeId,
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    const activeRecord = history.find((record) => record.is_active) || history[0];

    return res.json({
      success: true,
      data: {
        employeeId,
        current: buildPayRateDto(activeRecord),
        history: history.map(buildPayRateDto),
        latestSync: syncLog.length > 0 ? buildSyncLogDto(syncLog[0]) : null,
        syncLog: syncLog.map(buildSyncLogDto),
      },
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "PayrollController",
      defaultCode: "PAYROLL_DETAIL_FAILED",
    });
  }
};

export const listPayrollSyncLog = async (req, res) => {
  try {
    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit);
    const offset = (page - 1) * limit;
    const status = String(req.query.status || "").trim().toUpperCase();
    const correlationId = String(req.query.correlationId || "").trim();
    const entityId = String(req.query.entityId || "").trim();
    const where = {
      entity_type: "employee",
    };

    if (status) {
      where.status = status;
    }
    if (correlationId) {
      where.correlation_id = correlationId;
    }
    if (entityId) {
      where.entity_id = { [Op.like]: `%${entityId}%` };
    }

    const result = await SyncLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: result.rows.map(buildSyncLogDto),
      meta: buildPayrollMeta({
        page,
        limit,
        total: result.count,
        filters: {
          ...(status ? { status } : {}),
          ...(correlationId ? { correlationId } : {}),
          ...(entityId ? { entityId } : {}),
        },
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "PayrollController",
      defaultCode: "PAYROLL_SYNC_LOG_LIST_FAILED",
    });
  }
};

export const getPayrollSyncLogByEmployeeId = async (req, res) => {
  try {
    const employeeId = String(req.params.employeeId || "").trim();
    const syncLog = await SyncLog.findAll({
      where: {
        entity_type: "employee",
        entity_id: employeeId,
      },
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    if (syncLog.length === 0) {
      return sendApiError(res, createNotFoundError("Sync evidence not found", "PAYROLL_SYNC_LOG_NOT_FOUND", {
        meta: {
          detail: "No payroll sync evidence exists for this employee yet.",
        },
      }));
    }

    return res.json({
      success: true,
      data: {
        employeeId,
        latest: buildSyncLogDto(syncLog[0]),
        history: syncLog.map(buildSyncLogDto),
      },
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "PayrollController",
      defaultCode: "PAYROLL_SYNC_LOG_DETAIL_FAILED",
    });
  }
};
