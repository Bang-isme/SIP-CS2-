import {
  DASHBOARD_PORT,
  PAYROLL_PORT,
  SA_PORT,
} from "../config.js";
import { buildExecutiveBriefSnapshot } from "./dashboardExecutiveService.js";
import { buildIntegrationReconciliationSnapshot } from "./integrationReconciliationService.js";
import logger from "../utils/logger.js";

const HEALTH_TIMEOUT_MS = 2500;

const DEFAULT_SERVICE_ENDPOINTS = Object.freeze({
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    url: `http://127.0.0.1:${DASHBOARD_PORT}/api/health`,
  },
  sa: {
    key: "sa",
    label: "SA",
    url: `http://127.0.0.1:${SA_PORT}/api/health`,
  },
  payroll: {
    key: "payroll",
    label: "Payroll",
    url: `http://127.0.0.1:${PAYROLL_PORT}/api/health`,
  },
});

const DEFAULT_INTEGRATION_HEALTH_URL = `http://127.0.0.1:${SA_PORT}/api/health/integrations`;

const STATUS_ORDER = Object.freeze({
  critical: 4,
  warning: 3,
  unknown: 2,
  restricted: 1,
  healthy: 0,
});

const parseJsonResponse = async (response) => {
  const rawText = await response.text();
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return { raw: rawText };
  }
};

const buildFetchOptions = () => {
  const options = {
    headers: {
      Accept: "application/json",
    },
  };

  const timeoutSignal = globalThis.AbortSignal?.timeout?.(HEALTH_TIMEOUT_MS);
  if (timeoutSignal) {
    options.signal = timeoutSignal;
  }

  return options;
};

const describeDependencyProblem = ([key, dependency]) => {
  const reason = dependency?.message
    || dependency?.status
    || (dependency?.ready === false ? "not ready" : "unknown");
  return `${key}: ${reason}`;
};

const fetchJson = async ({ url, fetchImpl }) => {
  const response = await fetchImpl(url, buildFetchOptions());
  const body = await parseJsonResponse(response);
  return { response, body };
};

const fetchServiceHealth = async ({ key, label, url, fetchImpl }) => {
  try {
    const { response, body } = await fetchJson({ url, fetchImpl });
    if (!response.ok || !body) {
      return {
        key,
        label,
        status: "critical",
        ready: false,
        detail: body?.message || body?.raw || response.statusText || "Health check failed",
      };
    }

    const dependencyEntries = Object.entries(body.services || {});
    const degradedDependencies = dependencyEntries.filter(([, dependency]) => !dependency?.ready);
    const ready = Boolean(body.status === "healthy");
    const status = ready ? "healthy" : body.status === "degraded" ? "warning" : "critical";

    return {
      key,
      label,
      status,
      ready,
      detail: ready
        ? `${dependencyEntries.length}/${dependencyEntries.length || 1} dependencies ready`
        : degradedDependencies.length > 0
          ? degradedDependencies.slice(0, 2).map(describeDependencyProblem).join(" · ")
          : body.message || "Dependencies degraded",
      dependencies: body.services || {},
    };
  } catch (error) {
    return {
      key,
      label,
      status: "critical",
      ready: false,
      detail: error.message || "Health check failed",
    };
  }
};

const fetchIntegrationHealth = async ({ url, fetchImpl }) => {
  try {
    const { response, body } = await fetchJson({ url, fetchImpl });
    if (!response.ok || !body) {
      return {
        status: "critical",
        label: "Unavailable",
        detail: body?.message || body?.raw || response.statusText || "Integration health unavailable",
        checks: [],
      };
    }

    const checks = Array.isArray(body.integrations) ? body.integrations : [];
    const failedChecks = checks.filter((entry) => entry?.healthy === false);
    const isHealthy = body.status === "healthy" && failedChecks.length === 0;

    return {
      status: isHealthy ? "healthy" : body.status === "degraded" ? "warning" : "critical",
      label: isHealthy ? "Healthy" : body.status === "degraded" ? "Degraded" : "Unavailable",
      detail: isHealthy
        ? checks.map((entry) => entry?.message).filter(Boolean).slice(0, 1).join(" · ") || "Integration adapters reachable"
        : failedChecks.map((entry) => entry?.message).filter(Boolean).slice(0, 2).join(" · ")
          || body.message
          || "Integration adapters degraded",
      checks,
    };
  } catch (error) {
    return {
      status: "critical",
      label: "Unavailable",
      detail: error.message || "Integration health unavailable",
      checks: [],
    };
  }
};

const buildServicesCard = (services) => {
  const entries = Object.values(services);
  const healthyCount = entries.filter((entry) => entry.status === "healthy").length;
  const unhealthyEntries = entries.filter((entry) => entry.status !== "healthy");
  const status = unhealthyEntries.some((entry) => entry.status === "critical")
    ? "critical"
    : unhealthyEntries.length > 0
      ? "warning"
      : "healthy";

  return {
    key: "services",
    label: "Services",
    status,
    metric: `${healthyCount}/${entries.length || 1}`,
    headline: status === "healthy"
      ? "All runtimes reachable"
      : unhealthyEntries.length === 1
        ? `${unhealthyEntries[0].label} needs attention`
        : `${unhealthyEntries.length} runtimes need attention`,
    detail: status === "healthy"
      ? "Dashboard, SA, and Payroll health checks are responding."
      : unhealthyEntries.slice(0, 2).map((entry) => `${entry.label}: ${entry.detail}`).join(" · "),
  };
};

const mapFreshnessStatus = (readinessStatus) => {
  if (readinessStatus === "coverage_gap") return "critical";
  if (readinessStatus === "refresh_lag" || readinessStatus === "unknown") return "warning";
  return "healthy";
};

const buildSummariesCard = (freshnessReadiness) => ({
  key: "summaries",
  label: "Summaries",
  status: mapFreshnessStatus(freshnessReadiness?.status),
  metric: freshnessReadiness?.note || freshnessReadiness?.label || "Unknown",
  headline: freshnessReadiness?.summary || "Summary state unknown",
  detail: freshnessReadiness?.detail || "Summary freshness is unavailable.",
  actionKey: "refresh-summary",
  actionLabel: freshnessReadiness?.actionLabel || "Refresh data",
});

const buildParityCard = ({ canAccessIntegrationQueue, reconciliationSnapshot }) => {
  if (!canAccessIntegrationQueue) {
    return {
      key: "parity",
      label: "Parity",
      status: "restricted",
      metric: "Restricted",
      headline: "Operator access required",
      detail: "SA to Payroll reconciliation is visible to admin operators only.",
      actionKey: null,
      actionLabel: null,
    };
  }

  if (!reconciliationSnapshot) {
    return {
      key: "parity",
      label: "Parity",
      status: "warning",
      metric: "Unknown",
      headline: "Parity snapshot unavailable",
      detail: "The dashboard could not confirm whether SA and Payroll are aligned.",
      actionKey: "open-ops",
      actionLabel: "Open ops",
    };
  }

  const issueCount = Number(reconciliationSnapshot.summary?.issueCount || 0);
  const parityRate = Number(reconciliationSnapshot.summary?.parityRate || 0);
  const status = issueCount === 0 ? "healthy" : "critical";

  return {
    key: "parity",
    label: "Parity",
    status,
    metric: `${parityRate.toFixed(1)}%`,
    headline: issueCount === 0 ? "SA and Payroll aligned" : "Parity drift detected",
    detail: issueCount === 0
      ? `${reconciliationSnapshot.summary?.sourceEmployeeCount || 0} source rows match active payroll coverage.`
      : `Missing ${reconciliationSnapshot.summary?.missingInPayrollCount || 0} · Drift ${reconciliationSnapshot.summary?.payRateMismatchCount || 0} · Extra ${reconciliationSnapshot.summary?.extraInPayrollCount || 0}`,
    actionKey: "open-ops",
    actionLabel: "Open ops",
  };
};

const buildQueueCard = ({
  canAccessIntegrationQueue,
  integration,
  integrationHealth,
}) => {
  if (!canAccessIntegrationQueue) {
    return {
      key: "queue",
      label: "Queue",
      status: "restricted",
      metric: "Restricted",
      headline: "Operator access required",
      detail: "Queue recovery controls are visible to admin operators only.",
      actionKey: null,
      actionLabel: null,
    };
  }

  const metrics = integration?.metrics || null;
  const actionable = Number(metrics?.actionable || 0);
  const backlog = Number(metrics?.backlog || 0);
  const oldestPendingAgeMinutes = Number(metrics?.oldestPendingAgeMinutes || 0);

  if (integration?.error) {
    return {
      key: "queue",
      label: "Queue",
      status: "critical",
      metric: "Unavailable",
      headline: "Queue telemetry unavailable",
      detail: integration.error,
      actionKey: "open-ops",
      actionLabel: "Open ops",
    };
  }

  if (integrationHealth?.status === "critical") {
    return {
      key: "queue",
      label: "Queue",
      status: "critical",
      metric: integrationHealth.label,
      headline: "Delivery path degraded",
      detail: integrationHealth.detail,
      actionKey: "open-ops",
      actionLabel: "Open ops",
    };
  }

  const severity = integration?.severity || "healthy";
  const status = integrationHealth?.status === "warning"
    ? "warning"
    : severity === "critical"
      ? "critical"
      : severity === "warning"
        ? "warning"
        : "healthy";

  return {
    key: "queue",
    label: "Queue",
    status,
    metric: `${actionable}`,
    headline: status === "healthy" ? "Delivery queue within range" : "Queue needs operator review",
    detail: [
      `${actionable} actionable`,
      `${backlog} backlog`,
      `oldest ${oldestPendingAgeMinutes}m`,
      integrationHealth?.detail || null,
    ].filter(Boolean).join(" · "),
    actionKey: "open-ops",
    actionLabel: "Open ops",
  };
};

const buildOverall = (cards) => {
  const statusCounts = cards.reduce((acc, card) => {
    acc[card.status] = (acc[card.status] || 0) + 1;
    return acc;
  }, {});

  const highestSeverity = [...cards]
    .sort((left, right) => (STATUS_ORDER[right.status] || 0) - (STATUS_ORDER[left.status] || 0))[0];

  if (!highestSeverity) {
    return {
      status: "unknown",
      label: "Unknown",
      summary: "Operational readiness is unavailable.",
    };
  }

  if (highestSeverity.status === "critical") {
    return {
      status: "critical",
      label: "Action needed",
      summary: `${statusCounts.critical || 0} critical check${statusCounts.critical === 1 ? "" : "s"} still block safe operation.`,
    };
  }

  if (highestSeverity.status === "warning" || highestSeverity.status === "unknown") {
    return {
      status: "warning",
      label: "Monitor",
      summary: `${(statusCounts.warning || 0) + (statusCounts.unknown || 0)} check${((statusCounts.warning || 0) + (statusCounts.unknown || 0)) === 1 ? "" : "s"} need review.`,
    };
  }

  if (highestSeverity.status === "restricted") {
    return {
      status: "restricted",
      label: "Limited",
      summary: "Some operator checks are hidden for this role.",
    };
  }

  return {
    status: "healthy",
    label: "Ready",
    summary: "Services, summaries, parity, and queue checks are aligned.",
  };
};

export const buildDashboardOperationalReadinessSnapshot = async ({
  userId,
  year,
  forceRefresh = false,
  fetchImpl = globalThis.fetch.bind(globalThis),
  executiveBriefBuilder = buildExecutiveBriefSnapshot,
  reconciliationBuilder = buildIntegrationReconciliationSnapshot,
  serviceEndpoints = DEFAULT_SERVICE_ENDPOINTS,
  integrationHealthUrl = DEFAULT_INTEGRATION_HEALTH_URL,
} = {}) => {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  const [executiveSnapshot, dashboardHealth, saHealth, payrollHealth] = await Promise.all([
    executiveBriefBuilder({ userId, year }),
    fetchServiceHealth({ ...serviceEndpoints.dashboard, fetchImpl }),
    fetchServiceHealth({ ...serviceEndpoints.sa, fetchImpl }),
    fetchServiceHealth({ ...serviceEndpoints.payroll, fetchImpl }),
  ]);

  const canAccessIntegrationQueue = Boolean(executiveSnapshot?.access?.canAccessIntegrationQueue);

  const [reconciliationSnapshot, integrationHealth] = canAccessIntegrationQueue
    ? await Promise.all([
      reconciliationBuilder({ forceRefresh }),
      fetchIntegrationHealth({ url: integrationHealthUrl, fetchImpl }),
    ])
    : [null, null];

  const services = {
    dashboard: dashboardHealth,
    sa: saHealth,
    payroll: payrollHealth,
  };

  const cards = [
    buildServicesCard(services),
    buildSummariesCard(executiveSnapshot?.freshness?.readiness),
    buildParityCard({
      canAccessIntegrationQueue,
      reconciliationSnapshot,
    }),
    buildQueueCard({
      canAccessIntegrationQueue,
      integration: executiveSnapshot?.integration,
      integrationHealth,
    }),
  ];

  const snapshot = {
    checkedAt,
    overall: buildOverall(cards),
    cards,
    services,
    summaries: executiveSnapshot?.freshness || null,
    reconciliation: reconciliationSnapshot,
    queue: {
      integration: executiveSnapshot?.integration || null,
      health: integrationHealth,
    },
    access: executiveSnapshot?.access || null,
  };

  logger.info("DashboardOperationalReadinessService", "Built readiness snapshot", {
    durationMs: Date.now() - startedAt,
    status: snapshot.overall.status,
    canAccessIntegrationQueue,
  });

  return snapshot;
};

export default buildDashboardOperationalReadinessSnapshot;
