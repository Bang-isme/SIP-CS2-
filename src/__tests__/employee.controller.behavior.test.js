import { jest } from "@jest/globals";

const employeeSaveMock = jest.fn();
const findByIdMock = jest.fn();
const findByIdAndUpdateMock = jest.fn();
const findByIdAndDeleteMock = jest.fn();
const departmentFindMock = jest.fn();
const departmentFindByIdMock = jest.fn();
const enqueueIntegrationEventMock = jest.fn();
const syncEmployeeToPayrollMock = jest.fn();
const peekNextEmployeeIdMock = jest.fn();
const reserveNextEmployeeIdMock = jest.fn();
const buildEmployeeSyncEvidenceSnapshotMock = jest.fn();

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

  static findById(...args) {
    return findByIdMock(...args);
  }

  static findByIdAndDelete(...args) {
    return findByIdAndDeleteMock(...args);
  }
}

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: EmployeeMock,
}));

jest.unstable_mockModule("../models/Department.js", () => ({
  default: {
    find: departmentFindMock,
    findById: departmentFindByIdMock,
  },
}));

jest.unstable_mockModule("../services/syncService.js", () => ({
  syncEmployeeToPayroll: syncEmployeeToPayrollMock,
}));

jest.unstable_mockModule("../services/integrationEventService.js", () => ({
  enqueueIntegrationEvent: enqueueIntegrationEventMock,
}));

jest.unstable_mockModule("../services/employeeIdService.js", () => ({
  peekNextEmployeeId: peekNextEmployeeIdMock,
  reserveNextEmployeeId: reserveNextEmployeeIdMock,
}));

jest.unstable_mockModule("../services/employeeSyncEvidenceService.js", () => ({
  buildEmployeeSyncEvidenceSnapshot: buildEmployeeSyncEvidenceSnapshotMock,
}));

jest.unstable_mockModule("../config.js", () => ({
  OUTBOX_ENABLED: true,
}));

const {
  createEmployee,
  getEmployeeSyncEvidence,
  updateEmployee,
  getEmployeeOptions,
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
    findByIdMock.mockResolvedValue({
      _id: "mongo-emp-1",
      employeeId: "EMP001",
      birthDate: "1998-01-01T00:00:00.000Z",
      hireDate: "2024-01-10T00:00:00.000Z",
    });
    enqueueIntegrationEventMock.mockResolvedValue({ id: 1 });
    syncEmployeeToPayrollMock.mockResolvedValue({
      success: true,
      results: [],
    });
    peekNextEmployeeIdMock.mockResolvedValue("EMP000195");
    reserveNextEmployeeIdMock.mockResolvedValue("EMP000195");
    buildEmployeeSyncEvidenceSnapshotMock.mockResolvedValue(null);
    departmentFindMock.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
    departmentFindByIdMock.mockResolvedValue({ _id: "dept-1" });
  });

  test("createEmployee maps validation errors to 400", async () => {
    const req = {
      body: {
        firstName: "Amy",
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

  test("getEmployeeSyncEvidence returns lifecycle snapshot for a known employee id", async () => {
    const req = {
      params: { employeeId: "EMP001" },
    };
    const res = createRes();

    buildEmployeeSyncEvidenceSnapshotMock.mockResolvedValue({
      employeeId: "EMP001",
      checkedAt: "2026-04-22T08:00:00.000Z",
      overall: {
        status: "healthy",
        label: "Payroll synced",
      },
      source: { status: "PRESENT" },
      queue: { status: "SUCCESS" },
      payroll: { status: "CURRENT" },
    });

    await getEmployeeSyncEvidence(req, res);

    expect(buildEmployeeSyncEvidenceSnapshotMock).toHaveBeenCalledWith("EMP001");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          employeeId: "EMP001",
          overall: expect.objectContaining({
            status: "healthy",
            label: "Payroll synced",
          }),
        }),
        meta: expect.objectContaining({
          dataset: "employeeSyncEvidence",
          filters: { employeeId: "EMP001" },
        }),
      }),
    );
  });

  test("getEmployeeSyncEvidence returns 404 when no source or downstream evidence exists", async () => {
    const req = {
      params: { employeeId: "EMP404" },
    };
    const res = createRes();

    buildEmployeeSyncEvidenceSnapshotMock.mockResolvedValue(null);

    await getEmployeeSyncEvidence(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "EMPLOYEE_SYNC_EVIDENCE_NOT_FOUND",
        message: "Sync evidence not found",
      }),
    );
  });

  test("createEmployee auto-generates employeeId when the client omits it", async () => {
    const req = {
      body: {
        firstName: "Tina",
        lastName: "Pham",
        employmentType: "Full-time",
        isShareholder: false,
      },
    };
    const res = createRes();

    await createEmployee(req, res);

    expect(reserveNextEmployeeIdMock).toHaveBeenCalledTimes(1);
    expect(employeeSaveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "EMP000195",
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          employeeId: "EMP000195",
        }),
      }),
    );
  });

  test("createEmployee rejects client-supplied employeeId values", async () => {
    const req = {
      body: {
        employeeId: "EMP009999",
        firstName: "Linh",
      },
    };
    const res = createRes();

    await createEmployee(req, res);

    expect(reserveNextEmployeeIdMock).not.toHaveBeenCalled();
    expect(employeeSaveMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: "VALIDATION_ERROR",
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "employeeId",
          message: expect.stringContaining("server-generated"),
        }),
      ]),
    }));
  });

  test("createEmployee maps duplicate employeeId conflicts to 409", async () => {
    const req = {
      body: {
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

  test("createEmployee rejects aggregation-owned fields in the payload", async () => {
    const req = {
      body: {
        firstName: "Mai",
        annualEarnings: 250000,
      },
    };
    const res = createRes();

    await createEmployee(req, res);

    expect(employeeSaveMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: "VALIDATION_ERROR",
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "annualEarnings",
        }),
      ]),
    }));
  });

  test("createEmployee queues outbox events with the request correlation id", async () => {
    const req = {
      requestId: "req-create-1",
      body: {
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
        entityId: "EMP000195",
        action: "CREATE",
        correlationId: "req-create-1",
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        sync: expect.objectContaining({
          status: "QUEUED",
          correlationId: "req-create-1",
          message: "Queued",
          detail: expect.stringContaining("queued"),
        }),
      }),
    );
  });

  test("createEmployee keeps source success and reports fallback sync state when outbox enqueue fails", async () => {
    const req = {
      requestId: "req-fallback-1",
      body: {
        firstName: "Ava",
        lastName: "Nguyen",
        employmentType: "Full-time",
        isShareholder: false,
      },
    };
    const res = createRes();

    enqueueIntegrationEventMock.mockRejectedValue(new Error("integration outbox unavailable"));
    syncEmployeeToPayrollMock.mockResolvedValue({
      success: true,
      results: [{ adapter: "PayrollAdapter", status: "fulfilled", value: { success: true } }],
    });

    await createEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(syncEmployeeToPayrollMock).toHaveBeenCalledWith(
      "EMP000195",
      "CREATE",
      expect.objectContaining({
        employeeId: "EMP000195",
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
          message: "Synced",
          warning: expect.stringContaining("Outbox enqueue failed"),
          correlationId: "req-fallback-1",
        }),
      })
    );
  });

  test("updateEmployee enables validators and maps model validation errors to 400", async () => {
    const req = {
      params: { id: "mongo-emp-1" },
      body: {
        firstName: "Lan",
      },
    };
    const res = createRes();

    findByIdAndUpdateMock.mockRejectedValue({
      name: "ValidationError",
      message: "Employee validation failed: firstName is required",
    });

    await updateEmployee(req, res);

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      "mongo-emp-1",
      { firstName: "Lan" },
      expect.objectContaining({
        new: true,
        runValidators: true,
        context: "query",
      })
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Employee validation failed: firstName is required",
      code: "EMPLOYEE_VALIDATION_FAILED",
    });
  });

  test("updateEmployee rejects employeeId changes before hitting MongoDB", async () => {
    const req = {
      params: { id: "mongo-emp-1" },
      body: {
        employeeId: "EMP999",
      },
    };
    const res = createRes();

    await updateEmployee(req, res);

    expect(findByIdAndUpdateMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: "VALIDATION_ERROR",
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "employeeId",
        }),
      ]),
    }));
  });

  test("updateEmployee rejects date order that conflicts with the persisted timeline", async () => {
    const req = {
      params: { id: "mongo-emp-1" },
      body: {
        birthDate: "2025-02-01",
      },
    };
    const res = createRes();

    await updateEmployee(req, res);

    expect(findByIdMock).toHaveBeenCalledWith("mongo-emp-1");
    expect(findByIdAndUpdateMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: "VALIDATION_ERROR",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "birthDate" }),
        expect.objectContaining({ field: "hireDate" }),
      ]),
    }));
  });

  test("getEmployeeOptions returns department ids and form enums for admin tools", async () => {
    const req = {};
    const res = createRes();

    departmentFindMock.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: { toString: () => "dept-1" }, name: "Engineering", code: "ENG", isActive: true },
        ]),
      }),
    });

    await getEmployeeOptions(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        departments: [
          {
            _id: "dept-1",
            name: "Engineering",
            code: "ENG",
            isActive: true,
          },
        ],
          enums: {
            gender: ["Male", "Female", "Other"],
            employmentType: ["Full-time", "Part-time"],
          },
          nextEmployeeId: "EMP000195",
        },
        meta: expect.objectContaining({
          dataset: "employeeOptions",
        departmentCount: 1,
      }),
    });
  });
});
