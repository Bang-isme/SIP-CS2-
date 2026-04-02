import { Op } from "sequelize";
import { IntegrationEvent } from "../models/sql/index.js";
import { OUTBOX_PROCESSING_TIMEOUT_MS } from "../config.js";
import { countStuckProcessingIntegrationEvents } from "./integrationEventService.js";

export const getProcessingTimeoutMinutes = () => {
  return Math.max(1, Math.floor(OUTBOX_PROCESSING_TIMEOUT_MS / 60000));
};

export const buildIntegrationMetricsSnapshot = async () => {
  const grouped = await IntegrationEvent.findAll({
    attributes: [
      "status",
      [IntegrationEvent.sequelize.fn("COUNT", IntegrationEvent.sequelize.col("id")), "count"],
    ],
    group: ["status"],
    raw: true,
  });

  const counts = {
    PENDING: 0,
    PROCESSING: 0,
    SUCCESS: 0,
    FAILED: 0,
    DEAD: 0,
  };

  for (const row of grouped) {
    const status = row.status;
    const count = parseInt(row.count, 10) || 0;
    if (Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status] = count;
    }
  }

  const total = Object.values(counts).reduce((acc, curr) => acc + curr, 0);
  const backlog = counts.PENDING + counts.PROCESSING + counts.FAILED;
  const stuckProcessingCount = Math.min(
    counts.PROCESSING,
    await countStuckProcessingIntegrationEvents(),
  );
  const healthyProcessingCount = Math.max(0, counts.PROCESSING - stuckProcessingCount);
  const actionable = counts.FAILED + counts.DEAD + stuckProcessingCount;
  const processingTimeoutMinutes = getProcessingTimeoutMinutes();

  const oldestPending = await IntegrationEvent.findOne({
    where: { status: { [Op.in]: ["PENDING", "PROCESSING", "FAILED"] } },
    attributes: ["createdAt"],
    order: [["createdAt", "ASC"]],
    raw: true,
  });

  const now = Date.now();
  const oldestPendingAt = oldestPending?.createdAt || null;
  const oldestPendingAgeMinutes = oldestPendingAt
    ? Math.max(0, Math.floor((now - new Date(oldestPendingAt).getTime()) / 60000))
    : 0;

  return {
    total,
    counts,
    backlog,
    actionable,
    stuckProcessingCount,
    healthyProcessingCount,
    processingTimeoutMinutes,
    oldestPendingAt,
    oldestPendingAgeMinutes,
  };
};
