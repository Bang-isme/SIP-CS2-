import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import { Op } from "sequelize";
import { writeFile } from "node:fs/promises";
import connectMongo from "../src/database.js";
import Employee from "../src/models/Employee.js";
import sequelize, { connectMySQL } from "../src/mysqlDatabase.js";
import { AlertsSummary, BenefitPlan, EmployeeBenefit } from "../src/models/sql/index.js";
import { refreshAlertAggregates } from "../src/services/alertAggregationService.js";
import { prepareDashboardDemo } from "../src/services/dashboardDemoPreparationService.js";

loadEnv();

const SA_BASE_URL = process.env.SA_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000/api";
const DASHBOARD_BASE_URL = process.env.DASHBOARD_PUBLIC_API_BASE_URL || "http://127.0.0.1:4200/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin_dev";
const DEFAULT_NOTE = process.env.DASHBOARD_DEMO_ALERT_NOTE
  || `Demo baseline reviewed on ${new Date().toISOString().slice(0, 10)}. Current alert queue has an assigned owner.`;
const OUTPUT_PATH = process.env.DASHBOARD_DEMO_PREP_OUTPUT_PATH || "";

const toDateOnly = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const toDateOnlyString = (value) => toDateOnly(value).toISOString().slice(0, 10);
const shiftDateByDays = (value, days) => {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}: ${body?.message || body?.raw || response.statusText}`);
  }

  return body;
};

const ensureDataConnections = async () => {
  await connectMongo();
  const mysqlConnected = await connectMySQL();
  if (!mysqlConnected) {
    throw new Error("MySQL connection failed while preparing dashboard demo evidence.");
  }
};

const getTriggeredAlertTypesFromSql = async () => {
  const rows = await AlertsSummary.findAll({
    attributes: ["alert_type", "computed_at"],
    raw: true,
  });
  return new Set(rows.map((row) => row.alert_type).filter(Boolean));
};

const pickDemoEmployee = async (projection = "employeeId") => {
  const employee = await Employee.findOne({})
    .sort({ updatedAt: -1, createdAt: -1, employeeId: 1 })
    .select(projection)
    .lean();

  if (!employee?.employeeId) {
    throw new Error("Unable to find an employee record for dashboard demo preparation.");
  }

  return employee;
};

const provisionAnniversaryEvidence = async (threshold) => {
  const employee = await pickDemoEmployee("employeeId hireDate");
  const now = new Date();
  const daysAhead = Math.min(Math.max(Number(threshold || 30), 0), 3);
  const targetDate = shiftDateByDays(now, daysAhead);
  const targetHireDate = new Date(targetDate);
  targetHireDate.setFullYear(targetDate.getFullYear() - 5);

  await Employee.updateOne(
    { employeeId: employee.employeeId },
    { $set: { hireDate: targetHireDate } },
  );

  return employee.employeeId;
};

const provisionVacationEvidence = async (threshold) => {
  const employee = await pickDemoEmployee("employeeId vacationDays");
  const vacationDays = Math.max(Number(threshold || 20) + 1, 1);

  await Employee.updateOne(
    { employeeId: employee.employeeId },
    { $set: { vacationDays } },
  );

  return employee.employeeId;
};

const provisionBirthdayEvidence = async () => {
  const employee = await pickDemoEmployee("employeeId birthDate");
  const now = new Date();
  const targetBirthDate = new Date(now.getFullYear() - 30, now.getMonth(), Math.min(now.getDate(), 28));

  await Employee.updateOne(
    { employeeId: employee.employeeId },
    { $set: { birthDate: targetBirthDate } },
  );

  return employee.employeeId;
};

const pickBenefitsDemoRow = async () => {
  const recentRows = await EmployeeBenefit.findAll({
    where: {
      employee_id: { [Op.ne]: null },
      is_active: true,
    },
    order: [
      ["last_change_date", "DESC"],
      ["updatedAt", "DESC"],
      ["id", "ASC"],
    ],
    limit: 50,
    raw: true,
  });

  for (const row of recentRows) {
    if (!row?.employee_id) continue;
    const employeeExists = await Employee.exists({ employeeId: row.employee_id });
    if (employeeExists) {
      return row;
    }
  }

  return null;
};

const provisionBenefitsChangeEvidence = async () => {
  const today = new Date();
  const todayDateOnly = toDateOnlyString(today);
  const benefitRow = await pickBenefitsDemoRow();

  if (!benefitRow) {
    const employee = await pickDemoEmployee("employeeId");
    const plan = await BenefitPlan.findOne({
      order: [["id", "ASC"]],
      raw: true,
    });

    if (!plan?.id) {
      throw new Error("Unable to find a benefits plan to provision benefits-change demo evidence.");
    }

    const createdRow = await EmployeeBenefit.create({
      employee_id: employee.employeeId,
      plan_id: plan.id,
      amount_paid: 0,
      effective_date: todayDateOnly,
      last_change_date: todayDateOnly,
      is_active: true,
    });

    return createdRow.employee_id;
  }

  await EmployeeBenefit.update(
    {
      last_change_date: todayDateOnly,
      effective_date: benefitRow.effective_date || todayDateOnly,
      is_active: true,
    },
    {
      where: { id: benefitRow.id },
    },
  );

  return benefitRow.employee_id;
};

const provisionAlertEvidence = async (alertType, threshold) => {
  switch (alertType) {
    case "anniversary":
      return provisionAnniversaryEvidence(threshold);
    case "vacation":
      return provisionVacationEvidence(threshold);
    case "birthday":
      return provisionBirthdayEvidence();
    case "benefits_change":
      return provisionBenefitsChangeEvidence();
    default:
      throw new Error(`Unsupported demo alert type: ${alertType}`);
  }
};

const closeDataConnections = async () => {
  const closeOps = [];
  if (sequelize) {
    closeOps.push(sequelize.close().catch(() => undefined));
  }
  if (mongoose.connection.readyState !== 0) {
    closeOps.push(mongoose.disconnect().catch(() => undefined));
  }
  await Promise.all(closeOps);
};

const main = async () => {
  await ensureDataConnections();

  const signIn = await requestJson(`${SA_BASE_URL}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  const token = signIn?.token || signIn?.data?.token;
  if (!token) {
    throw new Error("Sign-in succeeded without returning a JWT token.");
  }

  const authHeaders = {
    "Content-Type": "application/json",
    "x-access-token": token,
  };

  const alertConfigResponse = await requestJson(`${DASHBOARD_BASE_URL}/alerts`, {
    headers: authHeaders,
  });
  const report = await prepareDashboardDemo({
    fetchActiveAlerts: async () => (
      Array.isArray(alertConfigResponse?.data)
        ? alertConfigResponse.data.filter((item) => item?.isActive)
        : []
    ),
    getTriggeredAlertTypes: getTriggeredAlertTypesFromSql,
    provisionAlertEvidence,
    refreshAlertAggregates,
    fetchTriggeredAlerts: async () => {
      const triggered = await requestJson(`${DASHBOARD_BASE_URL}/alerts/triggered`, {
        headers: authHeaders,
      });
      return Array.isArray(triggered?.data) ? triggered.data : [];
    },
    acknowledgeAlert: async (alertId, note) => {
      await requestJson(`${DASHBOARD_BASE_URL}/alerts/${alertId}/acknowledge`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ note }),
      });
    },
    fetchExecutiveBrief: () => requestJson(
      `${DASHBOARD_BASE_URL}/dashboard/executive-brief?year=${new Date().getFullYear()}`,
      {
        headers: authHeaders,
      },
    ),
    note: DEFAULT_NOTE,
  });

  if (OUTPUT_PATH) {
    await writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf8");
  }

  console.log(JSON.stringify(report, null, 2));
};

const run = async () => {
  try {
    await main();
  } catch (error) {
    console.error(JSON.stringify({
      status: "error",
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await closeDataConnections();
  }
};

await run();
