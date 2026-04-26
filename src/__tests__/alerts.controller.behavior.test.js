import { jest } from "@jest/globals";

const alertSaveMock = jest.fn();
const alertFindMock = jest.fn();
const alertFindByIdMock = jest.fn();
const alertFindByIdAndUpdateMock = jest.fn();
const alertFindByIdAndDeleteMock = jest.fn();
const alertEmployeeCountMock = jest.fn();
const alertEmployeeFindAllMock = jest.fn();
const alertsSummaryFindAllMock = jest.fn();
const alertsSummaryFindOneMock = jest.fn();
const sqlQueryMock = jest.fn();
const cacheGetMock = jest.fn();
const cacheSetMock = jest.fn();
const cacheClearMock = jest.fn();
const refreshAlertAggregatesMock = jest.fn();

let lastAlertPayload = null;

class AlertMock {
  constructor(payload) {
    lastAlertPayload = payload;
    Object.assign(this, payload);
    this.save = alertSaveMock;
  }

  static find(...args) {
    return alertFindMock(...args);
  }

  static findById(...args) {
    return alertFindByIdMock(...args);
  }

  static findByIdAndUpdate(...args) {
    return alertFindByIdAndUpdateMock(...args);
  }

  static findByIdAndDelete(...args) {
    return alertFindByIdAndDeleteMock(...args);
  }
}

jest.unstable_mockModule("../models/Alert.js", () => ({
  default: AlertMock,
}));

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: {},
}));

jest.unstable_mockModule("../models/sql/index.js", () => ({
  AlertsSummary: {
    findAll: alertsSummaryFindAllMock,
    findOne: alertsSummaryFindOneMock,
  },
  AlertEmployee: {
    count: alertEmployeeCountMock,
    findAll: alertEmployeeFindAllMock,
    getTableName: jest.fn(() => "alert_employees"),
  },
  EmployeeBenefit: {},
  sequelize: {
    query: sqlQueryMock,
  },
}));

jest.unstable_mockModule("../utils/cache.js", () => ({
  default: {
    get: cacheGetMock,
    set: cacheSetMock,
    clear: cacheClearMock,
  },
}));

jest.unstable_mockModule("../services/alertAggregationService.js", () => ({
  refreshAlertAggregates: refreshAlertAggregatesMock,
}));

const {
  acknowledgeAlert,
  createAlert,
  getAlertEmployees,
  getTriggeredAlerts,
  updateAlert,
} = await import("../controllers/alerts.controller.js");

const createRes = () => {
  const res = {};
  res.locals = { requestId: "req-alerts-test" };
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

describe("alerts controller behavior", () => {
  const validAlertId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();
    lastAlertPayload = null;
    refreshAlertAggregatesMock.mockResolvedValue({ processedAlerts: 1 });
  });

  test("createAlert preserves inactive state from request payload", async () => {
    const req = {
      userId: "admin-1",
      body: {
        name: "Vacation Watch",
        type: "vacation",
        threshold: 25,
        description: "Keep this disabled for now",
        isActive: false,
      },
    };
    const res = createRes();

    await createAlert(req, res);

    expect(lastAlertPayload).toBeTruthy();
    expect(lastAlertPayload.isActive).toBe(false);
    expect(refreshAlertAggregatesMock).toHaveBeenCalledTimes(1);
    expect(cacheClearMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("getTriggeredAlerts returns empty when no active alert configs remain", async () => {
    const req = {};
    const res = createRes();

    alertFindMock.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    await getTriggeredAlerts(req, res);

    expect(cacheGetMock).not.toHaveBeenCalled();
    expect(alertsSummaryFindAllMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
      meta: expect.objectContaining({
        dataset: "alerts",
        totalAlerts: 0,
        triggeredCount: 0,
        activeTypes: [],
        requestId: "req-alerts-test",
      }),
    });
  });

  test("updateAlert maps duplicate-active conflict to 409", async () => {
    const req = {
      params: { id: validAlertId },
      body: { isActive: true },
    };
    const res = createRes();

    alertFindByIdMock.mockResolvedValue({
      _id: validAlertId,
      name: "Vacation Watch",
      type: "vacation",
      threshold: 20,
      description: "Keep ownership on this queue",
      isActive: false,
    });
    alertFindByIdAndUpdateMock.mockRejectedValue({
      code: "DUPLICATE_ACTIVE_TYPE",
      message: "Cannot activate duplicate alert type",
    });

    await updateAlert(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Cannot activate duplicate alert type",
      code: "ALERT_DUPLICATE_ACTIVE_TYPE",
      requestId: "req-alerts-test",
    });
  });

  test("createAlert rejects invalid alert payload before persistence", async () => {
    const req = {
      userId: "admin-1",
      body: {
        name: "",
        type: "vacation",
        threshold: -3,
      },
    };
    const res = createRes();

    await createAlert(req, res);

    expect(alertSaveMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Validation failed.",
      requestId: "req-alerts-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "threshold" }),
      ]),
    }));
  });

  test("acknowledgeAlert stores manager note against current summary snapshot", async () => {
    const req = {
      params: { id: validAlertId },
      userId: "moderator-1",
      body: { note: "Payroll team reviewing balance spike this morning." },
    };
    const res = createRes();

    const save = jest.fn().mockResolvedValue(undefined);
    alertFindByIdMock
      .mockResolvedValueOnce({
        _id: validAlertId,
        type: "vacation",
        isActive: true,
        save,
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: validAlertId,
            acknowledgedAt: "2026-04-02T01:00:00.000Z",
            acknowledgementNote: "Payroll team reviewing balance spike this morning.",
            acknowledgedCount: 8,
            acknowledgedSummaryAt: "2026-04-02T00:45:00.000Z",
            acknowledgedBy: {
              _id: "moderator-1",
              username: "opslead",
              email: "opslead@example.com",
            },
          }),
        }),
      });
    alertsSummaryFindOneMock.mockResolvedValue({
      alert_type: "vacation",
      employee_count: 8,
      computed_at: "2026-04-02T00:45:00.000Z",
    });

    await acknowledgeAlert(req, res);

    expect(save).toHaveBeenCalledTimes(1);
    expect(cacheClearMock).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        alertId: validAlertId,
        acknowledgement: expect.objectContaining({
          status: "current",
          note: "Payroll team reviewing balance spike this morning.",
          acknowledgedCount: 8,
          acknowledgedBy: expect.objectContaining({
            username: "opslead",
          }),
        }),
      },
    });
  });

  test("acknowledgeAlert rejects malformed alert id before hitting persistence", async () => {
    const req = {
      params: { id: "bad-id" },
      userId: "moderator-1",
      body: { note: "Owner assigned for follow-up." },
    };
    const res = createRes();

    await acknowledgeAlert(req, res);

    expect(alertFindByIdMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Validation failed.",
      requestId: "req-alerts-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "id" }),
      ]),
    }));
  });

  test("getAlertEmployees rejects unknown alert type", async () => {
    const req = {
      params: { type: "unknown" },
      query: {},
    };
    const res = createRes();

    await getAlertEmployees(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Validation failed.",
      requestId: "req-alerts-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "type" }),
      ]),
    }));
  });

  test("getAlertEmployees returns canonical data envelope while keeping legacy fields", async () => {
    const req = {
      params: { type: "benefits_change" },
      query: { page: "2", limit: "50", search: "Amy" },
    };
    const res = createRes();

    alertEmployeeCountMock.mockResolvedValue(1);
    alertEmployeeFindAllMock.mockResolvedValue([
      {
        employee_id: "EMP001",
        name: "Amy Adams",
        days_until: 2,
        extra_data: '{"p":"Premium Health"}',
      },
    ]);

    await getAlertEmployees(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      employees: [
        expect.objectContaining({
          employeeId: "EMP001",
          name: "Amy Adams",
        }),
      ],
      total: 1,
      page: 2,
      limit: 50,
      totalPages: 1,
      data: expect.objectContaining({
        employees: [
          expect.objectContaining({
            employeeId: "EMP001",
          }),
        ],
        meta: expect.objectContaining({
          alertType: "benefits_change",
          filters: expect.objectContaining({ search: "Amy" }),
          requestId: "req-alerts-test",
        }),
      }),
      meta: expect.objectContaining({
        alertType: "benefits_change",
        total: 1,
        requestId: "req-alerts-test",
      }),
    }));
  });
});
