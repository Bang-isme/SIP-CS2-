import { jest } from "@jest/globals";

const integrationFindAllMock = jest.fn();
const integrationUpdateMock = jest.fn();
const integrationCountMock = jest.fn();
const integrationAuditCreateMock = jest.fn();
const syncEmployeeToAllMock = jest.fn();

jest.unstable_mockModule("../models/sql/index.js", () => ({
  IntegrationEvent: {
    findAll: integrationFindAllMock,
    update: integrationUpdateMock,
    count: integrationCountMock,
    create: jest.fn(),
  },
  IntegrationEventAudit: {
    create: integrationAuditCreateMock,
    bulkCreate: jest.fn(),
    count: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.unstable_mockModule("../services/syncService.js", () => ({
  syncEmployeeToAll: syncEmployeeToAllMock,
}));

const {
  countStuckProcessingIntegrationEvents,
  processPendingIntegrationEvents,
  recoverStuckProcessingIntegrationEvents,
} = await import("../services/integrationEventService.js");

describe("integration event service recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    integrationAuditCreateMock.mockResolvedValue(undefined);
    syncEmployeeToAllMock.mockResolvedValue({ success: true });
  });

  test("countStuckProcessingIntegrationEvents scopes to stale PROCESSING rows", async () => {
    integrationCountMock.mockResolvedValue(4);

    const result = await countStuckProcessingIntegrationEvents({ now: new Date("2026-03-19T08:00:00.000Z") });

    expect(result).toBe(4);
    expect(integrationCountMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "PROCESSING",
        updatedAt: expect.any(Object),
      }),
    });
  });

  test("recoverStuckProcessingIntegrationEvents moves stale rows into FAILED or DEAD", async () => {
    const now = new Date("2026-03-19T08:00:00.000Z");

    integrationFindAllMock.mockResolvedValue([
      { id: 21, attempts: 0, last_error: null },
      { id: 22, attempts: 4, last_error: "prior sync issue" },
    ]);
    integrationUpdateMock
      .mockResolvedValueOnce([1])
      .mockResolvedValueOnce([1]);

    const result = await recoverStuckProcessingIntegrationEvents({ now });

    expect(result).toEqual({
      count: 2,
      recoveredIds: [21, 22],
      timeoutMinutes: 15,
    });
    expect(integrationUpdateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        status: "FAILED",
        attempts: 1,
        last_error: expect.stringContaining("Worker timeout after 15 minute(s) in PROCESSING"),
        next_run_at: expect.any(Date),
        processed_at: null,
      }),
      { where: { id: 21, status: "PROCESSING" } }
    );
    expect(integrationUpdateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: "DEAD",
        attempts: 5,
        last_error: expect.stringContaining("Previous: prior sync issue"),
        next_run_at: null,
        processed_at: null,
      }),
      { where: { id: 22, status: "PROCESSING" } }
    );
  });

  test("recoverStuckProcessingIntegrationEvents records operator audit fields when manually invoked", async () => {
    const now = new Date("2026-04-02T07:10:00.000Z");

    integrationFindAllMock.mockResolvedValue([
      { id: 31, attempts: 1, last_error: "timeout" },
    ]);
    integrationUpdateMock.mockResolvedValue([1]);

    await recoverStuckProcessingIntegrationEvents({
      now,
      operatorAction: "recover-stuck",
      actorId: "admin-1",
      requestId: "req-recover-1",
    });

    expect(integrationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        last_operator_action: "recover-stuck",
        last_operator_actor_id: "admin-1",
        last_operator_request_id: "req-recover-1",
        last_operator_at: now,
      }),
      { where: { id: 31, status: "PROCESSING" } }
    );
    expect(integrationAuditCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      integration_event_id: 31,
      operator_action: "recover-stuck",
      operator_actor_id: "admin-1",
      operator_request_id: "req-recover-1",
      source_status: "PROCESSING",
      target_status: "FAILED",
    }));
  });

  test("processPendingIntegrationEvents propagates correlation context to sync workers", async () => {
    integrationFindAllMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 41,
          entity_id: "EMP041",
          action: "UPDATE",
          payload: { employeeId: "EMP041", payRate: 88 },
          status: "PENDING",
          correlation_id: null,
          attempts: 0,
        },
      ]);
    integrationUpdateMock
      .mockResolvedValueOnce([1])
      .mockResolvedValueOnce([1]);

    await processPendingIntegrationEvents();

    const claimPatch = integrationUpdateMock.mock.calls[0][0];
    expect(claimPatch).toEqual(expect.objectContaining({
      status: "PROCESSING",
      correlation_id: expect.any(String),
    }));
    expect(syncEmployeeToAllMock).toHaveBeenCalledWith(
      "EMP041",
      "UPDATE",
      { employeeId: "EMP041", payRate: 88 },
      expect.objectContaining({
        correlationId: claimPatch.correlation_id,
        source: "OUTBOX_WORKER",
        integrationEventId: 41,
      }),
    );
  });
});
