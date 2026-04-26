import { jest } from "@jest/globals";

const employeeFindOneMock = jest.fn();
const integrationFindAllMock = jest.fn();
const payRateFindAllMock = jest.fn();
const syncLogFindAllMock = jest.fn();

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: {
    findOne: employeeFindOneMock,
  },
}));

jest.unstable_mockModule("../repositories/integrationStore.js", () => ({
  IntegrationEventStore: {
    findAll: integrationFindAllMock,
  },
}));

jest.unstable_mockModule("../models/sql/index.js", () => ({
  PayRate: {
    findAll: payRateFindAllMock,
  },
  SyncLog: {
    findAll: syncLogFindAllMock,
  },
}));

jest.unstable_mockModule("../config.js", () => ({
  OUTBOX_ENABLED: true,
}));

const { buildEmployeeSyncEvidenceSnapshot } = await import("../services/employeeSyncEvidenceService.js");

describe("employee sync evidence service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    employeeFindOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    integrationFindAllMock.mockResolvedValue([]);
    payRateFindAllMock.mockResolvedValue([]);
    syncLogFindAllMock.mockResolvedValue([]);
  });

  test("returns null when no source, queue, or payroll evidence exists", async () => {
    const snapshot = await buildEmployeeSyncEvidenceSnapshot("EMP404");

    expect(snapshot).toBeNull();
  });

  test("marks a fully delivered employee update as healthy", async () => {
    employeeFindOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        employeeId: "EMP001",
        payRate: 118204,
        updatedAt: "2026-04-22T08:00:00.000Z",
      }),
    });
    integrationFindAllMock.mockResolvedValue([
      {
        id: 91,
        status: "SUCCESS",
        action: "UPDATE",
        attempts: 1,
        correlation_id: "req-healthy-1",
        updatedAt: "2026-04-22T08:00:05.000Z",
      },
    ]);
    payRateFindAllMock.mockResolvedValue([
      {
        employee_id: "EMP001",
        pay_rate: 118204,
        pay_type: "SALARY",
        is_active: true,
        effective_date: "2026-04-22T08:00:06.000Z",
        updatedAt: "2026-04-22T08:00:06.000Z",
      },
    ]);
    syncLogFindAllMock.mockResolvedValue([
      {
        status: "SUCCESS",
        action: "UPDATE",
        correlation_id: "req-healthy-1",
        updatedAt: "2026-04-22T08:00:07.000Z",
      },
    ]);

    const snapshot = await buildEmployeeSyncEvidenceSnapshot("EMP001");

    expect(snapshot).toEqual(expect.objectContaining({
      employeeId: "EMP001",
      overall: expect.objectContaining({
        status: "healthy",
        label: "Payroll synced",
      }),
      source: expect.objectContaining({
        status: "PRESENT",
        payRate: 118204,
      }),
      queue: expect.objectContaining({
        status: "SUCCESS",
        label: "Delivered",
        correlationId: "req-healthy-1",
      }),
      payroll: expect.objectContaining({
        status: "CURRENT",
        label: "Payroll current",
        parity: "MATCH",
        payRate: 118204,
      }),
    }));
  });

  test("marks pending delivery when queue is still processing", async () => {
    employeeFindOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        employeeId: "EMP002",
        payRate: 81000,
        updatedAt: "2026-04-22T09:00:00.000Z",
      }),
    });
    integrationFindAllMock.mockResolvedValue([
      {
        id: 92,
        status: "PENDING",
        action: "UPDATE",
        attempts: 0,
        correlation_id: "req-pending-1",
        updatedAt: "2026-04-22T09:00:02.000Z",
      },
    ]);

    const snapshot = await buildEmployeeSyncEvidenceSnapshot("EMP002");

    expect(snapshot).toEqual(expect.objectContaining({
      overall: expect.objectContaining({
        status: "pending",
        label: "Sync in flight",
      }),
      queue: expect.objectContaining({
        status: "PENDING",
        label: "Queued",
      }),
      payroll: expect.objectContaining({
        status: "MISSING",
        label: "Payroll pending",
      }),
    }));
  });

  test("marks attention when payroll drifts from source", async () => {
    employeeFindOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        employeeId: "EMP003",
        payRate: 120000,
        updatedAt: "2026-04-22T10:00:00.000Z",
      }),
    });
    integrationFindAllMock.mockResolvedValue([
      {
        id: 93,
        status: "SUCCESS",
        action: "UPDATE",
        attempts: 1,
        correlation_id: "req-drift-1",
        updatedAt: "2026-04-22T10:00:01.000Z",
      },
    ]);
    payRateFindAllMock.mockResolvedValue([
      {
        employee_id: "EMP003",
        pay_rate: 118000,
        pay_type: "SALARY",
        is_active: true,
        effective_date: "2026-04-22T10:00:02.000Z",
        updatedAt: "2026-04-22T10:00:02.000Z",
      },
    ]);
    syncLogFindAllMock.mockResolvedValue([
      {
        status: "SUCCESS",
        action: "UPDATE",
        correlation_id: "req-drift-1",
        updatedAt: "2026-04-22T10:00:03.000Z",
      },
    ]);

    const snapshot = await buildEmployeeSyncEvidenceSnapshot("EMP003");

    expect(snapshot).toEqual(expect.objectContaining({
      overall: expect.objectContaining({
        status: "attention",
        label: "Needs attention",
      }),
      payroll: expect.objectContaining({
        status: "DRIFT",
        label: "Payroll drift",
        parity: "MISMATCH",
        payRate: 118000,
      }),
    }));
  });
});
