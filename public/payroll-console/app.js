import { revokeSharedSessionFlow } from "./sessionFlow.js";

const state = {
  token: "",
  saApiBaseUrl: "",
  links: {},
};

const urlParams = new URLSearchParams(window.location.search);
const isLocalDemoHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const requestedEmployeeIdFromUrl = urlParams.get("employeeId")?.trim() || "";
const demoLoginRequested = isLocalDemoHost && urlParams.get("demoLogin") === "1";
const DEMO_ADMIN_EMAIL = "admin@localhost";
const DEMO_ADMIN_PASSWORD = "admin_dev";

const elements = {
  shell: document.getElementById("shell"),
  loginForm: document.getElementById("login-form"),
  loginSubmit: document.getElementById("login-submit"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  authNotice: document.getElementById("auth-notice"),
  saBase: document.getElementById("sa-base"),
  sessionState: document.getElementById("session-state"),
  clearSession: document.getElementById("clear-session"),
  healthSummary: document.getElementById("health-summary"),
  readinessSession: document.getElementById("readiness-session"),
  readinessSessionDetail: document.getElementById("readiness-session-detail"),
  readinessHealth: document.getElementById("readiness-health"),
  readinessHealthDetail: document.getElementById("readiness-health-detail"),
  readinessEvidence: document.getElementById("readiness-evidence"),
  readinessEvidenceDetail: document.getElementById("readiness-evidence-detail"),
  refreshHealth: document.getElementById("refresh-health"),
  employeeId: document.getElementById("employee-id"),
  lookupRecord: document.getElementById("lookup-record"),
  recordState: document.getElementById("record-state"),
  recordLayout: document.getElementById("record-layout"),
  metricEmployeeId: document.getElementById("metric-employee-id"),
  metricPayRate: document.getElementById("metric-pay-rate"),
  metricPayType: document.getElementById("metric-pay-type"),
  metricSyncStatus: document.getElementById("metric-sync-status"),
  payrateHistory: document.getElementById("payrate-history"),
  syncLog: document.getElementById("sync-log"),
  serviceLinksCaption: document.getElementById("service-links-caption"),
  linkPayrollHealth: document.getElementById("link-payroll-health"),
  linkSaHome: document.getElementById("link-sa-home"),
  linkSaDocs: document.getElementById("link-sa-docs"),
  linkDashboard: document.getElementById("link-dashboard"),
};

const normalizeErrorMessage = (error, fallback) => {
  if (error?.name === "TypeError" && /fetch/i.test(error.message || "")) {
    return `${fallback} Check that the service is reachable.`;
  }
  return error?.message || fallback;
};

const setNotice = (message, tone = "") => {
  elements.authNotice.textContent = message || "";
  if (tone) {
    elements.authNotice.dataset.tone = tone;
    return;
  }
  delete elements.authNotice.dataset.tone;
};

const setReadinessState = ({ key, value, detail }) => {
  const valueElement = elements[`readiness${key}`];
  const detailElement = elements[`readiness${key}Detail`];
  if (valueElement && typeof value === "string") {
    valueElement.textContent = value;
  }
  if (detailElement && typeof detail === "string") {
    detailElement.textContent = detail;
  }
};

const setSessionState = (signedIn) => {
  if (elements.shell) {
    elements.shell.dataset.session = signedIn ? "signed-in" : "signed-out";
  }
  elements.sessionState.textContent = signedIn ? "Signed in" : "Signed out";
  elements.sessionState.dataset.state = signedIn ? "signed-in" : "signed-out";
  elements.clearSession.disabled = !signedIn;
  elements.loginSubmit.textContent = signedIn ? "Refresh" : "Sign in";
  setReadinessState({
    key: "Session",
    value: signedIn ? "Session active" : "Awaiting sign-in",
    detail: signedIn
      ? "Ready for lookup."
      : "Sign in via SA.",
  });
};

const authHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (state.token) {
    headers["x-access-token"] = state.token;
  }
  return headers;
};

const setLink = (element, href, label) => {
  if (!element || !href) {
    return;
  }
  element.href = href;
  if (label) {
    element.textContent = label;
  }
};

const resetRecordView = (message = "Sign in and open one payroll record.") => {
  elements.recordLayout.classList.add("hidden");
  elements.recordState.classList.remove("hidden");
  elements.recordState.textContent = message;
  delete elements.recordLayout.dataset.employeeId;
  if (elements.shell) {
    elements.shell.dataset.evidence = "empty";
  }
  setReadinessState({
    key: "Evidence",
    value: "No record loaded",
    detail: "Open one record.",
  });
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const extractToken = (payload) => payload?.token || payload?.data?.token || "";

const renderHealth = (payload) => {
  const fragments = [];
  fragments.push(`
    <span class="health-pill" data-state="${payload.status}">
      Service ${payload.status}
    </span>
  `);
  Object.entries(payload.services || {}).forEach(([name, details]) => {
    fragments.push(`
      <span class="health-pill" data-state="${details.status}">
        ${name}: ${details.status}
      </span>
    `);
  });
  elements.healthSummary.innerHTML = fragments.join("");
  const serviceStates = Object.values(payload.services || {});
  const isHealthy = payload.status === "ok" && serviceStates.every((details) => details.status === "connected");
  setReadinessState({
    key: "Health",
    value: isHealthy ? "Healthy" : payload.status === "ok" ? "Degraded" : "Needs attention",
    detail: isHealthy
      ? "Service and MySQL responded."
      : "Refresh before review.",
  });
};

const renderRecord = (payload) => {
  elements.recordState.classList.add("hidden");
  elements.recordLayout.classList.remove("hidden");
  elements.recordLayout.dataset.employeeId = payload.employeeId || "";
  if (elements.shell) {
    elements.shell.dataset.evidence = "loaded";
  }

  elements.metricEmployeeId.textContent = payload.employeeId || "--";
  elements.metricPayRate.textContent = formatMoney(payload.current?.payRate);
  elements.metricPayType.textContent = payload.current?.payType || "--";
  elements.metricSyncStatus.textContent = payload.latestSync?.status || "No sync log";

  elements.payrateHistory.innerHTML = (payload.history || []).map((entry) => `
    <article class="timeline-row">
      <strong>${formatMoney(entry.payRate)} | ${entry.payType}</strong>
      <small>Effective ${formatDate(entry.effectiveDate)}${entry.isActive ? " | active" : ""}</small>
    </article>
  `).join("");

  elements.syncLog.innerHTML = (payload.syncLog || []).map((entry) => `
    <article class="sync-log__row">
      <strong>${entry.status} | ${entry.action}</strong>
      <small>${formatDate(entry.createdAt)} | correlation ${entry.correlationId || "--"}</small>
    </article>
  `).join("");
  setReadinessState({
    key: "Evidence",
    value: payload.employeeId ? `Record ${payload.employeeId}` : "Evidence ready",
    detail: payload.latestSync?.correlationId
      ? `Correlation ${payload.latestSync.correlationId}`
      : "Snapshot and sync log loaded.",
  });
};

const applyRequestedEmployeeId = () => {
  if (!requestedEmployeeIdFromUrl) {
    return "";
  }
  if (!elements.employeeId.value.trim()) {
    elements.employeeId.value = requestedEmployeeIdFromUrl;
  }
  return elements.employeeId.value.trim();
};

const applyOptionalDemoCredentials = () => {
  if (!demoLoginRequested) {
    return;
  }

  if (!elements.email.value.trim()) {
    elements.email.value = DEMO_ADMIN_EMAIL;
  }
  if (!elements.password.value.trim()) {
    elements.password.value = DEMO_ADMIN_PASSWORD;
  }
};

const loadHealth = async () => {
  const response = await fetch("/api/health");
  const payload = await response.json();
  renderHealth(payload);
};

const probeSessionAvailability = async () => {
  const response = await fetch(`${state.saApiBaseUrl}/auth/session`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Session check failed.");
  }
  return Boolean(payload?.data?.refreshAvailable);
};

const restoreSession = async () => {
  const sessionAvailable = await probeSessionAvailability();
  if (!sessionAvailable) {
    state.token = "";
    setSessionState(false);
    throw new Error("Session unavailable");
  }

  const response = await fetch(`${state.saApiBaseUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  const token = extractToken(payload);

  if (!response.ok || !token) {
    state.token = "";
    setSessionState(false);
    throw new Error(payload?.message || "No reusable session.");
  }

  state.token = token;
  setSessionState(true);
  return payload;
};

const revokeSharedSession = async () => {
  await revokeSharedSessionFlow({
    hasToken: () => Boolean(state.token),
    ensureSession: async () => {
      try {
        await restoreSession();
      } catch {
        state.token = "";
      }
      return Boolean(state.token);
    },
    logout: () => fetch(`${state.saApiBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
    }),
  });
};

const clearSession = async ({ revoke = true, silent = false } = {}) => {
  if (revoke) {
    try {
      await revokeSharedSession();
    } catch {
      // Local cleanup still happens below.
    }
  }

  state.token = "";
  setSessionState(false);
  resetRecordView();
  if (!silent) {
    setNotice("Session cleared.", "success");
  }
};

const loadConfig = async () => {
  const response = await fetch("/api/payroll/config");
  const payload = await response.json();
  state.saApiBaseUrl = payload.data?.saApiBaseUrl || `${window.location.protocol}//${window.location.hostname}:4000/api`;
  state.links = payload.data?.links || {};
  elements.saBase.textContent = `SA auth ${state.saApiBaseUrl}`;
  elements.serviceLinksCaption.textContent = "Open each runtime in its own tab.";

  setLink(elements.linkPayrollHealth, state.links.payrollHealthUrl);
  setLink(elements.linkSaHome, state.links.saHomeUrl);
  setLink(elements.linkSaDocs, state.links.saDocsUrl);
  setLink(elements.linkDashboard, state.links.dashboardLoginUrl);
};

const fetchWithSharedSession = async (path, options = {}) => {
  const runRequest = () => fetch(path, {
    ...options,
    credentials: options.credentials || "same-origin",
    headers: {
      ...(options.headers || {}),
      ...(state.token ? { "x-access-token": state.token } : {}),
    },
  });

  let response = await runRequest();
  if (response.status !== 401) {
    return response;
  }

  try {
    await restoreSession();
  } catch (error) {
    state.token = "";
    setSessionState(false);
    throw error;
  }
  response = await runRequest();
  return response;
};

const performSignIn = async ({ silentSuccess = false } = {}) => {
  try {
    const response = await fetch(`${state.saApiBaseUrl}/auth/signin`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: elements.email.value,
        password: elements.password.value,
      }),
    });
    const payload = await response.json();
    const token = extractToken(payload);
    if (!response.ok || !token) {
      throw new Error(payload?.message || "SA sign-in failed");
    }
    state.token = token;
    setSessionState(true);
    if (!silentSuccess) {
      setNotice("Signed in. Ready for lookup.", "success");
    }
    applyRequestedEmployeeId();
    await maybeAutoLookupRequestedEmployee();
    elements.employeeId.focus();
  } catch (error) {
    setNotice(normalizeErrorMessage(error, "Sign-in failed."), "error");
  }
};

const signIn = async (event) => {
  event.preventDefault();
  await performSignIn();
};

const lookupRecord = async ({ requestedEmployeeId = "", silentSuccess = false } = {}) => {
  const employeeId = (requestedEmployeeId || elements.employeeId.value.trim()).trim();
  if (!employeeId) {
    setNotice("Enter an employee ID.", "error");
    return;
  }
  if (!state.token) {
    setNotice("Sign in first.", "error");
    return;
  }

  try {
    const response = await fetchWithSharedSession(`/api/payroll/pay-rates/${encodeURIComponent(employeeId)}`, {
      headers: authHeaders(),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || "Payroll lookup failed");
    }
    renderRecord(payload.data);
    if (!silentSuccess) {
      setNotice(`Record ${employeeId} loaded.`, "success");
    }
    elements.recordLayout.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    resetRecordView(normalizeErrorMessage(error, "Payroll lookup failed."));
    setNotice(normalizeErrorMessage(error, "Payroll lookup failed."), "error");
  }
};

const maybeAutoLookupRequestedEmployee = async () => {
  const employeeId = applyRequestedEmployeeId();
  if (!employeeId || !state.token) {
    return;
  }
  if (elements.recordLayout.dataset.employeeId === employeeId) {
    return;
  }
  await lookupRecord({ requestedEmployeeId: employeeId, silentSuccess: true });
};

elements.loginForm.addEventListener("submit", signIn);
elements.lookupRecord.addEventListener("click", () => {
  void lookupRecord();
});
elements.clearSession.addEventListener("click", () => {
  void clearSession();
});
elements.refreshHealth.addEventListener("click", () => {
  void loadHealth().catch((error) => {
    setNotice(normalizeErrorMessage(error, "Unable to refresh health."), "error");
  });
});
elements.employeeId.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void lookupRecord();
  }
});

void (async () => {
  try {
    await loadConfig();
    applyOptionalDemoCredentials();
    applyRequestedEmployeeId();
    await loadHealth();
    setSessionState(false);
    try {
      await restoreSession();
      await maybeAutoLookupRequestedEmployee();
      setNotice("Session restored.", "success");
    } catch {
      if (demoLoginRequested) {
        await performSignIn({ silentSuccess: true });
        if (state.token) {
          setNotice("Demo session restored.", "success");
        }
      } else {
        setNotice("Sign in for payroll lookup.", "");
      }
    }
  } catch (error) {
    setNotice(normalizeErrorMessage(error, "Payroll console unavailable."), "error");
  }
})();
