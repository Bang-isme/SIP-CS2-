import { config as loadEnv } from "dotenv";
loadEnv();

const SA_BASE_URL = process.env.SA_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000/api";
const DASHBOARD_BASE_URL = process.env.DASHBOARD_PUBLIC_API_BASE_URL || "http://127.0.0.1:4200/api";
const PAYROLL_BASE_URL = process.env.PAYROLL_PUBLIC_API_BASE_URL || "http://127.0.0.1:4100/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin_dev";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const poll = async (fn, matcher, { attempts = 20, delayMs = 1000, label = "poll" } = {}) => {
  let lastValue = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastValue = await fn();
    } catch (error) {
      lastValue = { error: error.message };
    }
    if (matcher(lastValue)) {
      return lastValue;
    }
    await sleep(delayMs);
  }
  throw new Error(`${label} did not converge in time. Last value: ${JSON.stringify(lastValue)}`);
};

const main = async () => {
  const report = {
    checkedAt: new Date().toISOString(),
    services: {},
    employeeId: null,
  };

  report.services.sa = await requestJson(`${SA_BASE_URL}/health/live`);
  report.services.payroll = await requestJson(`${PAYROLL_BASE_URL}/health/live`);
  report.services.dashboard = await requestJson(`${DASHBOARD_BASE_URL}/health/live`);

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
    throw new Error("Sign-in succeeded without a JWT token.");
  }

  const authHeaders = {
    "Content-Type": "application/json",
    "x-access-token": token,
  };

  const createPayload = {
    firstName: "Case3",
    lastName: "Verifier",
    employmentType: "Full-time",
    payRate: 41.5,
    vacationDays: 5,
    paidToDate: 1000,
    paidLastYear: 1200,
  };

  const created = await requestJson(`${SA_BASE_URL}/employee`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(createPayload),
  });
  report.employeeId = created?.data?.employeeId || null;
  if (!report.employeeId) {
    throw new Error("Employee creation succeeded without returning an employeeId.");
  }
  report.created = created.sync;

  const payrollCreate = await poll(
    () => requestJson(`${PAYROLL_BASE_URL}/payroll/pay-rates/${report.employeeId}`, {
      headers: authHeaders,
    }),
    (payload) => Number(payload?.data?.current?.payRate) === 41.5,
    { label: "Payroll create propagation" },
  );
  report.payrollAfterCreate = payrollCreate.data.current;

  const employeeMongoId = created?.data?._id;
  const updated = await requestJson(`${SA_BASE_URL}/employee/${employeeMongoId}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      payRate: 55,
    }),
  });
  report.updated = updated.sync;

  const payrollUpdate = await poll(
    () => requestJson(`${PAYROLL_BASE_URL}/payroll/pay-rates/${report.employeeId}`, {
      headers: authHeaders,
    }),
    (payload) => Number(payload?.data?.current?.payRate) === 55 && payload?.data?.current?.payType === "HOURLY",
    { label: "Payroll update propagation" },
  );
  report.payrollAfterUpdate = payrollUpdate.data.current;

  report.dashboardExecutiveBrief = await requestJson(`${DASHBOARD_BASE_URL}/dashboard/executive-brief?year=${new Date().getFullYear()}`, {
    headers: authHeaders,
  });
  const freshnessStatus = report.dashboardExecutiveBrief?.data?.freshness?.global?.status;
  if (freshnessStatus !== "fresh") {
    throw new Error(`Dashboard executive brief freshness is '${freshnessStatus || "unknown"}' instead of 'fresh'.`);
  }
  const actionCenterStatus = report.dashboardExecutiveBrief?.data?.actionCenter?.status;
  if (actionCenterStatus === "critical") {
    throw new Error("Dashboard executive brief is still in 'Action Required' state after demo preparation.");
  }
  const alertNeedsAttention = report.dashboardExecutiveBrief?.data?.alerts?.followUp?.needsAttentionCategories;
  if (Number(alertNeedsAttention || 0) > 0) {
    throw new Error(`Dashboard alert follow-up still has ${alertNeedsAttention} category(s) needing attention.`);
  }

  const deleted = await requestJson(`${SA_BASE_URL}/employee/${employeeMongoId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  report.deleted = deleted.sync;

  const payrollDelete = await poll(
    () => requestJson(`${PAYROLL_BASE_URL}/payroll/pay-rates/${report.employeeId}`, {
      headers: authHeaders,
    }),
    (payload) => payload?.data?.history?.some((entry) => entry.payType === "TERMINATED"),
    {
      attempts: 40,
      delayMs: 1000,
      label: "Payroll delete propagation",
    },
  );
  report.payrollAfterDelete = payrollDelete.data.latestSync || payrollDelete.data.current;

  console.log(JSON.stringify({
    status: "ok",
    report,
  }, null, 2));
};

main().catch((error) => {
  console.error(JSON.stringify({
    status: "error",
    message: error.message,
  }, null, 2));
  process.exit(1);
});
