import { jest } from "@jest/globals";

const integrationCountMock = jest.fn();
const integrationFindAllMock = jest.fn();
const integrationFindByPkMock = jest.fn();
const integrationUpdateMock = jest.fn();
const integrationAuditCountMock = jest.fn();
const integrationAuditFindAllMock = jest.fn();
const integrationAuditCreateMock = jest.fn();
const integrationAuditBulkCreateMock = jest.fn();
const recoverStuckProcessingIntegrationEventsMock = jest.fn();
const buildIntegrationMetricsSnapshotMock = jest.fn();

jest.unstable_mockModule("../models/sql/index.js", () => ({
  IntegrationEvent: {
    count: integrationCountMock,
    findAll: integrationFindAllMock,
    findByPk: integrationFindByPkMock,
    update: integrationUpdateMock,
  },
  IntegrationEventAudit: {
    count: integrationAuditCountMock,
    findAll: integrationAuditFindAllMock,
    create: integrationAuditCreateMock,
    bulkCreate: integrationAuditBulkCreateMock,
  },
}));

jest.unstable_mockModule("../services/integrationEventService.js", () => ({
  recoverStuckProcessingIntegrationEvents: recoverStuckProcessingIntegrationEventsMock,
}));

jest.unstable_mockModule("../services/integrationMetricsService.js", () => ({
  buildIntegrationMetricsSnapshot: buildIntegrationMetricsSnapshotMock,
}));

const {
  getIntegrationEventAudit,
  getIntegrationMetrics,
  listIntegrationEvents,
  recoverStuckIntegrationEvents,
  replayIntegrationEvents,
  retryDeadIntegrationEvents,
  retryIntegrationEvent,
} = await import("../controllers/integration.controller.js");

const createRes = () => {
  const res = {};
  res.locals = { requestId: "req-integration-test" };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn((body) => {
    if (body?.meta) {
      body.meta.requestId = res.locals.requestId;
    } else if (body?.success === false) {
      body.requestId = res.locals.requestId;
    }
    return res;
  });
  return res;
};

describe("integration controller behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getIntegrationMetrics returns canonical metrics envelope", async () => {
    const req = { userId: "admin-1", requestId: "req-integration-test" };
    const res = createRes();

    buildIntegrationMetricsSnapshotMock.mockResolvedValue({
      backlog: 9,
      actionable: 5,
      stuckProcessingCount: 2,
      healthyProcessingCount: 2,
      processingTimeoutMinutes: 15,
    });

    await getIntegrationMetrics(req, res);

    expect(buildIntegrationMetricsSnapshotMock).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          backlog: 9,
          actionable: 5,
          stuckProcessingCount: 2,
          healthyProcessingCount: 2,
          processingTimeoutMinutes: 15,
        }),
        meta: expect.objectContaining({
          dataset: "integrationMetrics",
          actorId: "admin-1",
          requestId: "req-integration-test",
        }),
      }),
    );
  });

  test("getIntegrationEventAudit rejects malformed id before persistence", async () => {
    const req = {
      userId: "admin-1",
      requestId: "req-integration-test",
      params: { id: "oops" },
      query: {},
    };
    const res = createRes();

    await getIntegrationEventAudit(req, res);

    expect(integrationAuditCountMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      requestId: "req-integration-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "id" }),
      ]),
    }));
  });

  test("getIntegrationEventAudit returns canonical audit history envelope", async () => {
    const req = {
      userId: "admin-1",
      requestId: "req-integration-test",
      params: { id: "12" },
      query: { page: "2", limit: "5" },
    };
    const res = createRes();

    integrationAuditCountMock.mockResolvedValue(6);
    integrationAuditFindAllMock.mockResolvedValue([
      {
        id: 91,
        integration_event_id: 12,
        operator_action: "retry-event",
        operator_actor_id: "admin-1",
        operator_request_id: "req-integration-test",
        source_status: "FAILED",
        target_status: "PENDING",
        details: { scope: "single-event" },
      },
    ]);

    await getIntegrationEventAudit(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          id: 91,
          integration_event_id: 12,
          operator_action: "retry-event",
        }),
      ],
      meta: expect.objectContaining({
        dataset: "integrationEventAudit",
        actorId: "admin-1",
        total: 6,
        page: 2,
        limit: 5,
        pages: 2,
        totalPages: 2,
        filters: { id: 12 },
        requestId: "req-integration-test",
      }),
    });
  });

  test("listIntegrationEvents rejects invalid query params with 422", async () => {
    const req = {
      userId: "admin-1",
      requestId: "req-integration-test",
      query: {
        status: "BROKEN",
        page: "0",
      },
    };
    const res = createRes();

    await listIntegrationEvents(req, res);

    expect(integrationCountMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      requestId: "req-integration-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "status" }),
        expect.objectContaining({ field: "page" }),
      ]),
    }));
  });

  test("listIntegrationEvents returns filters and totalPages metadata", async () => {
    const req = {
      userId: "admin-1",
      requestId: "req-integration-test",
      query: {
        status: "FAILED",
        page: "2",
        limit: "10",
      },
    };
    const res = createRes();

    integrationCountMock.mockResolvedValue(23);
    integrationFindAllMock.mockResolvedValue([
      { id: 11, status: "FAILED", entity_type: "employee", entity_id: "EMP001", action: "UPDATE" },
    ]);

    await listIntegrationEvents(req, res);

    expect(integrationCountMock).toHaveBeenCalledWith({ where: { status: "FAILED" } });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        { id: 11, status: "FAILED", entity_type: "employee", entity_id: "EMP001", action: "UPDATE" },
      ],
      meta: expect.objectContaining({
        dataset: "integrationEvents",
        actorId: "admin-1",
        total: 23,
        page: 2,
        limit: 10,
        pages: 3,
        totalPages: 3,
        filters: { status: "FAILED" },
        requestId: "req-integration-test",
      }),
    });
  });

  test("retryIntegrationEvent rejects malformed event id before persistence", async () => {
    const req = {
      userId: "admin-1",
      requestId: "req-integration-test",
      params: { id: "bad-id" },
    };
    const res = createRes();

    await retryIntegrationEvent(req, res);

    expect(integrationFindByPkMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      requestId: "req-integration-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "id" }),
      ]),
    }));
  });

  test("retryIntegrationEvent returns operator metadata for successful requeue", async () => {
    const req = {
      userId: "admin-1",
      requestId: "req-integration-test",
      params: { id: "12" },
    };
    const res = createRes();

    integrationFindByPkMock.mockResolvedValue({
      id: 12,
      status: "FAILED",
      entity_type: "employee",
      entity_id: "EMP001",
      action: "UPDATE",
    });
    integrationUpdateMock.mockResolvedValue([1]);

    await retryIntegrationEvent(req, res);

    expect(integrationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING",
        last_operator_action: "retry-event",
        last_operator_actor_id: "admin-1",
        last_operator_request_id: "req-integration-test",
        last_operator_at: expect.any(Date),
      }),
      { where: { id: 12 } },
    );
    expect(integrationAuditCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      integration_event_id: 12,
      operator_action: "retry-event",
      operator_actor_id: "admin-1",
      operator_request_id: "req-integration-test",
      source_status: "FAILED",
      target_status: "PENDING",
    }));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Event queued for retry",
      data: {
        id: 12,
        previousStatus: "FAILED",
        entityType: "employee",
        entityId: "EMP001",
        action: "UPDATE",
      },
      meta: expect.objectContaining({
        dataset: "integrationRetry",
        actorId: "admin-1",
        filters: { id: 12 },
        requestId: "req-integration-test",
      }),
    });
  });

  test("retryDeadIntegrationEvents returns count with operator metadata", async () => {
    const req = { userId: "admin-1", requestId: "req-integration-test" };
    const res = createRes();

    integrationFindAllMock.mockResolvedValue([
      { id: 42, status: "DEAD", entity_type: "employee", entity_id: "EMP042", action: "DELETE" },
    ]);
    integrationUpdateMock.mockResolvedValue([4]);

    await retryDeadIntegrationEvents(req, res);

    expect(integrationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING",
        last_operator_action: "retry-dead",
        last_operator_actor_id: "admin-1",
        last_operator_request_id: "req-integration-test",
        last_operator_at: expect.any(Date),
      }),
      { where: { status: "DEAD" } },
    );
    expect(integrationAuditBulkCreateMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        integration_event_id: expect.any(Number),
        operator_action: "retry-dead",
        operator_actor_id: "admin-1",
        operator_request_id: "req-integration-test",
        target_status: "PENDING",
      }),
    ]));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Re-queued 4 dead events",
      data: { count: 4 },
      meta: expect.objectContaining({
        dataset: "integrationRetryDead",
        actorId: "admin-1",
        filters: { status: "DEAD" },
        requestId: "req-integration-test",
      }),
    });
  });

  test("recoverStuckIntegrationEvents returns recovery summary with operator metadata", async () => {
    const req = { userId: "admin-1", requestId: "req-integration-test" };
    const res = createRes();

    recoverStuckProcessingIntegrationEventsMock.mockResolvedValue({
      count: 3,
      recoveredIds: [11, 12, 13],
      timeoutMinutes: 15,
    });

    await recoverStuckIntegrationEvents(req, res);

    expect(recoverStuckProcessingIntegrationEventsMock).toHaveBeenCalledWith({
      actorId: "admin-1",
      requestId: "req-integration-test",
      operatorAction: "recover-stuck",
    });

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Recovered 3 stale PROCESSING events",
      data: {
        count: 3,
        recoveredIds: [11, 12, 13],
        timeoutMinutes: 15,
      },
      meta: expect.objectContaining({
        dataset: "integrationRecoverStuck",
        actorId: "admin-1",
        filters: { status: "PROCESSING" },
        requestId: "req-integration-test",
      }),
    });
  });

  test("replayIntegrationEvents rejects conflicting replay filters", async () => {
    const req = {
      userId: "admin-1",
      requestId: "req-integration-test",
      body: {
        fromDate: "2026-04-01T00:00:00.000Z",
        fromDays: 7,
      },
    };
    const res = createRes();

    await replayIntegrationEvents(req, res);

    expect(integrationUpdateMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      requestId: "req-integration-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "body" }),
      ]),
    }));
  });

  test("replayIntegrationEvents returns normalized replay filter metadata", async () => {
    const req = {
      userId: "admin-1",
      requestId: "req-integration-test",
      body: {
        status: "FAILED",
        entityType: "employee",
        entityId: "EMP001",
        fromDays: 7,
      },
    };
    const res = createRes();

    integrationFindAllMock.mockResolvedValue([
      { id: 77, status: "FAILED", entity_type: "employee", entity_id: "EMP001", action: "UPDATE" },
    ]);
    integrationUpdateMock.mockResolvedValue([5]);

    await replayIntegrationEvents(req, res);

    expect(integrationUpdateMock).toHaveBeenCalledTimes(1);
    expect(integrationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING",
        last_operator_action: "replay-events",
        last_operator_actor_id: "admin-1",
        last_operator_request_id: "req-integration-test",
        last_operator_at: expect.any(Date),
      }),
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.any(Object),
          entity_type: "employee",
          entity_id: "EMP001",
        }),
      }),
    );
    expect(integrationAuditBulkCreateMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        operator_action: "replay-events",
        operator_actor_id: "admin-1",
        operator_request_id: "req-integration-test",
        target_status: "PENDING",
      }),
    ]));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Re-queued 5 events",
      data: { count: 5 },
      meta: expect.objectContaining({
        dataset: "integrationReplay",
        actorId: "admin-1",
        requestId: "req-integration-test",
        filters: expect.objectContaining({
          statuses: ["FAILED"],
          entityType: "employee",
          entityId: "EMP001",
        }),
      }),
    }));
  });
});
