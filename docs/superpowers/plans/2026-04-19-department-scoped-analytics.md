# Department-Scoped Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Analytics` department scope truthful at page level so charts, insight cards, and drilldowns all reflect the selected department instead of only changing drilldown defaults.

**Architecture:** Extend the pre-aggregated dashboard summary model to support company scope and department scope in the same tables, then thread that scope through backend contracts/controllers/cache and frontend analytics fetch/render flows. Keep `VacationChart` and `BenefitsChart` mostly reusable, but change `EarningsChart` and `ChartsSection` semantics when a department scope is active so the page tells an internal HR/department story rather than a company-wide department-comparison story.

**Tech Stack:** Express, Sequelize/MySQL summary tables, Mongo department mapping, React, Axios, Vitest, Jest

---

## File Structure

**Backend summary scope and aggregation**
- Modify: `D:\SIP_CS 2\SIP_CS\src\utils\dashboardContracts.js`
  - Add `department` to summary-query normalization.
- Create: `D:\SIP_CS 2\SIP_CS\src\services\dashboardScopeService.js`
  - Resolve department name/id for summary endpoints and reusable cache keys.
- Modify: `D:\SIP_CS 2\SIP_CS\src\models\sql\EarningsSummary.js`
- Modify: `D:\SIP_CS 2\SIP_CS\src\models\sql\VacationSummary.js`
- Modify: `D:\SIP_CS 2\SIP_CS\src\models\sql\BenefitsSummary.js`
  - Add scope columns/indexes shared by company + department rows.
- Modify: `D:\SIP_CS 2\SIP_CS\src\mysqlDatabase.js`
  - Add migration contract for the new summary-scope columns/indexes.
- Modify: `D:\SIP_CS 2\SIP_CS\scripts\aggregate-dashboard.js`
  - Populate company rows and department-scoped rows.
- Modify: `D:\SIP_CS 2\SIP_CS\src\workers\dashboardAggregationWorker.js`
  - No logic redesign; only ensure logs/behavior still match the new aggregate output.
- Modify: `D:\SIP_CS 2\SIP_CS\src\controllers\dashboard.controller.js`
  - Query summary rows by `year + scope`, update meta/cache keys, and expose scope-aware summaries.

**Frontend transport and analytics page behavior**
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\services\api.js`
  - Add `department` params to summary APIs.
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\hooks\useDashboardData.js`
  - Allow scoped analytics fetches without disturbing overview/alerts/integration slices.
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\pages\AnalyticsPage.jsx`
  - Refresh analytics by selected scope and pass scoped mode down.
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\AnalyticsFilterBar.jsx`
  - Rename “Drilldown scope” to true page scope semantics.
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\ChartsSection.jsx`
  - Switch highlight-card narrative between company-wide and department-scoped stories.
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\EarningsChart.jsx`
  - Use `byDepartment` for company scope, but `byEmploymentType`/internal subgroups for department scope.
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\VacationChart.jsx`
  - Keep behavior, but update labels if needed for scoped wording.
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\BenefitsChart.jsx`
  - Keep behavior, but ensure actions/copy remain truthful under scoped data.

**Tests**
- Modify: `D:\SIP_CS 2\SIP_CS\src\__tests__\dashboard.controller.contract.test.js`
- Create: `D:\SIP_CS 2\SIP_CS\src\__tests__\dashboard.summary-scope.contract.test.js`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\pages\AnalyticsPage.test.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\ChartsSection.test.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\EarningsChart.test.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\BenefitsChart.test.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\VacationChart.test.jsx`

**Docs**
- Modify: `D:\SIP_CS 2\SIP_CS\docs\demo\slide\group11_dashboard_capabilities_vi.md`
- Modify: `D:\SIP_CS 2\SIP_CS\docs\demo\slide\group11_slide_demo_script_vi.md`
  - Explain that Analytics scope now truly re-filters page-level charts.

---

### Task 1: Add Summary Scope Contract and Backend Failing Tests

**Files:**
- Create: `D:\SIP_CS 2\SIP_CS\src\services\dashboardScopeService.js`
- Modify: `D:\SIP_CS 2\SIP_CS\src\utils\dashboardContracts.js`
- Modify: `D:\SIP_CS 2\SIP_CS\src\__tests__\dashboard.controller.contract.test.js`

- [ ] **Step 1: Write the failing backend tests for scoped summary behavior**

```js
test("normalizeSummaryQuery accepts department scope", async () => {
  const { normalizeSummaryQuery } = await import("../utils/dashboardContracts.js");

  expect(normalizeSummaryQuery({ year: "2026", department: "Human Resources" })).toEqual({
    year: 2026,
    previousYear: 2025,
    department: "Human Resources",
  });
});

test("getEarningsSummary includes department scope in metadata and cache key", async () => {
  cacheGetMock.mockReturnValue(null);
  earningsSummaryFindAllMock.mockResolvedValue([
    {
      year: 2026,
      scope_type: "department",
      scope_value: "dep-hr",
      group_type: "employmentType",
      group_value: "Full-time",
      current_total: "1250000.00",
      previous_total: "1175000.00",
      employee_count: 42,
      computed_at: new Date("2026-04-19T02:00:00.000Z"),
    },
  ]);
  buildDepartmentNameMapMock.mockResolvedValue({
    map: new Map([["dep-hr", "Human Resources"]]),
  });

  const req = { query: { year: "2026", department: "Human Resources" } };
  const res = createRes();

  await getEarningsSummary(req, res);

  expect(cacheGetMock).toHaveBeenCalledWith("earnings", { year: 2026, department: "Human Resources" });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    meta: expect.objectContaining({
      filters: expect.objectContaining({ year: 2026, department: "Human Resources" }),
    }),
  }));
});
```

- [ ] **Step 2: Run the backend contract tests and confirm failure**

Run:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js src/__tests__/dashboard.controller.contract.test.js --runInBand
```

Expected:
- FAIL because `normalizeSummaryQuery()` does not yet return `department`
- FAIL because `getEarningsSummary()` still uses global cache params and global rows

- [ ] **Step 3: Add minimal contract/service scaffolding**

`D:\SIP_CS 2\SIP_CS\src\utils\dashboardContracts.js`

```js
export const normalizeSummaryQuery = (query = {}) => {
  const errors = [];
  const year = normalizeYear(query.year, errors);
  const department = normalizeBoundedString(query.department, {
    field: "department",
    errors,
  });
  assertNoValidationErrors(errors);
  return {
    year,
    previousYear: year - 1,
    department,
  };
};
```

`D:\SIP_CS 2\SIP_CS\src\services\dashboardScopeService.js`

```js
import { buildDepartmentNameMap, resolveDepartmentIdByName } from "../utils/departmentMapping.js";
import Department from "../models/Department.js";
import Employee from "../models/Employee.js";

export const resolveDashboardDepartmentScope = async (departmentName) => {
  if (!departmentName) {
    return { scopeType: "company", scopeValue: null, department: null };
  }

  const { map } = await buildDepartmentNameMap({
    DepartmentModel: Department,
    EmployeeModel: Employee,
  });
  const departmentId = resolveDepartmentIdByName(departmentName, map);
  if (!departmentId) {
    return { scopeType: "department", scopeValue: "__missing__", department: departmentName };
  }
  return {
    scopeType: "department",
    scopeValue: departmentId,
    department: map.get(departmentId) || departmentName,
  };
};
```

- [ ] **Step 4: Re-run the backend contract tests until the new normalization/service signatures pass**

Run:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js src/__tests__/dashboard.controller.contract.test.js --runInBand
```

Expected:
- The normalization test passes
- The controller test still fails until Task 3 finishes query/caching changes

- [ ] **Step 5: Commit**

```bash
git add src/utils/dashboardContracts.js src/services/dashboardScopeService.js src/__tests__/dashboard.controller.contract.test.js
git commit -m "test: add scoped analytics contract coverage"
```

---

### Task 2: Add Summary Scope to SQL Models and Aggregation Output

**Files:**
- Modify: `D:\SIP_CS 2\SIP_CS\src\models\sql\EarningsSummary.js`
- Modify: `D:\SIP_CS 2\SIP_CS\src\models\sql\VacationSummary.js`
- Modify: `D:\SIP_CS 2\SIP_CS\src\models\sql\BenefitsSummary.js`
- Modify: `D:\SIP_CS 2\SIP_CS\src\mysqlDatabase.js`
- Modify: `D:\SIP_CS 2\SIP_CS\scripts\aggregate-dashboard.js`
- Create: `D:\SIP_CS 2\SIP_CS\src\__tests__\dashboard.summary-scope.contract.test.js`

- [ ] **Step 1: Write failing tests for summary model scope fields and aggregation rows**

```js
import EarningsSummary from "../models/sql/EarningsSummary.js";
import VacationSummary from "../models/sql/VacationSummary.js";
import BenefitsSummary from "../models/sql/BenefitsSummary.js";

describe("dashboard summary scope contract", () => {
  test("summary models expose scope columns for company and department rows", () => {
    expect(EarningsSummary.rawAttributes.scope_type).toBeDefined();
    expect(EarningsSummary.rawAttributes.scope_value).toBeDefined();
    expect(VacationSummary.rawAttributes.scope_type).toBeDefined();
    expect(BenefitsSummary.rawAttributes.scope_type).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the new contract test and confirm failure**

Run:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js src/__tests__/dashboard.summary-scope.contract.test.js --runInBand
```

Expected:
- FAIL because the summary models do not yet define `scope_type` and `scope_value`

- [ ] **Step 3: Add scope fields and migration support**

`D:\SIP_CS 2\SIP_CS\src\models\sql\EarningsSummary.js`

```js
scope_type: {
  type: DataTypes.STRING(20),
  allowNull: false,
  defaultValue: "company",
},
scope_value: {
  type: DataTypes.STRING(100),
  allowNull: true,
},
```

Update indexes:

```js
indexes: [
  { unique: true, fields: ["year", "scope_type", "scope_value", "group_type", "group_value"] },
]
```

Repeat the same shape for `VacationSummary` and `BenefitsSummary`, using unique keys:

```js
{ unique: true, fields: ["scope_type", "scope_value", "plan_name", "shareholder_type"] }
```

`D:\SIP_CS 2\SIP_CS\src\mysqlDatabase.js`

```js
const DASHBOARD_SUMMARY_SCOPE_MIGRATION_ID = "20260419_000007_dashboard_summary_scope";

const ensureDashboardSummaryScopeSupport = async () => {
  for (const tableName of ["earnings_summary", "vacation_summary", "benefits_summary"]) {
    const columns = await getTableColumnNames(tableName);
    if (!columns.has("scope_type")) {
      await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`scope_type\` VARCHAR(20) NOT NULL DEFAULT 'company'`);
    }
    if (!columns.has("scope_value")) {
      await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`scope_value\` VARCHAR(100) NULL`);
    }
  }
};
```

Register that migration in `ACTIVE_POST_BOOTSTRAP_MIGRATIONS`.

- [ ] **Step 4: Extend aggregation output to emit company rows and department rows**

`D:\SIP_CS 2\SIP_CS\scripts\aggregate-dashboard.js`

```js
rows.push({
  year: targetYear,
  scope_type: "company",
  scope_value: null,
  group_type: "total",
  group_value: "all",
  current_total: total.current,
  previous_total: total.previous,
  employee_count: employeeCount,
  computed_at: now,
});

for (const [departmentId, aggregates] of Object.entries(byDepartmentScope)) {
  rows.push({
    year: targetYear,
    scope_type: "department",
    scope_value: departmentId,
    group_type: "total",
    group_value: "all",
    current_total: aggregates.total.current,
    previous_total: aggregates.total.previous,
    employee_count: aggregates.employeeCount,
    computed_at: now,
  });
}
```

Also emit scoped `employmentType`, `gender`, `ethnicity`, `shareholder`, and `plan_name` rows so HR/department charts can be built truthfully.

- [ ] **Step 5: Re-run the scope model test and MySQL schema readiness checks**

Run:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js src/__tests__/dashboard.summary-scope.contract.test.js --runInBand
npm run db:migrate:mysql:status
```

Expected:
- Contract test PASS
- MySQL status shows no missing required migrations after the new migration is wired

- [ ] **Step 6: Commit**

```bash
git add src/models/sql/EarningsSummary.js src/models/sql/VacationSummary.js src/models/sql/BenefitsSummary.js src/mysqlDatabase.js scripts/aggregate-dashboard.js src/__tests__/dashboard.summary-scope.contract.test.js
git commit -m "feat: add scoped dashboard summary storage"
```

---

### Task 3: Make Summary Controllers and Cache Keys Scope-Aware

**Files:**
- Modify: `D:\SIP_CS 2\SIP_CS\src\controllers\dashboard.controller.js`
- Modify: `D:\SIP_CS 2\SIP_CS\src\__tests__\dashboard.controller.contract.test.js`

- [ ] **Step 1: Write failing controller tests for scoped query behavior**

```js
test("getVacationSummary queries department-scoped rows when department is supplied", async () => {
  const req = { query: { year: "2026", department: "Human Resources" } };
  const res = createRes();

  VacationSummary.findAll.mockResolvedValue([
    {
      year: 2026,
      scope_type: "department",
      scope_value: "dep-hr",
      group_type: "gender",
      group_value: "Female",
      current_total: 42,
      previous_total: 38,
      employee_count: 12,
      computed_at: new Date("2026-04-19T02:00:00.000Z"),
    },
  ]);

  await getVacationSummary(req, res);

  expect(VacationSummary.findAll).toHaveBeenCalledWith(expect.objectContaining({
    where: { year: 2026, scope_type: "department", scope_value: "dep-hr" },
    raw: true,
  }));
});
```

- [ ] **Step 2: Run the backend controller test and confirm failure**

Run:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js src/__tests__/dashboard.controller.contract.test.js --runInBand
```

Expected:
- FAIL because controller still queries only by year and still caches only by year

- [ ] **Step 3: Implement scope-aware summary queries and metadata**

`D:\SIP_CS 2\SIP_CS\src\controllers\dashboard.controller.js`

```js
const { year: currentYear, previousYear, department } = normalizeSummaryQuery(req.query);
const scope = await resolveDashboardDepartmentScope(department);

if (scope.scopeType === "department" && scope.scopeValue === "__missing__") {
  return res.json(buildEmptyScopedSummaryResponse({ year: currentYear, department }));
}

const cacheParams = { year: currentYear, department: scope.department || "" };
const summaries = await EarningsSummary.findAll({
  where: {
    year: currentYear,
    scope_type: scope.scopeType,
    scope_value: scope.scopeValue,
  },
  raw: true,
});
```

For benefits:

```js
const cacheParams = { department: scope.department || "" };
const summaries = await BenefitsSummary.findAll({
  where: {
    scope_type: scope.scopeType,
    scope_value: scope.scopeValue,
  },
  raw: true,
});
```

Meta must include:

```js
filters: {
  year: currentYear,
  ...(scope.department ? { department: scope.department } : {}),
}
```

- [ ] **Step 4: Re-run backend controller tests**

Run:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js src/__tests__/dashboard.controller.contract.test.js --runInBand
```

Expected:
- PASS for summary query normalization, scoped cache keys, and metadata

- [ ] **Step 5: Commit**

```bash
git add src/controllers/dashboard.controller.js src/__tests__/dashboard.controller.contract.test.js
git commit -m "feat: serve scoped analytics summaries"
```

---

### Task 4: Thread Scope Through Frontend Fetches and Page Semantics

**Files:**
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\services\api.js`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\hooks\useDashboardData.js`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\pages\AnalyticsPage.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\AnalyticsFilterBar.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\pages\AnalyticsPage.test.jsx`

- [ ] **Step 1: Write failing frontend tests for scoped summary refresh**

```jsx
it("refreshes analytics summaries with the selected department scope", async () => {
  const user = userEvent.setup();
  dashboardContext.fetchEarnings.mockResolvedValue();
  dashboardContext.fetchVacation.mockResolvedValue();
  dashboardContext.fetchBenefits.mockResolvedValue();
  getDepartments.mockResolvedValue(["Human Resources"]);

  renderPage();

  await user.selectOptions(screen.getByLabelText(/scope/i), "Human Resources");
  await user.click(screen.getByRole("button", { name: /refresh analytics/i }));

  expect(dashboardContext.fetchEarnings).toHaveBeenCalledWith(2026, { department: "Human Resources" });
  expect(dashboardContext.fetchVacation).toHaveBeenCalledWith(2026, { department: "Human Resources" });
  expect(dashboardContext.fetchBenefits).toHaveBeenCalledWith({ department: "Human Resources" });
});
```

- [ ] **Step 2: Run the Analytics page tests and confirm failure**

Run:

```powershell
npm --prefix "D:\SIP_CS 2\SIP_CS\dashboard" run test -- AnalyticsPage
```

Expected:
- FAIL because fetches do not yet pass `department`
- FAIL because filter-bar copy still says `Drilldown scope`

- [ ] **Step 3: Update FE API and page scope behavior**

`D:\SIP_CS 2\SIP_CS\dashboard\src\services\api.js`

```js
export const getEarningsSummary = async (year, { department, ...config } = {}) => {
  const response = await dashboardApi.get("/dashboard/earnings", {
    params: { year, ...(department ? { department } : {}) },
    ...config,
  });
  return response.data;
};
```

Repeat for `getVacationSummary` and `getBenefitsSummary`.

`D:\SIP_CS 2\SIP_CS\dashboard\src\pages\AnalyticsPage.jsx`

```jsx
const scopedRequest = departmentScope ? { department: departmentScope } : {};

const refreshAnalytics = useCallback(async () => {
  await Promise.allSettled([
    fetchEarnings(currentYear, scopedRequest),
    fetchVacation(currentYear, scopedRequest),
    fetchBenefits(scopedRequest),
  ]);
}, [currentYear, departmentScope, fetchBenefits, fetchEarnings, fetchVacation]);
```

`D:\SIP_CS 2\SIP_CS\dashboard\src\components\AnalyticsFilterBar.jsx`

```jsx
const scopeHint = hasScope
  ? `Analytics and drilldowns now focus on ${departmentScope}.`
  : "Analytics cover all departments.";
```

Rename the visible label from `Drilldown scope` to `Scope`.

- [ ] **Step 4: Re-run frontend scope tests**

Run:

```powershell
npm --prefix "D:\SIP_CS 2\SIP_CS\dashboard" run test -- AnalyticsPage
```

Expected:
- PASS for scoped fetches
- PASS for updated scope wording

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/services/api.js dashboard/src/hooks/useDashboardData.js dashboard/src/pages/AnalyticsPage.jsx dashboard/src/components/AnalyticsFilterBar.jsx dashboard/src/pages/AnalyticsPage.test.jsx
git commit -m "feat: thread analytics department scope through frontend fetches"
```

---

### Task 5: Make Analytics Highlights and Earnings Chart Truthful Under Department Scope

**Files:**
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\ChartsSection.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\EarningsChart.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\ChartsSection.test.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\EarningsChart.test.jsx`

- [ ] **Step 1: Write failing tests for scoped analytics story**

```jsx
it("changes the lead narrative when a department scope is active", () => {
  render(
    <ChartsSection
      earnings={{
        byDepartment: {},
        byEmploymentType: {
          "Full-time": { current: 900000, previous: 820000 },
          "Part-time": { current: 200000, previous: 210000 },
        },
        byGender: {
          Female: { current: 650000, previous: 600000 },
          Male: { current: 450000, previous: 430000 },
        },
      }}
      vacation={{ byDepartment: {}, byGender: {}, byEthnicity: {}, byEmploymentType: {}, byShareholder: {}, totals: { current: 0, previous: 0 } }}
      benefits={{ byPlan: {}, byShareholder: {} }}
      departmentScope="Human Resources"
      onDrilldown={vi.fn()}
      onContextDrilldown={vi.fn()}
    />
  );

  expect(screen.getByText(/Full-time staff lead Human Resources payroll/i)).toBeInTheDocument();
});
```

```jsx
it("renders employment type as the primary series when scoped to a department", () => {
  render(
    <EarningsChart
      scopedMode="department"
      scopeLabel="Human Resources"
      data={earningsData}
      onDrilldown={vi.fn()}
    />
  );

  expect(screen.getByText(/Open workforce mix drilldown/i)).toBeInTheDocument();
  expect(screen.getByText(/Full-time dominates the employment mix/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the chart tests and confirm failure**

Run:

```powershell
npm --prefix "D:\SIP_CS 2\SIP_CS\dashboard" run test -- ChartsSection EarningsChart
```

Expected:
- FAIL because both components only know company-wide department narratives

- [ ] **Step 3: Implement scoped-mode chart semantics**

`D:\SIP_CS 2\SIP_CS\dashboard\src\components\ChartsSection.jsx`

```jsx
const isScoped = Boolean(departmentScope);

const scopedEarningsRows = Object.entries(earnings?.byEmploymentType || {}).map(([name, values]) => ({
  name,
  current: Number(values?.current || 0),
  previous: Number(values?.previous || 0),
}));

if (isScoped && scopedEarningsRows.length > 0) {
  const topEmploymentType = [...scopedEarningsRows].sort((a, b) => b.current - a.current)[0];
  insights.push({
    key: "earnings-concentration",
    eyebrow: "Payroll concentration",
    title: `${topEmploymentType.name} staff lead ${departmentScope} payroll`,
    detail: `${sharePct.toFixed(1)}% of current payroll | ${formatMoney(topEmploymentType.current)}`,
    filters: { context: "earnings", department: departmentScope, employmentType: topEmploymentType.name },
  });
}
```

`D:\SIP_CS 2\SIP_CS\dashboard\src\components\EarningsChart.jsx`

```jsx
function EarningsChart({ data, onDrilldown, scopedMode = "company", scopeLabel = "" }) {
  const primarySeries = scopedMode === "department"
    ? Object.entries(data.byEmploymentType).map(([name, values]) => ({
        name,
        current: Math.round(values.current),
        previous: Math.round(values.previous),
      }))
    : Object.entries(data.byDepartment).map(([name, values]) => ({
        name,
        current: Math.round(values.current),
        previous: Math.round(values.previous),
      }));
```

Propagate `departmentScope` into `EarningsChart` from `ChartsSection`.

- [ ] **Step 4: Re-run chart tests**

Run:

```powershell
npm --prefix "D:\SIP_CS 2\SIP_CS\dashboard" run test -- ChartsSection EarningsChart
```

Expected:
- PASS with scoped narrative and scoped chart dimension

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/components/ChartsSection.jsx dashboard/src/components/EarningsChart.jsx dashboard/src/components/ChartsSection.test.jsx dashboard/src/components/EarningsChart.test.jsx
git commit -m "feat: make analytics insights truthful under department scope"
```

---

### Task 6: Verify Vacation/Benefits Reuse, Update Docs, and Run Final Gates

**Files:**
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\VacationChart.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\BenefitsChart.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\VacationChart.test.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\dashboard\src\components\BenefitsChart.test.jsx`
- Modify: `D:\SIP_CS 2\SIP_CS\docs\demo\slide\group11_dashboard_capabilities_vi.md`
- Modify: `D:\SIP_CS 2\SIP_CS\docs\demo\slide\group11_slide_demo_script_vi.md`

- [ ] **Step 1: Write the final FE tests for scoped vacation/benefits actions**

```jsx
it("preserves department scope when opening a vacation segment drilldown", async () => {
  const user = userEvent.setup();
  const onDrilldown = vi.fn();
  render(<VacationChart data={vacationData} onDrilldown={onDrilldown} />);

  await user.click(screen.getByRole("button", { name: /Open top segment drilldown/i }));
  expect(onDrilldown).toHaveBeenCalledWith(expect.objectContaining({ ethnicity: "Caucasian" }));
});
```

The page-level integration test in `AnalyticsPage.test.jsx` should already ensure `department=Human Resources` is preserved when those actions bubble up.

- [ ] **Step 2: Adjust copy only where scoped behavior needs clarification**

`D:\SIP_CS 2\SIP_CS\dashboard\src\components\BenefitsChart.jsx`

```jsx
<span className="summary-label">
  {scopeLabel ? `Highest impact plan in ${scopeLabel}` : "Highest impact plan"}
</span>
```

Keep `VacationChart` mostly unchanged. Only update section labels if they need scoped wording; do not redesign a working component.

- [ ] **Step 3: Update Group 11 docs so claims match the new behavior**

`D:\SIP_CS 2\SIP_CS\docs\demo\slide\group11_dashboard_capabilities_vi.md`

```md
- Trang Analytics hỗ trợ scope theo phòng ban thật ở mức page-level.
- Khi chọn Human Resources, các summary cards, Earnings, Time Off, và Benefits sẽ phản ánh riêng dữ liệu của phòng ban HR.
- Drilldown tiếp tục kế thừa scope đó để mở đúng danh sách nhân viên chi tiết.
```

`D:\SIP_CS 2\SIP_CS\docs\demo\slide\group11_slide_demo_script_vi.md`

```md
2. Chọn `Scope = Human Resources`.
3. Giải thích rằng toàn bộ insight cards và chart giờ đã chuyển sang dữ liệu riêng của HR.
4. Mở một drilldown từ chart để chứng minh scope được giữ xuyên suốt.
```

- [ ] **Step 4: Run the full FE and BE verification gates**

Run:

```powershell
npm --prefix "D:\SIP_CS 2\SIP_CS\dashboard" run test -- VacationChart BenefitsChart AnalyticsPage ChartsSection EarningsChart
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.js src/__tests__/dashboard.controller.contract.test.js src/__tests__/dashboard.summary-scope.contract.test.js --runInBand
npm --prefix "D:\SIP_CS 2\SIP_CS\dashboard" run verify:frontend
npm run verify:backend
```

Expected:
- All targeted tests PASS
- `verify:frontend` PASS
- `verify:backend` PASS

- [ ] **Step 5: Run the end-to-end gate**

Run:

```powershell
npm run verify:all
```

Expected:
- PASS
- `case3` remains green
- no analytics-scope regression in the existing stack

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/components/VacationChart.jsx dashboard/src/components/BenefitsChart.jsx dashboard/src/components/VacationChart.test.jsx dashboard/src/components/BenefitsChart.test.jsx docs/demo/slide/group11_dashboard_capabilities_vi.md docs/demo/slide/group11_slide_demo_script_vi.md
git commit -m "docs: align scoped analytics behavior and update demo script"
```

---

## Self-Review

### 1. Spec coverage
- Requirement: page-level department scope must be truthful, not just drilldown-only.
  - Covered by Tasks 1-4.
- Requirement: charts must show useful HR/department behavior, not company-wide department stories.
  - Covered by Task 5.
- Requirement: docs/demo script must match real behavior.
  - Covered by Task 6.

### 2. Placeholder scan
- No `TODO`, `TBD`, or “write tests later” placeholders remain.
- All tasks name exact files, commands, and representative code snippets.

### 3. Type consistency
- Scope field names are consistently `department`, `scope_type`, and `scope_value`.
- FE scoped mode uses `departmentScope`, `scopedMode`, and `scopeLabel` consistently.
- Summary filters in meta are consistently `year` and optional `department`.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-19-department-scoped-analytics.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
