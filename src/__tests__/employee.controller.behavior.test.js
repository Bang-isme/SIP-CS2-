import { jest } from "@jest/globals";

const employeeSaveMock = jest.fn();
const findByIdAndUpdateMock = jest.fn();
const findByIdAndDeleteMock = jest.fn();
const enqueueIntegrationEventMock = jest.fn();
const syncEmployeeToPayrollMock = jest.fn();

class EmployeeMock {
  constructor(payload) {
    Object.assign(this, payload);
    this._id = payload._id || "mongo-emp-1";
    this.toObject = () => ({
      _id: this._id,
      employeeId: this.employeeId,
      firstName: this.firstName,
      lastName: this.lastName,
      gender: this.gender,
      ethnicity: this.ethnicity,
      employmentType: this.employmentType,
      isShareholder: this.isShareholder,
      departmentId: this.departmentId,
      hireDate: this.hireDate,
      birthDate: this.birthDate,
      vacationDays: this.vacationDays,
      paidToDate: this.paidToDate,
      paidLastYear: this.paidLastYear,
      payRate: this.payRate,
      payRateId: this.payRateId,
    });
    this.save = jest.fn(() => employeeSaveMock(this));
  }

  static findByIdAndUpdate(...args) {
    return findByIdAndUpdateMock(...args);
  }

  static findByIdAndDelete(...args) {
    return findByIdAndDeleteMock(...args);
  }
}

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: EmployeeMock,
}));

jest.unstable_mockModule("../services/syncService.js", () => ({
  syncEmployeeToPayroll: syncEmployeeToPayrollMock,
}));

jest.unstable_mockModule("../services/integrationEventService.js", () => ({
  enqueueIntegrationEvent: enqueueIntegrationEventMock,
}));

jest.unstable_mockModule("../config.js", () => ({
  OUTBOX_ENABLED: true,
}));

const {
  createEmployee,
  updateEmployee,
} = await import("../controllers/employee.controller.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("employee controller behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    employeeSaveMock.mockImplementation(async (employee) => employee);
    enqueueIntegrationEventMock.mockResolvedValue({ id: 1 });
    syncEmployeeToPayrollMock.mockResolvedValue({
      success: true,
      results: [],
    });
  });

  test("createEmployee maps validation errors to 400", async () => {
    const req = {
      body: {
        employeeId: "EMP001",
      },
    };
    const res = createRes();

    employeeSaveMock.mockRejectedValue({
      name: "ValidationError",
      message: "Employee validation failed: firstName is required",
    });

    await createEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Employee validation failed: firstName is required",
      code: "EMPLOYEE_VALIDATION_FAILED",
    });
  });

  test("createEmployee maps duplicate employeeId conflicts to 409", async () => {
    const req = {
      body: {
        employeeId: "EMP001",
        firstName: "Amy",
      },
    };
    const res = createRes();

    employeeSaveMock.mockRejectedValue({
      code: 11000,
      message: "E11000 duplicate key error",
    });

    await createEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Employee with the same employeeId already exists",
      code: "EMPLOYEE_DUPLICATE_ID",
    });
  });

  test("createEmployee queues outbox events with the request correlation id", async () => {
    const req = {
      requestId: "req-create-1",
      body: {
        employeeId: "EMP150",
        firstName: "Linh",
        lastName: "Tran",
        employmentType: "Full-time",
        isShareholder: false,
      },
    };
    const res = createRes();

    await createEmployee(req, res);

    expect(enqueueIntegrationEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "employee",
        entityId: "EMP150",
        action: "CREATE",
        correlationId: "req-create-1",
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        sync: expect.objectContaining({
          status: "QUEUED",
          correlationId: "req-create-1",
        }),
      }),
    );
  });

  test("createEmployee keeps source success and reports fallback sync state when outbox enqueue fails", async () => {
    const req = {
      requestId: "req-fallback-1",
      body: {
        employeeId: "EMP200",
        firstName: "Ava",
        lastName: "Nguyen",
        employmentType: "Full-time",
        isShareholder: false,
      },
    };
    const res = createRes();

    enqueueIntegrationEventMock.mockRejectedValue(new Error("mysql integration_events unavailable"));
    syncEmployeeToPayrollMock.mockResolvedValue({
      success: true,
      results: [{ adapter: "PayrollAdapter", status: "fulfilled", value: { success: true } }],
    });

    await createEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(syncEmployeeToPayrollMock).toHaveBeenCalledWith(
      "EMP200",
      "CREATE",
      expect.objectContaining({
        employeeId: "EMP200",
        firstName: "Ava",
      }),
      expect.objectContaining({
        correlationId: "req-fallback-1",
        source: "EMPLOYEE_CONTROLLER_FALLBACK",
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        sync: expect.objectContaining({
          status: "SUCCESS",
          mode: "DIRECT_FALLBACK",
          consistency: "EVENTUAL",
          requiresAttention: true,
          warning: expect.stringContaining("Outbox enqueue failed"),
          correlationId: "req-fallback-1",
        }),
      })
    );
  });

  test("updateEmployee enables validators and maps validation errors to 400", async () => {
    const req = {
      params: { id: "mongo-emp-1" },
      body: {
        employmentType: "Contractor",
      },
    };
    const res = createRes();

    findByIdAndUpdateMock.mockRejectedValue({
      name: "ValidationError",
      message: "Employee validation failed: employmentType is invalid",
    });

    await updateEmployee(req, res);

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      "mongo-emp-1",
      { employmentType: "Contractor" },
      expect.objectContaining({
        new: true,
        runValidators: true,
        context: "query",
      })
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Employee validation failed: employmentType is invalid",
      code: "EMPLOYEE_VALIDATION_FAILED",
    });
  });
});
