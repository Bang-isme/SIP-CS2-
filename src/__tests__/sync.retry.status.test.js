import { jest } from "@jest/globals";

const mockFindAll = jest.fn();
const mockUpdate = jest.fn();
const mockEmployeeFindOne = jest.fn();
const mockAdapterSync = jest.fn();

jest.unstable_mockModule("../models/sql/index.js", () => ({
  SyncLog: {
    findAll: mockFindAll,
    update: mockUpdate,
    sequelize: {
      literal: jest.fn((value) => value),
    },
  },
}));

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: {
    findOne: mockEmployeeFindOne,
  },
}));

jest.unstable_mockModule("../registry/serviceRegistry.js", () => ({
  default: {
    getIntegrations: () => [
      {
        name: "MockAdapter",
        sync: mockAdapterSync,
      },
    ],
    initialize: jest.fn(),
    healthCheckAll: jest.fn(async () => []),
  },
}));

const { retryFailedSyncs } = await import("../services/syncService.js");

describe("Sync retry status contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue([
      {
        entity_id: "EMP001",
        action: "UPDATE",
        status: "FAILED",
        correlation_id: "req-original-1",
      },
    ]);
    mockEmployeeFindOne.mockResolvedValue({
      employeeId: "EMP001",
      toObject: () => ({ employeeId: "EMP001", payRate: 100 }),
    });
    mockAdapterSync.mockResolvedValue({ success: true });
    mockUpdate.mockResolvedValue([1]);
  });

  test("should transition FAILED logs to SUCCESS on successful retry", async () => {
    const result = await retryFailedSyncs({ fallbackCorrelationId: "req-manual-1" });

    expect(result.succeeded).toBe(1);
    expect(mockAdapterSync).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: "EMP001", payRate: 100 }),
      "UPDATE",
      expect.objectContaining({
        correlationId: "req-original-1",
        source: "SYNC_RETRY_MANUAL",
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      { status: "SUCCESS" },
      expect.objectContaining({
        where: expect.objectContaining({
          status: "FAILED",
        }),
      }),
    );
  });

  test("should replay DELETE retries without reloading a deleted employee", async () => {
    mockFindAll.mockResolvedValue([
      {
        entity_id: "EMP999",
        action: "DELETE",
        status: "FAILED",
        correlation_id: null,
      },
    ]);
    mockEmployeeFindOne.mockResolvedValue(null);

    const result = await retryFailedSyncs({ fallbackCorrelationId: "req-delete-1" });

    expect(result.succeeded).toBe(1);
    expect(mockEmployeeFindOne).not.toHaveBeenCalled();
    expect(mockAdapterSync).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: "EMP999" }),
      "DELETE",
      expect.objectContaining({
        correlationId: "req-delete-1",
        source: "SYNC_RETRY_MANUAL",
      }),
    );
  });
});
