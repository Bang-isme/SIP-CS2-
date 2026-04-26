import { IntegrationEventAuditStore } from "../repositories/integrationStore.js";

const normalizeAuditDetails = (details = null) => {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details;
};

const buildAuditRecord = ({
  integrationEventId,
  operatorAction,
  operatorActorId = null,
  operatorRequestId = null,
  sourceStatus = null,
  targetStatus = null,
  details = null,
  occurredAt = new Date(),
}) => ({
  integration_event_id: integrationEventId,
  operator_action: operatorAction,
  operator_actor_id: operatorActorId,
  operator_request_id: operatorRequestId,
  source_status: sourceStatus,
  target_status: targetStatus,
  details: normalizeAuditDetails(details),
  createdAt: occurredAt,
  updatedAt: occurredAt,
});

export const recordIntegrationEventAudit = async (payload) => {
  return IntegrationEventAuditStore.create(buildAuditRecord(payload));
};

export const recordIntegrationEventAudits = async (entries = []) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  return IntegrationEventAuditStore.bulkCreate(entries.map(buildAuditRecord));
};

export const listIntegrationEventAudits = async ({
  integrationEventId,
  limit,
  offset,
}) => {
  const where = { integration_event_id: integrationEventId };
  const [total, rows] = await Promise.all([
    IntegrationEventAuditStore.count({ where }),
    IntegrationEventAuditStore.findAll({
      where,
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit,
      offset,
      raw: true,
    }),
  ]);

  return {
    total,
    rows,
  };
};
