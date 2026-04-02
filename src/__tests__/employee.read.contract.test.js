import { jest } from "@jest/globals";

const employeeFindOneMock = jest.fn();
const employeeFindByIdMock = jest.fn();
const employeeFindMock = jest.fn();
const employeeCountDocumentsMock = jest.fn();

class EmployeeQueryMock {
  constructor(rows) {
    this.rows = rows;
  }

  skip(skip) {
    this.skipValue = skip;
    return this;
  }

  limit(limit) {
    this.limitValue = limit;
    return Promise.resolve(this.rows);
  }
}

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: {
    findOne: employeeFindOneMock,
    findById: employeeFindByIdMock,
    find: employeeFindMock,
    countDocuments: employeeCountDocumentsMock,
  },
}));

const {
  getEmployee,
  getEmployees,
} = await import("../controllers/employee.controller.js");

const createRes = () => {
  const res = {};
  res.locals = { requestId: "req-employee-read-1" };
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

describe("employee read contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getEmployee resolves by business employeeId before Mongo fallback", async () => {
    employeeFindOneMock.mockResolvedValue({
      employeeId: "EMP010",
      firstName: "Amy",
    });

    const req = {
      params: { employeeId: "EMP010" },
    };
    const res = createRes();

    await getEmployee(req, res);

    expect(employeeFindOneMock).toHaveBeenCalledWith({ employeeId: "EMP010" });
    expect(employeeFindByIdMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        employeeId: "EMP010",
      }),
      meta: expect.objectContaining({
        dataset: "employeeDetail",
        requestId: "req-employee-read-1",
        filters: {
          employeeId: "EMP010",
          lookupMode: "employeeId",
        },
      }),
    });
  });

  test("getEmployee falls back to Mongo id for legacy callers", async () => {
    employeeFindOneMock.mockResolvedValue(null);
    employeeFindByIdMock.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      employeeId: "EMP011",
    });

    const req = {
      params: { employeeId: "507f1f77bcf86cd799439011" },
    };
    const res = createRes();

    await getEmployee(req, res);

    expect(employeeFindByIdMock).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        employeeId: "EMP011",
      }),
      meta: expect.objectContaining({
        filters: {
          employeeId: "507f1f77bcf86cd799439011",
          lookupMode: "mongoIdFallback",
        },
      }),
    });
  });

  test("getEmployees returns canonical envelope with legacy pagination", async () => {
    employeeFindMock.mockReturnValue(new EmployeeQueryMock([
      { employeeId: "EMP100", firstName: "Ava" },
      { employeeId: "EMP101", firstName: "Ben" },
    ]));
    employeeCountDocumentsMock.mockResolvedValue(2);

    const req = {
      query: {
        page: "1",
        limit: "2",
      },
    };
    const res = createRes();

    await getEmployees(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({ employeeId: "EMP100" }),
        expect.objectContaining({ employeeId: "EMP101" }),
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 2,
        pages: 1,
      },
      meta: expect.objectContaining({
        dataset: "employees",
        requestId: "req-employee-read-1",
        total: 2,
        page: 1,
        limit: 2,
        totalPages: 1,
        filters: {},
      }),
    });
  });

  test("getEmployees rejects invalid pagination params with 422", async () => {
    const req = {
      query: {
        page: "0",
        limit: "999",
      },
    };
    const res = createRes();

    await getEmployees(req, res);

    expect(employeeFindMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Validation failed.",
      requestId: "req-employee-read-1",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "page" }),
        expect.objectContaining({ field: "limit" }),
      ]),
    }));
  });
});
