import Alert from "../models/Alert.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import {
  AlertsSummary,
  BenefitsSummary,
  EarningsSummary,
  VacationSummary,
} from "../models/sql/index.js";
import dashboardCache from "../utils/cache.js";
import {
  ALERT_TYPE_META,
  buildAlertFollowUpSnapshot,
} from "../utils/alertDashboard.js";
import { buildIntegrationMetricsSnapshot } from "./integrationMetricsService.js";

const FRESH_THRESHOLD_MINUTES = 120;
const QUEUE_ACTIONABLE_WARNING = 5;
const QUEUE_ACTIONABLE_CRITICAL = 20;
const QUEUE_PENDING_AGE_WARNING = 10;
const QUEUE_PENDING_AGE_CRITICAL = 30;
const ACTION_LABELS = Object.freeze({
  "refresh-summary": "Refresh All Data",
  "review-alert-ownership": "Review Alerts",
  "review-alerts": "Review Alerts",
  "review-queue": "Review Queue",
  "open-earnings": "Open Earnings Drilldown",
});

const getFreshnessInfo = (updatedAt) => {
  if (!updatedAt) {
    return {
      status: "unknown",
      label: "Unknown",
      css: "unknown",
      staleMinutes: null,
      tooltip: "No freshness metadata from API.",
      updatedAt: null,
    };
  }

  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) {
    return {
      status: "unknown",
      label: "Unknown",
      css: "unknown",
      staleMinutes: null,
      tooltip: "Invalid updatedAt metadata.",
      updatedAt: null,
    };
  }

  const staleMinutes = Math.max(0, Math.round((Date.now() - updatedDate.getTime()) / 60000));
  if (staleMinutes <= FRESH_THRESHOLD_MINUTES) {
    return {
      status: "fresh",
      label: "Fresh",
      css: "fresh",
      staleMinutes,
      tooltip: `Updated ${staleMinutes} minute${staleMinutes === 1 ? "" : "s"} ago.`,
      updatedAt: updatedDate.toISOString(),
    };
  }

  return {
    status: "stale",
    label: "Stale",
    css: "stale",
    staleMinutes,
    tooltip: `Updated ${staleMinutes} minutes ago.`,
    updatedAt: updatedDate.toISOString(),
  };
};

const buildGlobalFreshness = (datasets) => {
  const datasetStates = Object.values(datasets);
  const updatedDates = datasetStates
    .map((item) => item?.updatedAt)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));
  const staleDatasetCount = datasetStates.filter((item) => item.status === "stale").length;
  const unknownDatasetCount = datasetStates.filter((item) => item.status === "unknown").length;

  if (datasetStates.every((item) => item.status === "unknown")) {
    return {
      status: "unknown",
      label: "Unknown",
      css: "unknown",
      tooltip: "No freshness metadata from core summary endpoints.",
      staleDatasetCount,
      unknownDatasetCount,
      lastUpdatedAt: null,
    };
  }

  if (staleDatasetCount > 0) {
    const staleValues = datasetStates
      .map((item) => item.staleMinutes)
      .filter((value) => Number.isFinite(value));
    const maxStale = staleValues.length > 0 ? Math.max(...staleValues) : null;
    return {
      status: "stale",
      label: "Stale",
      css: "stale",
      tooltip: maxStale !== null
        ? `One or more datasets are stale (${maxStale}m old).`
        : "One or more datasets are stale.",
      staleDatasetCount,
      unknownDatasetCount,
      lastUpdatedAt: updatedDates.length > 0
        ? new Date(Math.max(...updatedDates.map((date) => date.getTime()))).toISOString()
        : null,
    };
  }

  return {
    status: "fresh",
    label: "Fresh",
    css: "fresh",
    tooltip: "All core datasets updated recently.",
    staleDatasetCount,
    unknownDatasetCount,
    lastUpdatedAt: updatedDates.length > 0
      ? new Date(Math.max(...updatedDates.map((date) => date.getTime()))).toISOString()
      : null,
  };
};

const resolveRoleContext = async (userId) => {
  const fallback = {
    roles: [],
    effectiveRole: "anonymous",
    canAccessIntegrationQueue: false,
    canManageAlerts: false,
  };

  if (!userId) return fallback;

  const user = await User.findById(userId).lean();
  if (!user) return fallback;

  const roles = await Role.find({ _id: { $in: user.roles || [] } }).lean();
  const roleNames = roles
    .map((role) => String(role.name || "").toLowerCase())
    .filter(Boolean);

  let effectiveRole = "anonymous";
  if (roleNames.includes("super_admin")) effectiveRole = "super_admin";
  else if (roleNames.includes("admin")) effectiveRole = "admin";
  else if (roleNames.includes("moderator")) effectiveRole = "moderator";
  else if (roleNames.includes("user")) effectiveRole = "user";

  return {
    roles: roleNames,
    effectiveRole,
    canAccessIntegrationQueue: roleNames.some((role) => role === "admin" || role === "super_admin"),
    canManageAlerts: roleNames.some((role) => role === "moderator" || role === "admin" || role === "super_admin"),
  };
};

const buildQueueSeverity = ({ actionable = 0, oldestPendingAgeMinutes = 0 } = {}) => {
  if (
    actionable >= QUEUE_ACTIONABLE_CRITICAL
    || oldestPendingAgeMinutes >= QUEUE_PENDING_AGE_CRITICAL
  ) {
    return "critical";
  }
  if (
    actionable >= QUEUE_ACTIONABLE_WARNING
    || oldestPendingAgeMinutes >= QUEUE_PENDING_AGE_WARNING
  ) {
    return "warning";
  }
  return "healthy";
};

const buildActionCenter = ({
  freshness,
  alertStats,
  alertFollowUp,
  integration,
}) => {
  const items = [];

  if (freshness.global.unknownDatasetCount > 0) {
    items.push({
      key: "refresh-summary",
      tone: "warning",
      title: "Core summary coverage is incomplete",
      detail: `${freshness.global.unknownDatasetCount} dataset${freshness.global.unknownDatasetCount === 1 ? "" : "s"} are missing freshness metadata or pre-aggregated rows.`,
      actionLabel: ACTION_LABELS["refresh-summary"],
    });
  } else if (freshness.global.staleDatasetCount > 0) {
    items.push({
      key: "refresh-summary",
      tone: "warning",
      title: "Pre-aggregated data is stale",
      detail: `${freshness.global.staleDatasetCount} dataset${freshness.global.staleDatasetCount === 1 ? "" : "s"} exceeded the ${FRESH_THRESHOLD_MINUTES}-minute freshness window.`,
      actionLabel: ACTION_LABELS["refresh-summary"],
    });
  }

  if (alertStats.categories > 0) {
    if (alertFollowUp.needsAttentionCategories > 0) {
      items.push({
        key: "review-alert-ownership",
        tone: alertFollowUp.unassignedCategories > 0 ? "critical" : "warning",
        title: alertFollowUp.unassignedCategories > 0
          ? "Alert ownership still has gaps"
          : "Alert ownership needs re-review",
        detail: `${alertFollowUp.unassignedCategories} unassigned, ${alertFollowUp.staleCategories} stale across ${alertFollowUp.needsAttentionEmployees} affected employees.`,
        actionLabel: ACTION_LABELS["review-alert-ownership"],
      });
    }

    items.push({
      key: "review-alerts",
      tone: alertFollowUp.needsAttentionCategories > 0
        ? "info"
        : alertStats.affected >= 10 || alertStats.categories >= 2
          ? "warning"
          : "info",
      title: alertFollowUp.needsAttentionCategories > 0
        ? "Manage-by-exception queue is active"
        : "Alert queue is covered by active owners",
      detail: alertFollowUp.needsAttentionCategories > 0
        ? `${alertStats.affected} employees are currently covered by ${alertStats.categories} active alert categories.`
        : `All ${alertStats.categories} active alert categories have a current acknowledgement note.`,
      actionLabel: ACTION_LABELS["review-alerts"],
    });
  }

  if (integration?.accessible) {
    if (integration.error) {
      items.push({
        key: "review-queue",
        tone: "warning",
        title: "Queue health summary is unavailable",
        detail: "Open the integration monitor and verify retry/replay controls before treating the sync path as healthy.",
        actionLabel: ACTION_LABELS["review-queue"],
      });
    } else if (integration.metrics && (integration.metrics.actionable > 0 || integration.metrics.backlog > 0)) {
      items.push({
        key: "review-queue",
        tone: integration.severity === "critical"
          ? "critical"
          : integration.severity === "warning"
            ? "warning"
            : "info",
        title: "Outbox recovery needs operator review",
        detail: `${integration.metrics.actionable} actionable event${integration.metrics.actionable === 1 ? "" : "s"}, backlog ${integration.metrics.backlog}, oldest pending ${integration.metrics.oldestPendingAgeMinutes || 0}m.`,
        actionLabel: ACTION_LABELS["review-queue"],
      });
    }
  }

  if (items.length === 0) {
    items.push({
      key: "open-earnings",
      tone: "healthy",
      title: "Dashboard is ready for executive review",
      detail: "No core blockers detected. Use drilldown to answer follow-up questions without leaving the briefing flow.",
      actionLabel: ACTION_LABELS["open-earnings"],
    });
  }

  const hasCritical = items.some((item) => item.tone === "critical");
  const hasWarning = items.some((item) => item.tone === "warning");
  const hasInfo = items.some((item) => item.tone === "info");

  const status = hasCritical ? "critical" : hasWarning ? "warning" : hasInfo ? "info" : "healthy";

  return {
    status,
    label: hasCritical ? "Action Required" : hasWarning || hasInfo ? "Monitor Closely" : "Ready for Memo",
    headline: hasCritical
      ? "Action is required before this snapshot is safe to present."
      : hasWarning
        ? "Review highlighted risks before using this dashboard as the CEO memo baseline."
        : hasInfo
          ? "Dashboard is operational, with follow-up items worth monitoring."
          : "Dashboard is ready for executive review.",
    summary: hasCritical
      ? "Resolve failed summary feeds, stale ownership, or outbox risks before using this view as executive evidence."
      : hasWarning || hasInfo
        ? "Clear the highest-impact follow-up first, then use drilldown to validate the affected scope."
        : "Current aggregates, alerts, and queue signals do not show immediate blockers.",
    items,
  };
};

export const buildExecutiveBriefSnapshot = async ({ userId, year }) => {
  const roleContext = await resolveRoleContext(userId);
  const cacheParams = {
    year,
    integrationAccess: roleContext.canAccessIntegrationQueue,
  };
  const cached = dashboardCache.get("executive-brief", cacheParams);
  if (cached) {
    return cached;
  }

  const [
    earningsSummary,
    vacationSummary,
    benefitsSummary,
    activeAlerts,
    alertSummaries,
  ] = await Promise.all([
    EarningsSummary.findOne({
      where: { year },
      order: [["computed_at", "DESC"]],
      raw: true,
    }),
    VacationSummary.findOne({
      where: { year },
      order: [["computed_at", "DESC"]],
      raw: true,
    }),
    BenefitsSummary.findOne({
      order: [["computed_at", "DESC"]],
      raw: true,
    }),
    Alert.find({ isActive: true }).populate("acknowledgedBy", "username email").lean(),
    AlertsSummary.findAll({ raw: true }),
  ]);

  const freshness = {
    datasets: {
      earnings: getFreshnessInfo(earningsSummary?.computed_at || null),
      vacation: getFreshnessInfo(vacationSummary?.computed_at || null),
      benefits: getFreshnessInfo(benefitsSummary?.computed_at || null),
    },
  };
  freshness.global = buildGlobalFreshness(freshness.datasets);

  const alertFollowUp = buildAlertFollowUpSnapshot(activeAlerts, alertSummaries);
  const alertStats = {
    categories: alertFollowUp.items.length,
    affected: alertFollowUp.items.reduce((sum, item) => sum + item.count, 0),
    activeTypes: alertFollowUp.items.map((item) => item.type),
    highestPriorityAlert: alertFollowUp.items[0] || null,
    largestQueue: [...alertFollowUp.items].sort((a, b) => b.count - a.count)[0] || null,
  };

  let integration = {
    accessible: roleContext.canAccessIntegrationQueue,
    severity: "restricted",
    metrics: null,
    summaryLabel: `Restricted (${roleContext.effectiveRole})`,
    error: null,
  };

  if (roleContext.canAccessIntegrationQueue) {
    try {
      const metrics = await buildIntegrationMetricsSnapshot();
      const severity = buildQueueSeverity(metrics);
      integration = {
        accessible: true,
        severity,
        metrics,
        summaryLabel: `${metrics.actionable} actionable / ${metrics.backlog} backlog`,
        error: null,
      };
    } catch (error) {
      integration = {
        accessible: true,
        severity: "warning",
        metrics: null,
        summaryLabel: "Degraded",
        error: error.message,
      };
    }
  }

  const response = {
    access: roleContext,
    freshness,
    alerts: {
      stats: alertStats,
      followUp: alertFollowUp,
      typeMeta: ALERT_TYPE_META,
    },
    integration,
    actionCenter: buildActionCenter({
      freshness,
      alertStats,
      alertFollowUp,
      integration,
    }),
  };

  dashboardCache.set("executive-brief", cacheParams, response);
  return response;
};
