import { jest } from "@jest/globals";

const createLegacyTableState = ({
  columns,
  indexes,
  rows,
}) => ({
  columns: new Map(columns.map((column) => [column.Field, { ...column }])),
  indexes: new Map(indexes.map((index) => [index.name, { ...index, columns: [...index.columns] }])),
  rows: rows.map((row) => ({ ...row })),
});

const createLegacyDatabaseState = () => ({
  earnings_summary: createLegacyTableState({
    columns: [
      { Field: "id", Type: "int(11)", Null: "NO", Default: null },
      { Field: "year", Type: "int(11)", Null: "NO", Default: null },
      { Field: "group_type", Type: "varchar(50)", Null: "NO", Default: null },
      { Field: "group_value", Type: "varchar(100)", Null: "NO", Default: null },
      { Field: "current_total", Type: "decimal(15,2)", Null: "YES", Default: "0.00" },
      { Field: "previous_total", Type: "decimal(15,2)", Null: "YES", Default: "0.00" },
      { Field: "employee_count", Type: "int(11)", Null: "YES", Default: "0" },
    ],
    indexes: [
      { name: "earnings_summary_year_group_type_group_value", unique: true, columns: ["year", "group_type", "group_value"] },
    ],
    rows: [
      { id: 1, year: 2026, group_type: "total", group_value: "all", current_total: 1600, previous_total: 1400, employee_count: 2 },
      { id: 2, year: 2026, group_type: "gender", group_value: "Female", current_total: 1000, previous_total: 900, employee_count: 1 },
    ],
  }),
  vacation_summary: createLegacyTableState({
    columns: [
      { Field: "id", Type: "int(11)", Null: "NO", Default: null },
      { Field: "year", Type: "int(11)", Null: "NO", Default: null },
      { Field: "group_type", Type: "varchar(50)", Null: "NO", Default: null },
      { Field: "group_value", Type: "varchar(100)", Null: "NO", Default: null },
      { Field: "current_total", Type: "int(11)", Null: "YES", Default: "0" },
      { Field: "previous_total", Type: "int(11)", Null: "YES", Default: "0" },
      { Field: "employee_count", Type: "int(11)", Null: "YES", Default: "0" },
    ],
    indexes: [
      { name: "vacation_summary_year_group_type_group_value", unique: true, columns: ["year", "group_type", "group_value"] },
    ],
    rows: [
      { id: 1, year: 2026, group_type: "total", group_value: "all", current_total: 15, previous_total: 12, employee_count: 2 },
    ],
  }),
  benefits_summary: createLegacyTableState({
    columns: [
      { Field: "id", Type: "int(11)", Null: "NO", Default: null },
      { Field: "plan_name", Type: "varchar(100)", Null: "NO", Default: null },
      { Field: "shareholder_type", Type: "varchar(20)", Null: "NO", Default: null },
      { Field: "total_paid", Type: "decimal(15,2)", Null: "YES", Default: "0.00" },
      { Field: "enrollment_count", Type: "int(11)", Null: "YES", Default: "0" },
      { Field: "average_paid", Type: "decimal(15,2)", Null: "YES", Default: "0.00" },
    ],
    indexes: [
      { name: "benefits_summary_plan_name_shareholder_type", unique: true, columns: ["plan_name", "shareholder_type"] },
    ],
    rows: [
      { id: 1, plan_name: "_overall", shareholder_type: "shareholder", total_paid: 200, enrollment_count: 1, average_paid: 200 },
      { id: 2, plan_name: "_overall", shareholder_type: "nonShareholder", total_paid: 120, enrollment_count: 1, average_paid: 120 },
    ],
  }),
});

const createPartialMigrationDatabaseState = () => ({
  earnings_summary: createLegacyTableState({
    columns: [
      { Field: "id", Type: "int(11)", Null: "NO", Default: null },
      { Field: "year", Type: "int(11)", Null: "NO", Default: null },
      { Field: "scope_type", Type: "varchar(20)", Null: "NO", Default: "company" },
      { Field: "scope_value", Type: "varchar(100)", Null: "YES", Default: null },
      { Field: "group_type", Type: "varchar(50)", Null: "NO", Default: null },
      { Field: "group_value", Type: "varchar(100)", Null: "NO", Default: null },
    ],
    indexes: [
      { name: "earnings_summary_year_group_type_group_value", unique: true, columns: ["year", "group_type", "group_value"] },
    ],
    rows: [
      { id: 1, year: 2026, scope_type: "company", scope_value: null, group_type: "total", group_value: "all" },
      { id: 2, year: 2026, scope_type: "", scope_value: "", group_type: "gender", group_value: "Female" },
    ],
  }),
  vacation_summary: createLegacyTableState({
    columns: [
      { Field: "id", Type: "int(11)", Null: "NO", Default: null },
      { Field: "year", Type: "int(11)", Null: "NO", Default: null },
      { Field: "scope_type", Type: "varchar(20)", Null: "YES", Default: null },
      { Field: "scope_value", Type: "varchar(100)", Null: "YES", Default: null },
      { Field: "group_type", Type: "varchar(50)", Null: "NO", Default: null },
      { Field: "group_value", Type: "varchar(100)", Null: "NO", Default: null },
    ],
    indexes: [
      { name: "ux_vacation_summary_scope_group", unique: true, columns: ["year", "scope_type", "group_type", "group_value"] },
    ],
    rows: [
      { id: 1, year: 2026, scope_type: "company", scope_value: null, group_type: "total", group_value: "all" },
    ],
  }),
  benefits_summary: createLegacyTableState({
    columns: [
      { Field: "id", Type: "int(11)", Null: "NO", Default: null },
      { Field: "scope_type", Type: "varchar(20)", Null: "YES", Default: null },
      { Field: "scope_value", Type: "varchar(100)", Null: "YES", Default: null },
      { Field: "plan_name", Type: "varchar(100)", Null: "NO", Default: null },
      { Field: "shareholder_type", Type: "varchar(20)", Null: "NO", Default: null },
    ],
    indexes: [
      { name: "benefits_summary_plan_name_shareholder_type", unique: true, columns: ["plan_name", "shareholder_type"] },
    ],
    rows: [
      { id: 1, scope_type: "company", scope_value: "", plan_name: "_overall", shareholder_type: "shareholder" },
      { id: 2, scope_type: null, scope_value: null, plan_name: "_overall", shareholder_type: "nonShareholder" },
    ],
  }),
});

const parseTableName = (sql, prefix) => {
  const match = sql.match(new RegExp(`${prefix} \\\`([^\\\`]+)\\\``));
  return match?.[1] || null;
};

const parseColumnDefinition = (ddl) => {
  const match = ddl.match(/`([^`]+)`\s+([A-Z]+(?:\(\d+(?:,\d+)?\))?)(.*)/i);
  if (!match) {
    throw new Error(`Unable to parse column definition: ${ddl}`);
  }

  const [, field, type, rest] = match;
  const defaultMatch = rest.match(/DEFAULT\s+'([^']*)'/i);

  return {
    Field: field,
    Type: type.toLowerCase(),
    Null: /\bNOT NULL\b/i.test(rest) ? "NO" : "YES",
    Default: defaultMatch ? defaultMatch[1] : null,
  };
};

const createQueryHarness = (state) => {
  const queryLog = [];
  const mutationLog = [];

  const applyAddColumn = (tableName, ddl) => {
    const column = parseColumnDefinition(ddl);
    state[tableName].columns.set(column.Field, column);

    for (const row of state[tableName].rows) {
      if (row[column.Field] === undefined || row[column.Field] === null || row[column.Field] === "") {
        row[column.Field] = column.Default;
      }
    }
  };

  const applyModifyColumn = (tableName, ddl) => {
    const column = parseColumnDefinition(ddl);
    if (column.Null === "NO") {
      const hasNullishRows = state[tableName].rows.some((row) => {
        const value = row[column.Field];
        return value === undefined || value === null || value === "";
      });
      if (hasNullishRows) {
        throw new Error(
          `Attempted to enforce NOT NULL on ${tableName}.${column.Field} before backfill completed`,
        );
      }
    }
    state[tableName].columns.set(column.Field, column);
  };

  const buildIndexRows = (tableName) => {
    const table = state[tableName];
    return [...table.indexes.values()].flatMap((index) =>
      index.columns.map((columnName, indexPosition) => ({
        Key_name: index.name,
        Column_name: columnName,
        Non_unique: index.unique ? 0 : 1,
        Seq_in_index: indexPosition + 1,
      })),
    );
  };

  const query = jest.fn(async (sql, options = {}) => {
    queryLog.push(sql);

    if (sql === "SHOW TABLES LIKE ?") {
      const tableName = options.replacements?.[0];
      return state[tableName] ? [[{ [`Tables_in_test (${tableName})`]: tableName }]] : [[]];
    }

    if (sql.startsWith("SHOW COLUMNS FROM `")) {
      const tableName = parseTableName(sql, "SHOW COLUMNS FROM");
      return [[...state[tableName].columns.values()]];
    }

    if (sql.startsWith("SHOW INDEX FROM `")) {
      const tableName = parseTableName(sql, "SHOW INDEX FROM");
      return [buildIndexRows(tableName)];
    }

    if (sql.startsWith("ALTER TABLE `") && sql.includes(" ADD COLUMN ")) {
      const tableName = parseTableName(sql, "ALTER TABLE");
      const ddl = sql.split(" ADD COLUMN ")[1];
      applyAddColumn(tableName, ddl);
      return [[], undefined];
    }

    if (sql.startsWith("ALTER TABLE `") && sql.includes(" MODIFY COLUMN ")) {
      const tableName = parseTableName(sql, "ALTER TABLE");
      const ddl = sql.split(" MODIFY COLUMN ")[1];
      applyModifyColumn(tableName, ddl);
      return [[], undefined];
    }

    if (sql.startsWith("ALTER TABLE `") && sql.includes(" DROP INDEX ")) {
      const tableName = parseTableName(sql, "ALTER TABLE");
      const indexMatch = sql.match(/DROP INDEX `([^`]+)`/);
      state[tableName].indexes.delete(indexMatch[1]);
      return [[], undefined];
    }

    if (sql.startsWith("CREATE UNIQUE INDEX `")) {
      const match = sql.match(/CREATE UNIQUE INDEX `([^`]+)` ON `([^`]+)` \((.+)\)/);
      const [, indexName, tableName, columns] = match;
      state[tableName].indexes.set(indexName, {
        name: indexName,
        unique: true,
        columns: columns.split(",").map((column) => column.trim().replace(/`/g, "")),
      });
      return [[], undefined];
    }

    if (sql.startsWith("UPDATE `") && sql.includes("SET `scope_type` = 'company'")) {
      const tableName = parseTableName(sql, "UPDATE");
      for (const row of state[tableName].rows) {
        if (row.scope_type === undefined || row.scope_type === null || row.scope_type === "") {
          row.scope_type = "company";
        }
      }
      mutationLog.push({
        tableName,
        type: "scope_type_update",
        rows: state[tableName].rows.map((row) => ({ ...row })),
      });
      return [[], undefined];
    }

    if (sql.startsWith("UPDATE `") && sql.includes("SET `scope_value` = '__company__'")) {
      const tableName = parseTableName(sql, "UPDATE");
      for (const row of state[tableName].rows) {
        if (row.scope_type === "company" && (row.scope_value === undefined || row.scope_value === null || row.scope_value === "")) {
          row.scope_value = "__company__";
        }
      }
      mutationLog.push({
        tableName,
        type: "scope_value_update",
        rows: state[tableName].rows.map((row) => ({ ...row })),
      });
      return [[], undefined];
    }

    throw new Error(`Unhandled query in test harness: ${sql}`);
  });

  return { mutationLog, query, queryLog };
};

describe("dashboard summary scope migration execution", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("migration upgrades legacy summary tables and reruns without add/drop/create churn", async () => {
    const state = createLegacyDatabaseState();
    const { query, queryLog } = createQueryHarness(state);

    jest.unstable_mockModule("../config.js", () => ({
      MYSQL_HOST: "localhost",
      MYSQL_PORT: "3306",
      MYSQL_USER: "root",
      MYSQL_PASSWORD: "",
      MYSQL_DATABASE: "test",
      MYSQL_AUTO_SYNC: false,
      MYSQL_REQUIRE_MIGRATIONS: false,
      NODE_ENV: "test",
    }));

    jest.unstable_mockModule("sequelize", () => ({
      Sequelize: class SequelizeMock {
        constructor() {
          this.query = query;
        }
      },
    }));

    const {
      DASHBOARD_COMPANY_SCOPE_VALUE,
      ensureDashboardSummaryScopeSupport,
    } = await import("../mysqlDatabase.js");

    await ensureDashboardSummaryScopeSupport();

    for (const tableName of ["earnings_summary", "vacation_summary", "benefits_summary"]) {
      const table = state[tableName];
      expect(table.columns.get("scope_type")).toEqual(expect.objectContaining({
        Null: "NO",
        Default: "company",
      }));
      expect(table.columns.get("scope_value")).toEqual(expect.objectContaining({
        Null: "NO",
        Default: DASHBOARD_COMPANY_SCOPE_VALUE,
      }));
      expect(table.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({
          scope_type: "company",
          scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
        }),
      ]));
    }

    expect([...state.earnings_summary.indexes.values()]).toEqual([
      expect.objectContaining({
        name: "ux_earnings_summary_scope_group",
        unique: true,
        columns: ["year", "scope_type", "scope_value", "group_type", "group_value"],
      }),
    ]);
    expect([...state.vacation_summary.indexes.values()]).toEqual([
      expect.objectContaining({
        name: "ux_vacation_summary_scope_group",
        unique: true,
        columns: ["year", "scope_type", "scope_value", "group_type", "group_value"],
      }),
    ]);
    expect([...state.benefits_summary.indexes.values()]).toEqual([
      expect.objectContaining({
        name: "ux_benefits_summary_scope_plan_shareholder",
        unique: true,
        columns: ["scope_type", "scope_value", "plan_name", "shareholder_type"],
      }),
    ]);

    const firstRunQueryCount = queryLog.length;
    await ensureDashboardSummaryScopeSupport();
    const secondRunQueries = queryLog.slice(firstRunQueryCount);

    expect(secondRunQueries.filter((sql) => /ADD COLUMN|DROP INDEX|CREATE UNIQUE INDEX/.test(sql))).toEqual([]);
  });

  test("partial migration state is repaired by explicit updates before NOT NULL enforcement", async () => {
    const state = createPartialMigrationDatabaseState();
    const { mutationLog, query, queryLog } = createQueryHarness(state);

    jest.unstable_mockModule("../config.js", () => ({
      MYSQL_HOST: "localhost",
      MYSQL_PORT: "3306",
      MYSQL_USER: "root",
      MYSQL_PASSWORD: "",
      MYSQL_DATABASE: "test",
      MYSQL_AUTO_SYNC: false,
      MYSQL_REQUIRE_MIGRATIONS: false,
      NODE_ENV: "test",
    }));

    jest.unstable_mockModule("sequelize", () => ({
      Sequelize: class SequelizeMock {
        constructor() {
          this.query = query;
        }
      },
    }));

    const {
      DASHBOARD_COMPANY_SCOPE_VALUE,
      ensureDashboardSummaryScopeSupport,
    } = await import("../mysqlDatabase.js");

    await ensureDashboardSummaryScopeSupport();

    for (const tableName of ["earnings_summary", "vacation_summary", "benefits_summary"]) {
      expect(state[tableName].rows).toEqual(expect.arrayContaining([
        expect.objectContaining({
          scope_type: "company",
          scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
        }),
      ]));
      expect(state[tableName].columns.get("scope_value")).toEqual(expect.objectContaining({
        Null: "NO",
        Default: DASHBOARD_COMPANY_SCOPE_VALUE,
      }));
    }

    expect(mutationLog).toEqual(expect.arrayContaining([
      expect.objectContaining({
        tableName: "earnings_summary",
        type: "scope_type_update",
        rows: expect.arrayContaining([
          expect.objectContaining({
            id: 2,
            scope_type: "company",
            scope_value: "",
          }),
        ]),
      }),
      expect.objectContaining({
        tableName: "earnings_summary",
        type: "scope_value_update",
        rows: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            scope_type: "company",
            scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
          }),
          expect.objectContaining({
            id: 2,
            scope_type: "company",
            scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
          }),
        ]),
      }),
      expect.objectContaining({
        tableName: "benefits_summary",
        type: "scope_value_update",
        rows: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            scope_type: "company",
            scope_value: DASHBOARD_COMPANY_SCOPE_VALUE,
          }),
        ]),
      }),
    ]));

    for (const tableName of ["earnings_summary", "vacation_summary", "benefits_summary"]) {
      const scopeValueUpdateIndex = queryLog.findIndex(
        (sql) => sql.startsWith(`UPDATE \`${tableName}\``) && sql.includes("SET `scope_value` = '__company__'"),
      );
      const scopeValueModifyIndex = queryLog.findIndex(
        (sql) => sql.startsWith(`ALTER TABLE \`${tableName}\``) && sql.includes("MODIFY COLUMN `scope_value`"),
      );

      expect(scopeValueUpdateIndex).toBeGreaterThan(-1);
      expect(scopeValueModifyIndex).toBeGreaterThan(scopeValueUpdateIndex);
    }

    const firstRunQueryCount = queryLog.length;
    await ensureDashboardSummaryScopeSupport();
    const secondRunQueries = queryLog.slice(firstRunQueryCount);

    expect(secondRunQueries.filter((sql) => /ADD COLUMN|DROP INDEX|CREATE UNIQUE INDEX/.test(sql))).toEqual([]);
  });
});
