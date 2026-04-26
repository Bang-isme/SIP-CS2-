import fs from "fs";
import path from "path";
import { jest } from "@jest/globals";
import { fileURLToPath, pathToFileURL } from "url";

import EarningsSummary from "../models/sql/EarningsSummary.js";
import VacationSummary from "../models/sql/VacationSummary.js";
import BenefitsSummary from "../models/sql/BenefitsSummary.js";
import {
  DASHBOARD_COMPANY_SCOPE_VALUE,
  DASHBOARD_SUMMARY_SCOPE_MIGRATION_ID,
  DASHBOARD_SUMMARY_SCOPE_TABLES,
  REQUIRED_MIGRATION_IDS,
} from "../mysqlDatabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const expectScopedSummaryContract = (model, expectedUniqueFields, expectedIndexName) => {
  expect(model.rawAttributes.scope_type).toEqual(expect.objectContaining({
    allowNull: false,
    defaultValue: "company",
  }));
  expect(model.rawAttributes.scope_value).toEqual(expect.objectContaining({
    allowNull: false,
    defaultValue: DASHBOARD_COMPANY_SCOPE_VALUE,
  }));
  expect(model.options.indexes).toEqual(expect.arrayContaining([
    expect.objectContaining({
      name: expectedIndexName,
      unique: true,
      fields: expectedUniqueFields,
    }),
  ]));
  expect(expectedIndexName.length).toBeLessThanOrEqual(64);
};

describe("dashboard summary scope schema contract", () => {
  test("earnings and vacation summaries expose scope fields in their schema", () => {
    expectScopedSummaryContract(EarningsSummary, [
      "year",
      "scope_type",
      "scope_value",
      "group_type",
      "group_value",
    ], "ux_earnings_summary_scope_group");
    expectScopedSummaryContract(VacationSummary, [
      "year",
      "scope_type",
      "scope_value",
      "group_type",
      "group_value",
    ], "ux_vacation_summary_scope_group");
  });

  test("benefits summary exposes scope fields in its schema", () => {
    expectScopedSummaryContract(BenefitsSummary, [
      "scope_type",
      "scope_value",
      "plan_name",
      "shareholder_type",
    ], "ux_benefits_summary_scope_plan_shareholder");
  });

  test("mysql migration wiring registers the dashboard summary scope migration", () => {
    const mysqlDatabasePath = path.resolve(__dirname, "..", "mysqlDatabase.js");
    const source = fs.readFileSync(mysqlDatabasePath, "utf-8");

    expect(DASHBOARD_SUMMARY_SCOPE_MIGRATION_ID).toBe("20260419_000006_dashboard_summary_scope");
    expect(REQUIRED_MIGRATION_IDS).toContain(DASHBOARD_SUMMARY_SCOPE_MIGRATION_ID);
    expect(DASHBOARD_SUMMARY_SCOPE_TABLES).toEqual(expect.arrayContaining([
      expect.objectContaining({
        tableName: "earnings_summary",
        scopeValueDefinition: expect.stringContaining(`DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}'`),
        scopeValueModify: expect.stringContaining("VARCHAR(100) NOT NULL"),
        targetColumns: ["year", "scope_type", "scope_value", "group_type", "group_value"],
      }),
      expect.objectContaining({
        tableName: "vacation_summary",
        scopeValueDefinition: expect.stringContaining(`DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}'`),
        scopeValueModify: expect.stringContaining("VARCHAR(100) NOT NULL"),
        targetColumns: ["year", "scope_type", "scope_value", "group_type", "group_value"],
      }),
      expect.objectContaining({
        tableName: "benefits_summary",
        scopeValueDefinition: expect.stringContaining(`DEFAULT '${DASHBOARD_COMPANY_SCOPE_VALUE}'`),
        scopeValueModify: expect.stringContaining("VARCHAR(100) NOT NULL"),
        targetColumns: ["scope_type", "scope_value", "plan_name", "shareholder_type"],
      }),
    ]));
    expect(source).toContain("ensureDashboardSummaryScopeSupport");
    expect(source).toContain("MODIFY COLUMN ${summary.scopeValueModify}");
  });
});

describe("dashboard aggregation scoped row contract", () => {
  const connectMySQLMock = jest.fn().mockResolvedValue(true);
  const syncDatabaseMock = jest.fn().mockResolvedValue(undefined);
  const mongooseConnectMock = jest.fn().mockResolvedValue(undefined);
  const buildDepartmentNameMapMock = jest.fn().mockResolvedValue({
    map: new Map([
      ["dep-eng", "Engineering"],
      ["dep-hr", "Human Resources"],
    ]),
    usedFallback: false,
  });
  const buildBenefitsChangeMatchesFromRowsMock = jest.fn(() => []);
  let processExitMock;
  let consoleLogMock;
  let consoleWarnMock;
  let consoleErrorMock;
  let originalArgv;
  let originalIncludeDepartmentScopeEnv;

  const employees = [
    {
      _id: "mongo-1",
      employeeId: "EMP001",
      departmentId: "dep-eng",
      isShareholder: true,
      gender: "Female",
      ethnicity: "Asian",
      employmentType: "Full-time",
    },
    {
      _id: "mongo-2",
      employeeId: "EMP002",
      departmentId: "dep-hr",
      isShareholder: false,
      gender: "Male",
      ethnicity: "Latino",
      employmentType: "Part-time",
    },
  ];

  const currentEarnings = [
    { employee_id: "EMP001", total: "1000" },
    { employee_id: "EMP002", total: "600" },
  ];
  const previousEarnings = [
    { employee_id: "EMP001", total: "900" },
    { employee_id: "EMP002", total: "500" },
  ];
  const currentVacation = [
    { employee_id: "EMP001", total: "10" },
    { employee_id: "EMP002", total: "5" },
  ];
  const previousVacation = [
    { employee_id: "EMP001", total: "8" },
    { employee_id: "EMP002", total: "4" },
  ];
  const benefitsData = [
    { employee_id: "EMP001", plan_name: "Gold", total: "200" },
    { employee_id: "EMP002", plan_name: "Silver", total: "120" },
  ];

  const earningsBulkCreateMock = jest.fn().mockResolvedValue(undefined);
  const vacationBulkCreateMock = jest.fn().mockResolvedValue(undefined);
  const benefitsBulkCreateMock = jest.fn().mockResolvedValue(undefined);
  const alertsBulkCreateMock = jest.fn().mockResolvedValue(undefined);
  const alertEmployeeSyncMock = jest.fn().mockResolvedValue(undefined);

  const queryMock = jest.fn(async (sql, options = {}) => {
    if (sql.includes("FROM earnings")) {
      return options.replacements?.year === 2026 ? currentEarnings : previousEarnings;
    }
    if (sql.includes("FROM vacation_records")) {
      return options.replacements?.year === 2026 ? currentVacation : previousVacation;
    }
    if (sql.includes("FROM employee_benefits")) {
      return benefitsData;
    }
    return [];
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    originalArgv = [...process.argv];
    originalIncludeDepartmentScopeEnv = process.env.AGG_INCLUDE_DEPARTMENT_SCOPE;
    processExitMock = jest.spyOn(process, "exit").mockImplementation(() => undefined);
    consoleLogMock = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorMock = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    if (originalIncludeDepartmentScopeEnv === undefined) {
      delete process.env.AGG_INCLUDE_DEPARTMENT_SCOPE;
    } else {
      process.env.AGG_INCLUDE_DEPARTMENT_SCOPE = originalIncludeDepartmentScopeEnv;
    }
  });

  afterAll(() => {
    processExitMock?.mockRestore();
    consoleLogMock?.mockRestore();
    consoleWarnMock?.mockRestore();
    consoleErrorMock?.mockRestore();
  });

  const runAggregateDashboard = async ({ includeDepartmentScope = false } = {}) => {
    jest.unstable_mockModule("dotenv", () => ({
      default: {
        config: jest.fn(),
      },
    }));

    jest.unstable_mockModule("mongoose", () => ({
      default: {
        connect: mongooseConnectMock,
      },
    }));

    jest.unstable_mockModule("../config.js", () => ({
      MONGODB_URI: "mongodb://example.test/dashboard-scope",
    }));

    jest.unstable_mockModule("../mysqlDatabase.js", () => ({
      connectMySQL: connectMySQLMock,
      DASHBOARD_COMPANY_SCOPE_VALUE,
      syncDatabase: syncDatabaseMock,
      default: {
        query: queryMock,
        QueryTypes: {
          SELECT: "SELECT",
        },
      },
    }));

    class EmployeeMock {
      static find(query = {}) {
        if (query?.isShareholder === true) {
          return {
            select() {
              return {
                async lean() {
                  return employees.filter((employee) => employee.isShareholder).map((employee) => ({
                    employeeId: employee.employeeId,
                  }));
                },
              };
            },
          };
        }

        return {
          select() {
            return {
              lean() {
                return {
                  async *cursor() {
                    for (const employee of employees) {
                      yield employee;
                    }
                  },
                };
              },
            };
          },
        };
      }

      static async bulkWrite() {
        return undefined;
      }
    }

    class DepartmentMock {}

    class AlertMock {
      static find() {
        return {
          async lean() {
            return [];
          },
        };
      }
    }

    jest.unstable_mockModule("../models/Employee.js", () => ({
      default: EmployeeMock,
    }));

    jest.unstable_mockModule("../models/Department.js", () => ({
      default: DepartmentMock,
    }));

    jest.unstable_mockModule("../models/Alert.js", () => ({
      default: AlertMock,
    }));

    jest.unstable_mockModule("../utils/departmentMapping.js", () => ({
      buildDepartmentNameMap: buildDepartmentNameMapMock,
    }));

    jest.unstable_mockModule("../utils/benefitsPayrollImpact.js", () => ({
      buildBenefitsChangeMatchesFromRows: buildBenefitsChangeMatchesFromRowsMock,
    }));

    jest.unstable_mockModule("../models/sql/index.js", () => ({
      BenefitPlan: {},
      EmployeeBenefit: {
        findAll: jest.fn(),
      },
      EarningsEmployeeYear: {
        destroy: jest.fn().mockResolvedValue(undefined),
        bulkCreate: jest.fn().mockResolvedValue(undefined),
      },
      EarningsSummary: {
        destroy: jest.fn().mockResolvedValue(undefined),
        bulkCreate: earningsBulkCreateMock,
      },
      VacationSummary: {
        destroy: jest.fn().mockResolvedValue(undefined),
        bulkCreate: vacationBulkCreateMock,
      },
      BenefitsSummary: {
        destroy: jest.fn().mockResolvedValue(undefined),
        bulkCreate: benefitsBulkCreateMock,
      },
      AlertsSummary: {
        destroy: jest.fn().mockResolvedValue(undefined),
        bulkCreate: alertsBulkCreateMock,
      },
    }));
    jest.unstable_mockModule("../models/sql/AlertEmployee.js", () => ({
      default: {
        sync: alertEmployeeSyncMock,
        bulkCreate: jest.fn().mockResolvedValue(undefined),
      },
    }));

    process.argv = [
      "node",
      "scripts/aggregate-dashboard.js",
      "2026",
      ...(includeDepartmentScope ? ["--include-department-scope"] : []),
    ];
    if (includeDepartmentScope) {
      process.env.AGG_INCLUDE_DEPARTMENT_SCOPE = "1";
    } else {
      delete process.env.AGG_INCLUDE_DEPARTMENT_SCOPE;
    }

    const scriptUrl = `${pathToFileURL(path.resolve(__dirname, "..", "..", "scripts", "aggregate-dashboard.js")).href}?test=${Date.now()}`;
    const exitCodePromise = new Promise((resolve) => {
      processExitMock.mockImplementation((code) => {
        resolve(code);
        return undefined;
      });
    });
    await import(scriptUrl);
    await expect(exitCodePromise).resolves.toBe(0);

    return {
      earningsRows: earningsBulkCreateMock.mock.calls[0][0],
      vacationRows: vacationBulkCreateMock.mock.calls[0][0],
      benefitsRows: benefitsBulkCreateMock.mock.calls[0][0],
    };
  };

  test("aggregation writes only company-scoped rows by default so current readers stay safe", async () => {
    const { earningsRows, vacationRows, benefitsRows } = await runAggregateDashboard();

    expect(earningsRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        year: 2026,
        scope_type: "company",
        scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
        group_type: "total",
        group_value: "all",
        current_total: 1600,
        previous_total: 1400,
      }),
    ]));
    expect(earningsRows.some((row) => row.scope_type === "department")).toBe(false);

    expect(vacationRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        year: 2026,
        scope_type: "company",
        scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
        group_type: "total",
        group_value: "all",
        current_total: 15,
        previous_total: 12,
      }),
    ]));
    expect(vacationRows.some((row) => row.scope_type === "department")).toBe(false);

    expect(benefitsRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        scope_type: "company",
        scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
        plan_name: "_overall",
        shareholder_type: "shareholder",
        total_paid: 200,
        enrollment_count: 1,
      }),
    ]));
    expect(benefitsRows.some((row) => row.scope_type === "department")).toBe(false);
  });

  test("aggregation can emit department-scoped rows when the opt-in gate is enabled", async () => {
    const { earningsRows, vacationRows, benefitsRows } = await runAggregateDashboard({
      includeDepartmentScope: true,
    });

    expect(earningsRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        year: 2026,
        scope_type: "company",
        scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
        group_type: "total",
        group_value: "all",
        current_total: 1600,
        previous_total: 1400,
      }),
      expect.objectContaining({
        year: 2026,
        scope_type: "department",
        scope_value: "dep-eng",
        group_type: "total",
        group_value: "all",
        current_total: 1000,
        previous_total: 900,
        employee_count: 1,
      }),
      expect.objectContaining({
        year: 2026,
        scope_type: "department",
        scope_value: "dep-eng",
        group_type: "gender",
        group_value: "Female",
        current_total: 1000,
        previous_total: 900,
      }),
    ]));

    expect(vacationRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        year: 2026,
        scope_type: "company",
        scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
        group_type: "total",
        group_value: "all",
        current_total: 15,
        previous_total: 12,
      }),
      expect.objectContaining({
        year: 2026,
        scope_type: "department",
        scope_value: "dep-hr",
        group_type: "shareholder",
        group_value: "nonShareholder",
        current_total: 5,
        previous_total: 4,
      }),
    ]));

    expect(benefitsRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        scope_type: "company",
        scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
        plan_name: "_overall",
        shareholder_type: "shareholder",
        total_paid: 200,
        enrollment_count: 1,
      }),
      expect.objectContaining({
        scope_type: "department",
        scope_value: "dep-eng",
        plan_name: "_overall",
        shareholder_type: "shareholder",
        total_paid: 200,
        enrollment_count: 1,
      }),
      expect.objectContaining({
        scope_type: "department",
        scope_value: "dep-eng",
        plan_name: "Gold",
        shareholder_type: "shareholder",
        total_paid: 200,
        enrollment_count: 1,
      }),
    ]));
  });
});
