import { jest } from "@jest/globals";

const syncLogFindAllMock = jest.fn();
const syncLogCountMock = jest.fn();
const syncLogFindOneMock = jest.fn();
const retryFailedSyncsMock = jest.fn();

jest.unstable_mockModule("../models/sql/index.js", () => ({
  SyncLog: {
    findAll: syncLogFindAllMock,
    count: syncLogCountMock,
    findOne: syncLogFindOneMock,
    sequelize: {
      fn: jest.fn((name, value) => ({ name, value })),
      col: jest.fn((name) => name),
    },
  },
}));

jest.unstable_mockModule("../services/syncService.js", () => ({
  getSyncStatus: jest.fn((entityType, entityId) => syncLogFindOneMock(entityType, entityId)),
  retryFailedSyncs: retryFailedSyncsMock,
}));

const {
  getSyncEntityStatus,
  getSyncOverview,
  listSyncLogs,
  retrySyncLogs,
} = await import("../controllers/sync.controller.js");

const createRes = () => {
  const res = {};
  res.locals = { requestId: "req-sync-test-1" };
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

describe("sync controller behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getSyncOverview returns canonical sync summary envelope", async () => {
    syncLogFindAllMock.mockResolvedValue([
      { status: "SUCCESS", count: "5" },
      { status: "FAILED", count: "2" },
    ]);
    const req = { userId: "admin-1" };
    const res = createRes();

    await getSyncOverview(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        counts: {
          PENDING: 0,
          SUCCESS: 5,
          FAILED: 2,
        },
        total: 7,
        healthScore: 71,
      },
      meta: expect.objectContaining({
        dataset: "syncOverview",
        actorId: "admin-1",
        requestId: "req-sync-test-1",
      }),
    });
  });

  test("listSyncLogs rejects invalid query params with 422", async () => {
    const req = {
      query: {
        limit: "9999",
        status: "BROKEN",
      },
    };
    const res = createRes();

    await listSyncLogs(req, res);

    expect(syncLogCountMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Validation failed.",
      requestId: "req-sync-test-1",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "limit" }),
        expect.objectContaining({ field: "status" }),
      ]),
    }));
  });

  test("listSyncLogs returns correlation-aware filters and pagination metadata", async () => {
    syncLogCountMock.mockResolvedValue(1);
    syncLogFindAllMock.mockResolvedValue([
      {
        id: 12,
        entity_type: "employee",
        entity_id: "EMP120",
        action: "UPDATE",
        status: "FAILED",
        correlation_id: "req-sync-120",
      },
    ]);

    const req = {
      userId: "admin-1",
      query: {
        status: "FAILED",
        correlationId: "req-sync-120",
        page: "2",
        limit: "10",
      },
    };
    const res = createRes();

    await listSyncLogs(req, res);

    expect(syncLogCountMock).toHaveBeenCalledWith({
      where: {
        status: "FAILED",
        correlation_id: "req-sync-120",
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          entity_id: "EMP120",
          correlation_id: "req-sync-120",
        }),
      ],
      meta: expect.objectContaining({
        dataset: "syncLogs",
        actorId: "admin-1",
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1,
        requestId: "req-sync-test-1",
        filters: {
          status: "FAILED",
          action: null,
          entityType: null,
          entityId: null,
          correlationId: "req-sync-120",
        },
      }),
    });
  });

  test("retrySyncLogs returns operator metadata and preserves request correlation for fallback", async () => {
    retryFailedSyncsMock.mockResolvedValue({
      total: 3,
      uniqueEntities: 2,
      retried: 2,
      succeeded: 2,
      failed: 0,
      message: "Retry complete. Success: 2, Failed: 0",
    });

    const req = {
      userId: "admin-1",
      requestId: "req-retry-sync-1",
    };
    const res = createRes();

    await retrySyncLogs(req, res);

    expect(retryFailedSyncsMock).toHaveBeenCalledWith({
      fallbackCorrelationId: "req-retry-sync-1",
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        succeeded: 2,
      }),
      meta: expect.objectContaining({
        dataset: "syncRetry",
        actorId: "admin-1",
        requestId: "req-sync-test-1",
        filters: {
          status: "FAILED",
        },
      }),
    });
  });

  test("getSyncEntityStatus rejects malformed params with 422", async () => {
    const req = {
      params: {
        type: "",
        id: "",
      },
    };
    const res = createRes();

    await getSyncEntityStatus(req, res);

    expect(syncLogFindOneMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Validation failed.",
      requestId: "req-sync-test-1",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "type" }),
        expect.objectContaining({ field: "id" }),
      ]),
    }));
  });

  test("getSyncEntityStatus returns latest entity sync with found metadata", async () => {
    syncLogFindOneMock.mockResolvedValue({
      id: 90,
      entity_type: "employee",
      entity_id: "EMP090",
      status: "SUCCESS",
    });
    const req = {
      userId: "admin-1",
      params: {
        type: "employee",
        id: "EMP090",
      },
    };
    const res = createRes();

    await getSyncEntityStatus(req, res);

    expect(syncLogFindOneMock).toHaveBeenCalledWith("employee", "EMP090");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        entity_id: "EMP090",
      }),
      meta: expect.objectContaining({
        dataset: "syncEntityStatus",
        actorId: "admin-1",
        found: true,
        requestId: "req-sync-test-1",
        filters: {
          entityType: "employee",
          entityId: "EMP090",
        },
      }),
    });
  });
});
