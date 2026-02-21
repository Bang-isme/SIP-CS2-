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
        status: "FAILED",
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
    const result = await retryFailedSyncs();

    expect(result.succeeded).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      { status: "SUCCESS" },
      expect.objectContaining({
        where: expect.objectContaining({
          status: "FAILED",
        }),
      }),
    );
  });
});
