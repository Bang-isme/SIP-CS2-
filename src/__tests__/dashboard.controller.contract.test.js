import { jest } from "@jest/globals";
import { Op } from "sequelize";

const employeeFindMock = jest.fn();
const employeeCountDocumentsMock = jest.fn();
const earningsSummaryFindAllMock = jest.fn();
const earningsEmployeeYearFindAllMock = jest.fn();
const cacheGetMock = jest.fn();
const cacheSetMock = jest.fn();
const buildDepartmentNameMapMock = jest.fn();
const listDepartmentNamesMock = jest.fn();
const resolveDepartmentIdByNameMock = jest.fn();

class EmployeeMock {
  static find(...args) {
    return employeeFindMock(...args);
  }

  static countDocuments(...args) {
    return employeeCountDocumentsMock(...args);
  }
}

class DepartmentMock {}

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: EmployeeMock,
}));

jest.unstable_mockModule("../models/Department.js", () => ({
  default: DepartmentMock,
}));

jest.unstable_mockModule("../models/sql/index.js", () => ({
  Earning: {},
  VacationRecord: {},
  BenefitPlan: {
    findOne: jest.fn(),
  },
  EmployeeBenefit: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  EarningsSummary: {
    findAll: earningsSummaryFindAllMock,
    findOne: jest.fn(),
  },
  EarningsEmployeeYear: {
    findAll: earningsEmployeeYearFindAllMock,
    findOne: jest.fn(),
  },
  VacationSummary: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  BenefitsSummary: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  AlertsSummary: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/cache.js", () => ({
  default: {
    get: cacheGetMock,
    set: cacheSetMock,
    clear: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/departmentMapping.js", () => ({
  buildDepartmentNameMap: buildDepartmentNameMapMock,
  listDepartmentNames: listDepartmentNamesMock,
  resolveDepartmentIdByName: resolveDepartmentIdByNameMock,
}));

jest.unstable_mockModule("../services/integrationMetricsService.js", () => ({
  buildIntegrationMetricsSnapshot: jest.fn(),
}));

const {
  exportDrilldownCsv,
  getDepartments,
  getDrilldown,
  getEarningsSummary,
  getExecutiveBrief,
} = await import("../controllers/dashboard.controller.js");

const createRes = () => {
  const res = {};
  res.locals = { requestId: "req-dashboard-test" };
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

const createStreamRes = () => {
  const res = {
    locals: { requestId: "req-dashboard-export-test" },
    headers: {},
    chunks: [],
  };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn((name, value) => {
    res.headers[name] = value;
  });
  res.write = jest.fn((chunk) => {
    res.chunks.push(String(chunk));
    return true;
  });
  res.end = jest.fn();
  res.once = jest.fn();
  return res;
};

describe("dashboard controller contract behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    buildDepartmentNameMapMock.mockResolvedValue({
      map: new Map([["dep-1", "Engineering"]]),
    });
    listDepartmentNamesMock.mockReturnValue(["HR", "Engineering"]);
  });

  test("getEarningsSummary rejects invalid year query with 422", async () => {
    const req = {
      query: { year: "nineteen" },
    };
    const res = createRes();

    await getEarningsSummary(req, res);

    expect(earningsSummaryFindAllMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Validation failed.",
      requestId: "req-dashboard-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "year" }),
      ]),
    }));
  });

  test("getDrilldown rejects invalid boolean filter before touching persistence", async () => {
    const req = {
      query: {
        isShareholder: "maybe",
      },
    };
    const res = createRes();

    await getDrilldown(req, res);

    expect(buildDepartmentNameMapMock).not.toHaveBeenCalled();
    expect(employeeFindMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      requestId: "req-dashboard-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "isShareholder" }),
      ]),
    }));
  });

  test("getDepartments returns dataset metadata for FE contract consumers", async () => {
    const req = {};
    const res = createRes();

    await getDepartments(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: ["Engineering", "HR"],
      meta: expect.objectContaining({
        dataset: "departments",
        count: 2,
        requestId: "req-dashboard-test",
      }),
    });
  });

  test("getExecutiveBrief rejects invalid year query with 422", async () => {
    const req = {
      query: { year: "future-ish" },
      userId: "507f1f77bcf86cd799439011",
    };
    const res = createRes();

    await getExecutiveBrief(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      requestId: "req-dashboard-test",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "year" }),
      ]),
    }));
  });

  test("exportDrilldownCsv batches earnings lookups by employee chunk instead of loading whole year", async () => {
    const employees = Array.from({ length: 1001 }, (_, index) => ({
      _id: `mongo-${index + 1}`,
      employeeId: `EMP${String(index + 1).padStart(4, "0")}`,
      firstName: "Amy",
      lastName: `Worker ${index + 1}`,
      departmentId: null,
      gender: "F",
      ethnicity: "Asian",
      employmentType: "Full-time",
      isShareholder: false,
      annualEarnings: 0,
      annualEarningsYear: 2026,
    }));

    employeeFindMock.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          cursor: async function* cursor() {
            for (const employee of employees) {
              yield employee;
            }
          },
        }),
      }),
    });
    earningsEmployeeYearFindAllMock.mockImplementation(async ({ where }) => {
      const employeeIds = where.employee_id?.[Op.in] || [];
      return employeeIds.map((employeeId) => ({ employee_id: employeeId, total: 12345 }));
    });

    const req = {
      query: {
        year: "2026",
      },
    };
    const res = createStreamRes();

    await exportDrilldownCsv(req, res);

    expect(earningsEmployeeYearFindAllMock).toHaveBeenCalledTimes(2);
    for (const call of earningsEmployeeYearFindAllMock.mock.calls) {
      const where = call[0]?.where || {};
      expect(where.year).toBe(2026);
      expect(where.employee_id).toBeDefined();
      expect(where.employee_id[Op.in]).toBeDefined();
      expect(where.employee_id[Op.in].length).toBeLessThanOrEqual(1000);
    }
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.write).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });
});
