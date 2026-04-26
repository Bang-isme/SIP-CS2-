import { jest } from "@jest/globals";
import { Op } from "sequelize";

const employeeFindMock = jest.fn();
const employeeCountDocumentsMock = jest.fn();
const earningsSummaryFindAllMock = jest.fn();
const earningsEmployeeYearFindAllMock = jest.fn();
const earningsEmployeeYearCountMock = jest.fn();
const benefitPlanFindOneMock = jest.fn();
const employeeBenefitFindAllMock = jest.fn();
const cacheGetMock = jest.fn();
const cacheSetMock = jest.fn();
const cacheClearMock = jest.fn();
const buildDepartmentNameMapMock = jest.fn();
const listDepartmentNamesMock = jest.fn();
const resolveDepartmentIdByNameMock = jest.fn();
const buildExecutiveBriefSnapshotMock = jest.fn();
const buildDashboardOperationalReadinessSnapshotMock = jest.fn();
const runDashboardAggregationNowMock = jest.fn();

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
    findOne: benefitPlanFindOneMock,
  },
  EmployeeBenefit: {
    findAll: employeeBenefitFindAllMock,
    findOne: jest.fn(),
  },
  EarningsSummary: {
    findAll: earningsSummaryFindAllMock,
    findOne: jest.fn(),
  },
  EarningsEmployeeYear: {
    findAll: earningsEmployeeYearFindAllMock,
    count: earningsEmployeeYearCountMock,
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
    clear: cacheClearMock,
  },
}));

jest.unstable_mockModule("../services/dashboardExecutiveService.js", () => ({
  buildExecutiveBriefSnapshot: buildExecutiveBriefSnapshotMock,
}));

jest.unstable_mockModule("../services/dashboardOperationalReadinessService.js", () => ({
  buildDashboardOperationalReadinessSnapshot: buildDashboardOperationalReadinessSnapshotMock,
}));

jest.unstable_mockModule("../workers/dashboardAggregationWorker.js", () => ({
  runDashboardAggregationNow: runDashboardAggregationNowMock,
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
  getOperationalReadiness,
  refreshDashboardSummaries,
} = await import("../controllers/dashboard.controller.js");
const { DRILLDOWN_EXPORT_BATCH_SIZE } = await import("../config.js");

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

const createPagedEmployeeQueryMock = (employees) => ({
  select: jest.fn().mockReturnValue({
    skip: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(employees),
      }),
    }),
  }),
});

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

  test("refreshDashboardSummaries rebuilds summaries and returns updated freshness metadata", async () => {
    const req = {
      query: { year: "2026" },
      userId: "507f1f77bcf86cd799439011",
    };
    const res = createRes();
    buildExecutiveBriefSnapshotMock.mockResolvedValue({
      freshness: {
        global: {
          status: "fresh",
          label: "Fresh",
        },
        readiness: {
          summary: "Summaries current",
          actionMode: "reload",
        },
      },
    });

    await refreshDashboardSummaries(req, res);

    expect(runDashboardAggregationNowMock).toHaveBeenCalledWith({
      reason: "api-refresh:507f1f77bcf86cd799439011",
      targetYear: 2026,
    });
    expect(cacheClearMock).toHaveBeenCalledTimes(1);
    expect(buildExecutiveBriefSnapshotMock).toHaveBeenCalledWith({
      userId: "507f1f77bcf86cd799439011",
      year: 2026,
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Summaries rebuilt",
      data: expect.objectContaining({
        year: 2026,
        freshness: expect.objectContaining({
          readiness: expect.objectContaining({
            summary: "Summaries current",
          }),
        }),
      }),
    }));
  });

  test("getOperationalReadiness forwards year and refresh intent to the readiness service", async () => {
    const req = {
      query: {
        year: "2026",
        fresh: "true",
      },
      userId: "507f1f77bcf86cd799439011",
    };
    const res = createRes();
    buildDashboardOperationalReadinessSnapshotMock.mockResolvedValue({
      checkedAt: "2026-04-22T09:00:00.000Z",
      overall: {
        status: "healthy",
        label: "Ready",
        summary: "All checks aligned.",
      },
      cards: [],
    });

    await getOperationalReadiness(req, res);

    expect(buildDashboardOperationalReadinessSnapshotMock).toHaveBeenCalledWith({
      userId: "507f1f77bcf86cd799439011",
      year: 2026,
      forceRefresh: true,
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        overall: expect.objectContaining({
          status: "healthy",
        }),
      }),
      meta: expect.objectContaining({
        dataset: "operationalReadiness",
        requestId: "req-dashboard-test",
      }),
    }));
  });

  test("getDrilldown downgrades large multi-filter summaries to fast mode to protect latency", async () => {
    employeeFindMock.mockReturnValue(createPagedEmployeeQueryMock([
      {
        _id: "mongo-1",
        employeeId: "EMP0001",
        firstName: "Amy",
        lastName: "Speed",
        departmentId: null,
        gender: "Female",
        ethnicity: "Asian",
        employmentType: "Full-time",
        isShareholder: false,
        vacationDays: 12,
        annualEarnings: 125000,
        annualEarningsYear: 2026,
      },
    ]));
    employeeCountDocumentsMock.mockResolvedValue(12001);

    const req = {
      query: {
        year: "2026",
        gender: "Female",
        employmentType: "Part-time",
      },
    };
    const res = createRes();

    await getDrilldown(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      summary: expect.objectContaining({
        mode: "fast",
        partial: true,
        source: "fast-count",
        count: 12001,
      }),
    }));
  });

  test("getDrilldown keeps single-dimension summaries on the pre-aggregated path even for large result sets", async () => {
    employeeFindMock.mockReturnValue(createPagedEmployeeQueryMock([
      {
        _id: "mongo-1",
        employeeId: "EMP0001",
        firstName: "Amy",
        lastName: "Summary",
        departmentId: null,
        gender: "Female",
        ethnicity: "Asian",
        employmentType: "Full-time",
        isShareholder: false,
        vacationDays: 12,
        annualEarnings: 125000,
        annualEarningsYear: 2026,
      },
    ]));
    employeeCountDocumentsMock.mockResolvedValue(12001);

    const req = {
      query: {
        year: "2026",
        gender: "Female",
      },
    };
    const res = createRes();

    await getDrilldown(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      summary: expect.objectContaining({
        mode: "full",
      }),
    }));
  });

  test("getDrilldown uses Mongo earnings snapshot for minEarnings-only filters when counts stay consistent", async () => {
    employeeFindMock.mockReturnValue(createPagedEmployeeQueryMock([
      {
        _id: "mongo-1",
        employeeId: "EMP0001",
        firstName: "Amy",
        lastName: "Snapshot",
        departmentId: null,
        gender: "Female",
        ethnicity: "Asian",
        employmentType: "Full-time",
        isShareholder: false,
        vacationDays: 8,
        annualEarnings: 125000,
        annualEarningsYear: 2026,
      },
    ]));
    employeeCountDocumentsMock
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    earningsEmployeeYearCountMock.mockResolvedValue(1);

    const req = {
      query: {
        year: "2026",
        minEarnings: "100000",
      },
    };
    const res = createRes();

    await getDrilldown(req, res);

    expect(employeeCountDocumentsMock).toHaveBeenNthCalledWith(1, {
      annualEarningsYear: 2026,
      annualEarnings: { $gte: 100000 },
    });
    expect(earningsEmployeeYearCountMock).toHaveBeenCalledWith({
      where: {
        year: 2026,
        total: { [Op.gte]: 100000 },
      },
    });
    expect(earningsEmployeeYearFindAllMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      meta: expect.objectContaining({
        total: 1,
        minEarningsApplied: 100000,
      }),
      summary: expect.objectContaining({
        mode: "fast",
        partial: true,
        count: 1,
      }),
    }));
  });

  test("getDrilldown falls back to SQL earnings filtering when Mongo snapshot counts drift", async () => {
    employeeFindMock.mockReturnValue(createPagedEmployeeQueryMock([
      {
        _id: "mongo-1",
        employeeId: "EMP0001",
        firstName: "Amy",
        lastName: "Fallback",
        departmentId: null,
        gender: "Female",
        ethnicity: "Asian",
        employmentType: "Full-time",
        isShareholder: false,
        vacationDays: 8,
        annualEarnings: 0,
        annualEarningsYear: null,
      },
    ]));
    employeeCountDocumentsMock
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    earningsEmployeeYearCountMock.mockResolvedValue(1);
    earningsEmployeeYearFindAllMock
      .mockResolvedValueOnce([{ employee_id: "EMP0001" }])
      .mockResolvedValueOnce([{ employee_id: "EMP0001", total: 125000 }]);

    const req = {
      query: {
        year: "2026",
        minEarnings: "100000",
      },
    };
    const res = createRes();

    await getDrilldown(req, res);

    expect(earningsEmployeeYearFindAllMock).toHaveBeenCalledTimes(2);
    expect(earningsEmployeeYearFindAllMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        year: 2026,
        total: { [Op.gte]: 100000 },
      }),
      attributes: ["employee_id"],
      raw: true,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          employeeId: "EMP0001",
          totalEarnings: 125000,
        }),
      ]),
    }));
  });

  test("exportDrilldownCsv batches earnings lookups by employee chunk instead of loading whole year", async () => {
    const employees = Array.from({ length: DRILLDOWN_EXPORT_BATCH_SIZE + 1 }, (_, index) => ({
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
      annualEarningsYear: null,
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
      expect(where.employee_id[Op.in].length).toBeLessThanOrEqual(DRILLDOWN_EXPORT_BATCH_SIZE);
    }
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.write).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test("exportDrilldownCsv skips SQL earnings lookups for rows with a valid Mongo earnings snapshot", async () => {
    employeeFindMock.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          cursor: async function* cursor() {
            yield {
              _id: "mongo-1",
              employeeId: "EMP0001",
              firstName: "Ava",
              lastName: "Snapshot",
              departmentId: null,
              gender: "F",
              ethnicity: "Asian",
              employmentType: "Full-time",
              isShareholder: false,
              annualEarnings: 120000,
              annualEarningsYear: 2026,
            };
          },
        }),
      }),
    });

    const req = {
      query: {
        context: "earnings",
        year: "2026",
      },
    };
    const res = createStreamRes();

    await exportDrilldownCsv(req, res);

    expect(earningsEmployeeYearFindAllMock).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test("exportDrilldownCsv skips earnings lookup for benefits export when no minEarnings filter is active", async () => {
    employeeFindMock.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          cursor: async function* cursor() {
            yield {
              _id: "mongo-1",
              employeeId: "EMP0001",
              firstName: "Ava",
              lastName: "Benefits",
              departmentId: null,
              gender: "F",
              ethnicity: "Asian",
              employmentType: "Full-time",
              isShareholder: false,
              annualEarnings: 120000,
              annualEarningsYear: 2026,
            };
          },
        }),
      }),
    });
    benefitPlanFindOneMock.mockResolvedValue({ id: 7, name: "Gold Plan" });
    employeeBenefitFindAllMock.mockResolvedValue([
      { employee_id: "EMP0001", total: 4200 },
    ]);

    const req = {
      query: {
        context: "benefits",
        year: "2026",
        benefitPlanName: "Gold Plan",
      },
    };
    const res = createStreamRes();

    await exportDrilldownCsv(req, res);

    expect(earningsEmployeeYearFindAllMock).not.toHaveBeenCalled();
    expect(employeeBenefitFindAllMock).toHaveBeenCalledTimes(1);
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test("exportDrilldownCsv uses context-aware Mongo projection and disables cache storage", async () => {
    const selectMock = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        cursor: async function* cursor() {
          yield {
            _id: "mongo-1",
            employeeId: "EMP0001",
            firstName: "Ava",
            lastName: "Benefits",
            departmentId: null,
            gender: "F",
            ethnicity: "Asian",
            employmentType: "Full-time",
            isShareholder: false,
          };
        },
      }),
    });

    employeeFindMock.mockReturnValue({
      select: selectMock,
    });
    employeeBenefitFindAllMock.mockResolvedValue([
      { employee_id: "EMP0001", total: 4200 },
    ]);

    const req = {
      query: {
        context: "benefits",
        year: "2026",
      },
    };
    const res = createStreamRes();

    await exportDrilldownCsv(req, res);

    const projection = selectMock.mock.calls[0]?.[0] || "";
    expect(projection).toContain("employeeId");
    expect(projection).not.toContain("annualEarnings");
    expect(projection).not.toContain("vacationDays");
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });
});
