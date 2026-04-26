import { jest } from "@jest/globals";
import { INTERNAL_SERVICE_SECRET } from "../config.js";

const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();

jest.unstable_mockModule("../utils/logger.js", () => ({
  default: {
    info: loggerInfoMock,
    warn: loggerWarnMock,
  },
}));

const { default: PayrollAdapter } = await import("../adapters/payroll.adapter.js");

describe("PayrollAdapter correlation tracing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test("forwards correlation metadata to the payroll internal API and logs success", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: jest.fn().mockResolvedValue(JSON.stringify({
        success: true,
        message: "Synced to Payroll",
      })),
    });

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
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/sync"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-internal-service-secret": INTERNAL_SERVICE_SECRET,
          "x-internal-service-name": "sa-service",
        }),
        body: expect.any(String),
      }),
    );
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      action: "CREATE",
      employeeData: {
        employeeId: "EMP500",
        payRate: 55,
        payType: "SALARY",
      },
      syncContext: {
        correlationId: "req-payroll-1",
        source: "OUTBOX_WORKER",
        integrationEventId: 77,
      },
    });
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

  test("returns a failed sync result when the payroll service rejects the mutation", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      text: jest.fn().mockResolvedValue(JSON.stringify({
        success: false,
        message: "mysql unavailable",
      })),
    });

    const adapter = new PayrollAdapter();
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
