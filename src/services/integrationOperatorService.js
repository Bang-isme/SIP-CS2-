import { Op } from "sequelize";
import { recordIntegrationEventAudit, recordIntegrationEventAudits } from "./integrationAuditService.js";
import { IntegrationEventStore } from "../repositories/integrationStore.js";

const RESET_EVENT_STATE = Object.freeze({
  status: "PENDING",
  attempts: 0,
  last_error: null,
  next_run_at: null,
});

const buildOperatorAuditPatch = ({
  action,
  actorId = null,
  requestId = null,
  occurredAt = new Date(),
}) => ({
  last_operator_action: action,
  last_operator_actor_id: actorId,
  last_operator_request_id: requestId,
  last_operator_at: occurredAt,
});

const buildOperatorAuditEntries = (events, {
  action,
  actorId = null,
  requestId = null,
  occurredAt = new Date(),
  targetStatus = "PENDING",
  details = null,
}) => events.map((event) => ({
  integrationEventId: event.id,
  operatorAction: action,
  operatorActorId: actorId,
  operatorRequestId: requestId,
  sourceStatus: event.status || null,
  targetStatus,
  details: {
    entityType: event.entity_type,
    entityId: event.entity_id,
    eventAction: event.action,
    ...(details || {}),
  },
  occurredAt,
}));

export const requeueIntegrationEventById = async (id, operatorContext = {}) => {
  const event = await IntegrationEventStore.findByPk(id, { raw: true });
  if (!event) return null;
  const occurredAt = operatorContext.occurredAt || new Date();

  const [updatedCount] = await IntegrationEventStore.update(
    {
      ...RESET_EVENT_STATE,
      ...buildOperatorAuditPatch({
        action: "retry-event",
        occurredAt,
        ...operatorContext,
      }),
    },
    { where: { id } },
  );

  if (updatedCount > 0) {
    await recordIntegrationEventAudit(buildOperatorAuditEntries([event], {
      action: "retry-event",
      actorId: operatorContext.actorId || null,
      requestId: operatorContext.requestId || null,
      occurredAt,
      details: {
        scope: "single-event",
      },
    })[0]);
  }

  return event;
};

export const requeueDeadIntegrationEvents = async (operatorContext = {}) => {
  const deadEvents = await IntegrationEventStore.findAll({
    where: { status: "DEAD" },
    attributes: ["id", "status", "entity_type", "entity_id", "action"],
    raw: true,
  });
  if (deadEvents.length === 0) return 0;

  const occurredAt = operatorContext.occurredAt || new Date();
  const [count] = await IntegrationEventStore.update(
    {
      ...RESET_EVENT_STATE,
      ...buildOperatorAuditPatch({
        action: "retry-dead",
        occurredAt,
        ...operatorContext,
      }),
    },
    { where: { status: "DEAD" } },
  );

  if (count > 0) {
    await recordIntegrationEventAudits(buildOperatorAuditEntries(deadEvents, {
      action: "retry-dead",
      actorId: operatorContext.actorId || null,
      requestId: operatorContext.requestId || null,
      occurredAt,
      details: {
        scope: "batch-status",
        filters: { status: "DEAD" },
      },
    }));
  }

  return count;
};

export const replayIntegrationEventsByFilter = async ({
  statuses,
  entityType,
  entityId,
  since,
}, operatorContext = {}) => {
  const where = {
    status: { [Op.in]: statuses },
  };

  if (entityType) {
    where.entity_type = entityType;
  }
  if (entityId) {
    where.entity_id = entityId;
  }
  if (since) {
    where.createdAt = { [Op.gte]: since };
  }

  const matchedEvents = await IntegrationEventStore.findAll({
    where,
    attributes: ["id", "status", "entity_type", "entity_id", "action"],
    raw: true,
  });
  if (matchedEvents.length === 0) {
    return {
      count: 0,
      filters: {
        statuses,
        entityType: entityType || null,
        entityId: entityId || null,
        since: since ? since.toISOString() : null,
      },
    };
  }

  const occurredAt = operatorContext.occurredAt || new Date();

  const [count] = await IntegrationEventStore.update(
    {
      ...RESET_EVENT_STATE,
      ...buildOperatorAuditPatch({
        action: "replay-events",
        occurredAt,
        ...operatorContext,
      }),
    },
    { where },
  );

  if (count > 0) {
    await recordIntegrationEventAudits(buildOperatorAuditEntries(matchedEvents, {
      action: "replay-events",
      actorId: operatorContext.actorId || null,
      requestId: operatorContext.requestId || null,
      occurredAt,
      details: {
        scope: "filtered-replay",
        filters: {
          statuses,
          entityType: entityType || null,
          entityId: entityId || null,
          since: since ? since.toISOString() : null,
        },
      },
    }));
  }

  return {
    count,
    filters: {
      statuses,
      entityType: entityType || null,
      entityId: entityId || null,
      since: since ? since.toISOString() : null,
    },
  };
};
