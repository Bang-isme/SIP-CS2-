import { jest } from "@jest/globals";

const transaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
};
const transactionMock = jest.fn();
const payRateFindOneMock = jest.fn();
const payRateCreateMock = jest.fn();
const payRateUpdateMock = jest.fn();
const syncLogCreateMock = jest.fn();
const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();

jest.unstable_mockModule("../models/sql/index.js", () => ({
  PayRate: {
    findOne: payRateFindOneMock,
    create: payRateCreateMock,
    update: payRateUpdateMock,
  },
  SyncLog: {
    create: syncLogCreateMock,
  },
  sequelize: {
    transaction: transactionMock,
    authenticate: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/logger.js", () => ({
  default: {
    info: loggerInfoMock,
    warn: loggerWarnMock,
  },
}));

const { default: PayrollAdapter } = await import("../adapters/payroll.adapter.js");

describe("PayrollAdapter correlation tracing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.commit.mockResolvedValue(undefined);
    transaction.rollback.mockResolvedValue(undefined);
    transactionMock.mockResolvedValue(transaction);
    payRateFindOneMock.mockResolvedValue(null);
    payRateCreateMock.mockResolvedValue({});
    payRateUpdateMock.mockResolvedValue([1]);
    syncLogCreateMock.mockResolvedValue({});
  });

  test("writes correlation_id and completed_at on successful sync logs", async () => {
    const adapter = new PayrollAdapter();

    const result = await adapter.sync(
      {
        employeeId: "EMP500",
        payRate: 55,
        payType: "SALARY",
      },
      "CREATE",
      {
        correlationId: "req-payroll-1",
        source: "OUTBOX_WORKER",
        integrationEventId: 77,
      },
    );

    expect(result).toEqual({
      success: true,
      message: "Synced to Payroll",
    });
    expect(syncLogCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      entity_id: "EMP500",
      status: "SUCCESS",
      correlation_id: "req-payroll-1",
      completed_at: expect.any(Date),
    }));
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "PayrollAdapter",
      "Employee synced to payroll",
      expect.objectContaining({
        employeeId: "EMP500",
        correlationId: "req-payroll-1",
        source: "OUTBOX_WORKER",
        integrationEventId: 77,
      }),
    );
  });

  test("writes correlation_id on failed sync logs as well", async () => {
    const adapter = new PayrollAdapter();
    payRateCreateMock.mockRejectedValue(new Error("mysql unavailable"));

    const result = await adapter.sync(
      {
        employeeId: "EMP501",
        payRate: 48,
      },
      "CREATE",
      {
        correlationId: "req-payroll-fail-1",
        source: "SYNC_RETRY_MANUAL",
      },
    );

    expect(result).toEqual({
      success: false,
      message: "mysql unavailable",
    });
    expect(transaction.rollback).toHaveBeenCalled();
    expect(syncLogCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      entity_id: "EMP501",
      status: "FAILED",
      error_message: "mysql unavailable",
      correlation_id: "req-payroll-fail-1",
      completed_at: expect.any(Date),
    }));
    expect(loggerWarnMock).toHaveBeenCalledWith(
      "PayrollAdapter",
      "Payroll sync failed",
      expect.objectContaining({
        employeeId: "EMP501",
        correlationId: "req-payroll-fail-1",
        source: "SYNC_RETRY_MANUAL",
        errorMessage: "mysql unavailable",
      }),
    );
  });
});
