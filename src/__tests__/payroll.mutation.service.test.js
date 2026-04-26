import { jest } from "@jest/globals";

const transaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
};
const transactionMock = jest.fn();
const payRateFindOneMock = jest.fn();
const payRateCreateMock = jest.fn();
const payRateUpdateMock = jest.fn();
const syncLogFindOrCreateMock = jest.fn();
const syncLogUpdateMock = jest.fn();
const syncLogUpsertMock = jest.fn();
const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();

jest.unstable_mockModule("../models/sql/index.js", () => ({
  PayRate: {
    findOne: payRateFindOneMock,
    create: payRateCreateMock,
    update: payRateUpdateMock,
  },
  SyncLog: {
    findOrCreate: syncLogFindOrCreateMock,
    update: syncLogUpdateMock,
    upsert: syncLogUpsertMock,
  },
  sequelize: {
    transaction: transactionMock,
  },
}));

jest.unstable_mockModule("../utils/logger.js", () => ({
  default: {
    info: loggerInfoMock,
    warn: loggerWarnMock,
  },
}));

const { applyPayrollMutation } = await import("../services/payrollMutationService.js");

describe("PayrollMutationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.commit.mockResolvedValue(undefined);
    transaction.rollback.mockResolvedValue(undefined);
    transactionMock.mockResolvedValue(transaction);
    payRateFindOneMock.mockResolvedValue(null);
    payRateCreateMock.mockResolvedValue({});
    payRateUpdateMock.mockResolvedValue([1]);
    syncLogFindOrCreateMock.mockResolvedValue([{ id: 901, status: "PENDING" }, true]);
    syncLogUpdateMock.mockResolvedValue([1]);
    syncLogUpsertMock.mockResolvedValue([{}, true]);
  });

  test("writes correlation_id and completed_at on successful sync logs", async () => {
    const result = await applyPayrollMutation({
      employeeData: {
        employeeId: "EMP500",
        payRate: 55,
        payType: "SALARY",
      },
      action: "CREATE",
      syncContext: {
        correlationId: "req-payroll-1",
        source: "OUTBOX_WORKER",
        integrationEventId: 77,
      },
    });

    expect(result).toEqual({
      success: true,
      message: "Payroll synced",
      data: {
        employeeId: "EMP500",
        action: "CREATE",
        correlationId: "req-payroll-1",
        idempotent: false,
        deduplicated: false,
      },
      meta: {
        detail: "Payroll write applied",
      },
    });
    expect(syncLogFindOrCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        entity_id: "EMP500",
        action: "CREATE",
        correlation_id: "req-payroll-1",
      }),
      defaults: expect.objectContaining({
        entity_id: "EMP500",
        status: "PENDING",
        correlation_id: "req-payroll-1",
      }),
      transaction,
    }));
    expect(syncLogUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: "SUCCESS",
      error_message: null,
      completed_at: expect.any(Date),
    }), expect.objectContaining({
      where: expect.objectContaining({
        entity_id: "EMP500",
        action: "CREATE",
        correlation_id: "req-payroll-1",
      }),
      transaction,
    }));
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "PayrollMutationService",
      "Payroll mutation applied",
      expect.objectContaining({
        employeeId: "EMP500",
        correlationId: "req-payroll-1",
        source: "OUTBOX_WORKER",
        integrationEventId: 77,
      }),
    );
  });

  test("skips duplicate delivery when the same correlationId already succeeded", async () => {
    syncLogFindOrCreateMock.mockResolvedValue([{
      id: 91,
      status: "SUCCESS",
      correlation_id: "req-payroll-dup-1",
    }, false]);

    const result = await applyPayrollMutation({
      employeeData: {
        employeeId: "EMP777",
        payRate: 90,
        payType: "SALARY",
      },
      action: "UPDATE",
      syncContext: {
        correlationId: "req-payroll-dup-1",
        source: "OUTBOX_WORKER",
      },
    });

    expect(result).toEqual({
      success: true,
      message: "Payroll synced",
      data: {
        employeeId: "EMP777",
        action: "UPDATE",
        correlationId: "req-payroll-dup-1",
        idempotent: true,
        deduplicated: true,
      },
      meta: {
        detail: "Duplicate delivery ignored",
      },
    });
    expect(transaction.rollback).toHaveBeenCalled();
    expect(payRateUpdateMock).not.toHaveBeenCalled();
    expect(payRateCreateMock).not.toHaveBeenCalled();
    expect(syncLogUpdateMock).not.toHaveBeenCalled();
  });

  test("does not create pay-rate history drift when update payload matches current active payroll state", async () => {
    payRateFindOneMock.mockResolvedValue({
      id: 15,
      employee_id: "EMP888",
      pay_rate: "55.00",
      pay_type: "SALARY",
      is_active: true,
    });

    const result = await applyPayrollMutation({
      employeeData: {
        employeeId: "EMP888",
        payRate: 55,
        payType: "SALARY",
      },
      action: "UPDATE",
      syncContext: {
        correlationId: "req-payroll-stable-1",
        source: "OUTBOX_WORKER",
      },
    });

    expect(result).toEqual({
      success: true,
      message: "Payroll synced",
      data: {
        employeeId: "EMP888",
        action: "UPDATE",
        correlationId: "req-payroll-stable-1",
        idempotent: true,
        deduplicated: false,
      },
      meta: {
        detail: "No payroll change needed",
      },
    });
    expect(payRateUpdateMock).not.toHaveBeenCalled();
    expect(payRateCreateMock).not.toHaveBeenCalled();
    expect(syncLogUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: "SUCCESS",
      error_message: null,
      completed_at: expect.any(Date),
    }), expect.objectContaining({
      where: expect.objectContaining({
        entity_id: "EMP888",
        action: "UPDATE",
        correlation_id: "req-payroll-stable-1",
      }),
      transaction,
    }));
  });

  test("does not append another terminated row when delete is delivered after the employee is already terminated", async () => {
    payRateFindOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 44,
        employee_id: "EMP999",
        pay_rate: "42.00",
        pay_type: "TERMINATED",
        is_active: false,
      });

    const result = await applyPayrollMutation({
      employeeData: {
        employeeId: "EMP999",
      },
      action: "DELETE",
      syncContext: {
        correlationId: "req-payroll-term-1",
        source: "OUTBOX_WORKER",
      },
    });

    expect(result).toEqual({
      success: true,
      message: "Payroll synced",
      data: {
        employeeId: "EMP999",
        action: "DELETE",
        correlationId: "req-payroll-term-1",
        idempotent: true,
        deduplicated: false,
      },
      meta: {
        detail: "Employee already terminated",
      },
    });
    expect(payRateUpdateMock).not.toHaveBeenCalled();
    expect(payRateCreateMock).not.toHaveBeenCalled();
    expect(syncLogUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: "SUCCESS",
      error_message: null,
      completed_at: expect.any(Date),
    }), expect.objectContaining({
      where: expect.objectContaining({
        entity_id: "EMP999",
        action: "DELETE",
        correlation_id: "req-payroll-term-1",
      }),
      transaction,
    }));
  });

  test("writes correlation_id on failed sync logs as well", async () => {
    payRateCreateMock.mockRejectedValue(new Error("mysql unavailable"));

    const result = await applyPayrollMutation({
      employeeData: {
        employeeId: "EMP501",
        payRate: 48,
      },
      action: "CREATE",
      syncContext: {
        correlationId: "req-payroll-fail-1",
        source: "SYNC_RETRY_MANUAL",
      },
    });

    expect(result).toEqual({
      success: false,
      message: "Sync failed",
      data: {
        employeeId: "EMP501",
        action: "CREATE",
        correlationId: "req-payroll-fail-1",
      },
      meta: {
        detail: "mysql unavailable",
      },
    });
    expect(transaction.rollback).toHaveBeenCalled();
    expect(syncLogUpsertMock).toHaveBeenCalledWith(expect.objectContaining({
      entity_id: "EMP501",
      status: "FAILED",
      error_message: "mysql unavailable",
      correlation_id: "req-payroll-fail-1",
      completed_at: expect.any(Date),
    }));
    expect(loggerWarnMock).toHaveBeenCalledWith(
      "PayrollMutationService",
      "Payroll mutation failed",
      expect.objectContaining({
        employeeId: "EMP501",
        correlationId: "req-payroll-fail-1",
        source: "SYNC_RETRY_MANUAL",
        errorMessage: "mysql unavailable",
      }),
    );
  });

  test("reuses the same sync_log row when a previously failed correlationId is retried", async () => {
    syncLogFindOrCreateMock.mockResolvedValue([{ id: 905, status: "FAILED" }, false]);

    await applyPayrollMutation({
      employeeData: {
        employeeId: "EMP502",
        payRate: 61,
      },
      action: "CREATE",
      syncContext: {
        correlationId: "req-payroll-retry-1",
      },
    });

    expect(syncLogUpdateMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      status: "PENDING",
      error_message: null,
      completed_at: null,
    }), expect.objectContaining({
      where: { id: 905 },
      transaction,
    }));
    expect(syncLogUpdateMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: "SUCCESS",
      error_message: null,
      completed_at: expect.any(Date),
    }), expect.objectContaining({
      where: expect.objectContaining({
        entity_id: "EMP502",
        action: "CREATE",
        correlation_id: "req-payroll-retry-1",
      }),
      transaction,
    }));
  });
});
