import { SyncLog } from "../models/sql/index.js";
import { getSyncStatus, retryFailedSyncs } from "../services/syncService.js";
import {
  buildSyncMeta,
  normalizeSyncEntityParams,
  normalizeSyncLogsQuery,
  sendSyncContractError,
  SyncContractError,
} from "../utils/syncContracts.js";
import { respondWithApiError } from "../utils/apiErrors.js";

const buildSyncWhere = ({
  status,
  action,
  entityType,
  entityId,
  correlationId,
}) => {
  const where = {};
  if (status) where.status = status;
  if (action) where.action = action;
  if (entityType) where.entity_type = entityType;
  if (entityId) where.entity_id = entityId;
  if (correlationId) where.correlation_id = correlationId;
  return where;
};

export const getSyncOverview = async (req, res) => {
  try {
    const stats = await SyncLog.findAll({
      attributes: [
        "status",
        [SyncLog.sequelize.fn("COUNT", SyncLog.sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const counts = {
      PENDING: 0,
      SUCCESS: 0,
      FAILED: 0,
    };

    stats.forEach((row) => {
      counts[row.status] = Number.parseInt(row.count, 10);
    });

    const total = counts.PENDING + counts.SUCCESS + counts.FAILED;
    const denominator = counts.SUCCESS + counts.FAILED;
    const healthScore = denominator === 0
      ? 100
      : Math.round((counts.SUCCESS / denominator) * 100);

    return res.json({
      success: true,
      data: {
        counts,
        total,
        healthScore,
      },
      meta: buildSyncMeta({
        dataset: "syncOverview",
        actorId: req.userId || null,
        filters: {},
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "SyncController",
      defaultCode: "SYNC_OVERVIEW_FAILED",
    });
  }
};

export const listSyncLogs = async (req, res) => {
  try {
    const {
      status,
      action,
      entityType,
      entityId,
      correlationId,
      page,
      limit,
      offset,
    } = normalizeSyncLogsQuery(req.query);

    const where = buildSyncWhere({
      status,
      action,
      entityType,
      entityId,
      correlationId,
    });

    const [total, logs] = await Promise.all([
      SyncLog.count({ where }),
      SyncLog.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
        raw: true,
      }),
    ]);

    return res.json({
      success: true,
      data: logs,
      meta: buildSyncMeta({
        dataset: "syncLogs",
        actorId: req.userId || null,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        filters: {
          status: status || null,
          action: action || null,
          entityType: entityType || null,
          entityId: entityId || null,
          correlationId: correlationId || null,
        },
      }),
    });
  } catch (error) {
    if (error instanceof SyncContractError) {
      return sendSyncContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "SyncController",
      defaultCode: "SYNC_LOG_LIST_FAILED",
    });
  }
};

export const retrySyncLogs = async (req, res) => {
  try {
    const result = await retryFailedSyncs({
      fallbackCorrelationId: req.requestId || null,
    });

    return res.json({
      success: true,
      data: result,
      meta: buildSyncMeta({
        dataset: "syncRetry",
        actorId: req.userId || null,
        filters: {
          status: "FAILED",
        },
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "SyncController",
      defaultCode: "SYNC_RETRY_FAILED",
    });
  }
};

export const getSyncEntityStatus = async (req, res) => {
  try {
    const { entityType, entityId } = normalizeSyncEntityParams(req.params);
    const log = await getSyncStatus(entityType, entityId);

    return res.json({
      success: true,
      data: log,
      meta: buildSyncMeta({
        dataset: "syncEntityStatus",
        actorId: req.userId || null,
        filters: {
          entityType,
          entityId,
        },
        found: Boolean(log),
      }),
    });
  } catch (error) {
    if (error instanceof SyncContractError) {
      return sendSyncContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "SyncController",
      defaultCode: "SYNC_ENTITY_LOOKUP_FAILED",
    });
  }
};
