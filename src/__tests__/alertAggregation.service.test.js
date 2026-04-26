import { jest } from "@jest/globals";

const alertFindMock = jest.fn();
const employeeCountDocumentsMock = jest.fn();
const employeeFindMock = jest.fn();
const alertEmployeeSyncMock = jest.fn();
const alertEmployeeDestroyMock = jest.fn();
const alertEmployeeBulkCreateMock = jest.fn();
const alertsSummaryDestroyMock = jest.fn();
const alertsSummaryBulkCreateMock = jest.fn();
const sequelizeTransactionMock = jest.fn();

jest.unstable_mockModule("../models/Alert.js", () => ({
  default: {
    find: alertFindMock,
  },
}));

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: {
    countDocuments: employeeCountDocumentsMock,
    find: employeeFindMock,
  },
}));

jest.unstable_mockModule("../models/sql/index.js", () => ({
  AlertEmployee: {
    sync: alertEmployeeSyncMock,
    destroy: alertEmployeeDestroyMock,
    bulkCreate: alertEmployeeBulkCreateMock,
  },
  AlertsSummary: {
    destroy: alertsSummaryDestroyMock,
    bulkCreate: alertsSummaryBulkCreateMock,
  },
  BenefitPlan: {},
  EmployeeBenefit: {
    findAll: jest.fn(),
  },
  sequelize: {
    transaction: sequelizeTransactionMock,
  },
}));

jest.unstable_mockModule("../utils/benefitsPayrollImpact.js", () => ({
  buildBenefitsChangeMatchesFromRows: jest.fn(() => []),
}));

const { refreshAlertAggregates } = await import("../services/alertAggregationService.js");

const createCursorChain = (rows) => ({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnValue({
      cursor: jest.fn(() => (async function* generator() {
        for (const row of rows) {
          yield row;
        }
      })()),
    }),
  }),
});

describe("alert aggregation service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const transactionToken = { id: "tx-alert-1" };
    sequelizeTransactionMock.mockImplementation(async (callback) => callback(transactionToken));
    alertEmployeeSyncMock.mockResolvedValue(undefined);
    alertEmployeeDestroyMock.mockResolvedValue(undefined);
    alertsSummaryDestroyMock.mockResolvedValue(undefined);
    alertEmployeeBulkCreateMock.mockResolvedValue(undefined);
    alertsSummaryBulkCreateMock.mockResolvedValue(undefined);
  });

  it("rebuilds alert aggregates inside a single SQL transaction", async () => {
    alertFindMock.mockReturnValue({
      lean: jest.fn(async () => [{ type: "vacation", threshold: 20 }]),
    });
    employeeCountDocumentsMock.mockResolvedValue(1);
    employeeFindMock.mockReturnValue(createCursorChain([
      {
        employeeId: "EMP001",
        firstName: "Amy",
        lastName: "Adams",
        vacationDays: 26,
      },
    ]));

    const result = await refreshAlertAggregates();

    expect(sequelizeTransactionMock).toHaveBeenCalledTimes(1);
    expect(alertsSummaryDestroyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
      transaction: expect.any(Object),
    }));
    expect(alertEmployeeDestroyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
      transaction: expect.any(Object),
    }));
    expect(alertEmployeeBulkCreateMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          alert_type: "vacation",
          employee_id: "EMP001",
        }),
      ]),
      expect.objectContaining({ transaction: expect.any(Object) }),
    );
    expect(alertsSummaryBulkCreateMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          alert_type: "vacation",
          employee_count: 1,
        }),
      ]),
      expect.objectContaining({ transaction: expect.any(Object) }),
    );
    expect(result).toEqual({
      processedAlerts: 1,
      summaryRows: 1,
      totalMatchedEmployees: 1,
    });
  });

  it("rethrows when a transactional alert batch write fails", async () => {
    alertFindMock.mockReturnValue({
      lean: jest.fn(async () => [{ type: "vacation", threshold: 20 }]),
    });
    employeeCountDocumentsMock.mockResolvedValue(1);
    employeeFindMock.mockReturnValue(createCursorChain([
      {
        employeeId: "EMP001",
        firstName: "Amy",
        lastName: "Adams",
        vacationDays: 26,
      },
    ]));
    alertEmployeeBulkCreateMock.mockRejectedValue(new Error("bulk insert failed"));

    await expect(refreshAlertAggregates()).rejects.toThrow("bulk insert failed");
    expect(sequelizeTransactionMock).toHaveBeenCalledTimes(1);
  });
});
