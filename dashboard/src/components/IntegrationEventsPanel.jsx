import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp, FiRefreshCw, FiRotateCw, FiShieldOff } from "react-icons/fi";
import {
  getIntegrationEvents,
  getIntegrationMetrics,
  getIntegrationEventAudit,
  getIntegrationReconciliation,
  retryIntegrationEvent,
  retryDeadIntegrationEvents,
  recoverStuckIntegrationEvents,
  replayIntegrationEvents,
  repairIntegrationReconciliation,
} from "../services/api";
import { formatCurrency, formatCount, formatTimestamp, getErrorMessage } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';
import { useDashboardPageChrome } from '../contexts/PageChromeContext';
import "./IntegrationEventsPanel.css";

const STATUS_OPTIONS = ["FAILED", "DEAD", "PROCESSING", "PENDING", "SUCCESS", "ALL"];
const REPLAY_STATUS_OPTIONS = ["FAILED", "DEAD", "FAILED/DEAD"];
const AUTO_REFRESH_INTERVAL_MS = 15000;
const RECONCILIATION_REFRESH_INTERVAL_MS = 120000;
const METRIC_THRESHOLDS = {
  backlog: { warning: 50, critical: 200 },
  actionable: { warning: 5, critical: 20 },
  oldestPendingAgeMinutes: { warning: 10, critical: 30 },
};

const statusMeta = {
  FAILED: { label: "FAILED", className: "status-badge danger" },
  DEAD: { label: "DEAD", className: "status-badge danger" },
  PENDING: { label: "PENDING", className: "status-badge warning" },
  PROCESSING: { label: "PROCESSING", className: "status-badge info" },
  SUCCESS: { label: "SUCCESS", className: "status-badge success" },
};

const formatDate = (value) => formatTimestamp(value, { fallback: '--' });

const getSeverityLevel = (value, threshold) => {
  if (value >= threshold.critical) return "critical";
  if (value >= threshold.warning) return "warning";
  return "healthy";
};

const getWorstSeverity = (...levels) => {
  if (levels.includes("critical")) return "critical";
  if (levels.includes("warning")) return "warning";
  return "healthy";
};

const humanizeOperatorAction = (value = "") => {
  if (!value) return "Operator update";

  const compact = String(value).trim().toLowerCase();
  const labels = {
    "retry-event": "Retry event",
    "retry-dead": "Retry dead batch",
    "replay-events": "Replay events",
    "recover-stuck": "Recover stuck items",
  };

  return labels[compact] || compact
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatAuditTransition = (sourceStatus, targetStatus) => {
  if (!sourceStatus && !targetStatus) return "State update";
  if (!sourceStatus) return `To ${targetStatus}`;
  if (!targetStatus) return `From ${sourceStatus}`;
  return `${sourceStatus} -> ${targetStatus}`;
};

const buildAuditDetailTokens = (entry) => {
  const details = entry?.details || {};
  const filters = details?.filters || {};
  const tokens = [];

  if (details.scope) {
    tokens.push(`Scope ${details.scope}`);
  }

  if (details.entityType && details.entityId) {
    tokens.push(`${details.entityType}:${details.entityId}`);
  }

  if (details.eventAction) {
    tokens.push(`Action ${details.eventAction}`);
  }

  if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    tokens.push(`Statuses ${filters.statuses.join(", ")}`);
  } else if (filters.status) {
    tokens.push(`Status ${filters.status}`);
  }

  if (filters.entityType && !details.entityType) {
    tokens.push(`Type ${filters.entityType}`);
  }

  if (filters.entityId && !details.entityId) {
    tokens.push(`Id ${filters.entityId}`);
  }

  if (filters.since) {
    tokens.push(`Since ${formatDate(filters.since)}`);
  }

  if (details.timeoutMinutes) {
    tokens.push(`Timeout ${details.timeoutMinutes}m`);
  }

  return tokens;
};

function IntegrationEventsPanel({ onErrorChange }) {
  const { notifyError, notifySuccess } = useToast();
  const { setPageRefreshConfig } = useDashboardPageChrome();
  const [status, setStatus] = useState("FAILED");
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(true);
  const [reconciliationError, setReconciliationError] = useState("");
  const [replayStatus, setReplayStatus] = useState("FAILED/DEAD");
  const [replayEntityType, setReplayEntityType] = useState("employee");
  const [replayEntityId, setReplayEntityId] = useState("");
  const [replayDays, setReplayDays] = useState("7");
  const [showReplay, setShowReplay] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedAuditEvent, setSelectedAuditEvent] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditMeta, setAuditMeta] = useState({ total: 0, page: 1, pages: 1, limit: 6 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const backgroundRefreshRef = useRef(false);

  const fetchEvents = useCallback(async (options = {}) => {
    const { silent, preserveFeedback = false } = options;
    if (!silent) setLoading(true);
    if (!preserveFeedback) {
      setError("");
      setNotice("");
    }
    try {
      const res = await getIntegrationEvents({ status, page: 1, limit: 10 });
      setEvents(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      const message = err?.response?.status === 403
        ? "Admin only / Access restricted"
        : getErrorMessage(err, "Failed to load integration events");
      if (err?.response?.status === 403) {
        setError(message);
      } else {
        setError(message);
      }
      notifyError("Integration queue unavailable", message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [notifyError, status]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await getIntegrationMetrics();
      setMetrics(res.data || null);
    } catch {
      setMetrics(null);
    }
  }, []);

  const fetchReconciliation = useCallback(async (options = {}) => {
    const { silent = false, forceRefresh = false } = options;
    if (!silent) setReconciliationLoading(true);
    try {
      const res = await getIntegrationReconciliation({ forceRefresh });
      setReconciliation(res.data || null);
      setReconciliationError("");
    } catch (err) {
      setReconciliation(null);
      setReconciliationError(getErrorMessage(err, "Parity snapshot unavailable"));
    } finally {
      if (!silent) setReconciliationLoading(false);
    }
  }, []);

  const fetchAuditTrail = useCallback(async (event, options = {}) => {
    const { silent = false } = options;
    if (!event?.id) return;

    setSelectedAuditEvent(event);
    if (!silent) {
      setAuditLoading(true);
      setAuditError("");
    }

    try {
      const res = await getIntegrationEventAudit(event.id, { limit: 6 });
      setAuditEntries(res.data || []);
      setAuditMeta(res.meta || { total: 0, page: 1, pages: 1, limit: 6 });
      setAuditError("");
    } catch (err) {
      setAuditEntries([]);
      setAuditMeta({ total: 0, page: 1, pages: 1, limit: 6 });
      setAuditError(getErrorMessage(err, "Audit trail unavailable"));
    } finally {
      if (!silent) {
        setAuditLoading(false);
      }
    }
  }, []);

  const refreshSelectedAuditTrail = useCallback(async () => {
    if (!selectedAuditEvent?.id) return;

    setAuditLoading(true);
    try {
      await fetchAuditTrail(selectedAuditEvent, { silent: true });
    } finally {
      setAuditLoading(false);
    }
  }, [fetchAuditTrail, selectedAuditEvent]);

  const refreshOperatorSurface = useCallback(async (options = {}) => {
    const {
      preserveFeedback = false,
      forceReconciliation = false,
    } = options;

    await fetchEvents({ silent: true, preserveFeedback });
    await Promise.all([
      fetchMetrics(),
      selectedAuditEvent?.id
        ? fetchAuditTrail(selectedAuditEvent, { silent: true })
        : Promise.resolve(),
      forceReconciliation
        ? fetchReconciliation({ silent: true, forceRefresh: true })
        : Promise.resolve(),
    ]);
  }, [fetchAuditTrail, fetchEvents, fetchMetrics, fetchReconciliation, selectedAuditEvent]);

  useEffect(() => {
    void fetchEvents();
    void fetchMetrics();
    void fetchReconciliation();
    // Refetch when filter status changes.
  }, [fetchEvents, fetchMetrics, fetchReconciliation]);

  useEffect(() => {
    if (typeof onErrorChange === "function") {
      onErrorChange(error || "");
    }
  }, [error, onErrorChange]);

  const refreshPanel = useCallback(async (options = {}) => {
    const { background = false } = options;
    if (background && backgroundRefreshRef.current) return;
    try {
      if (background) {
        backgroundRefreshRef.current = true;
      }
      if (!background) {
        setRefreshing(true);
        setError("");
        setNotice("");
      }
      await refreshOperatorSurface({
        preserveFeedback: background,
        forceReconciliation: !background,
      });
    } finally {
      if (background) {
        backgroundRefreshRef.current = false;
      }
      if (!background) {
        setRefreshing(false);
      }
    }
  }, [refreshOperatorSurface]);

  const handleRefresh = useCallback(async () => {
    await refreshPanel();
  }, [refreshPanel]);

  useEffect(() => {
    setPageRefreshConfig({
      label: "Refresh operations",
      refreshing: loading || refreshing,
      onRefresh: handleRefresh,
    });

    return () => {
      setPageRefreshConfig(null);
    };
  }, [handleRefresh, loading, refreshing, setPageRefreshConfig]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden || loading || refreshing || backgroundRefreshRef.current) return;
      void refreshPanel({ background: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [loading, refreshPanel, refreshing]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden || loading || refreshing) return;
      void fetchReconciliation({ silent: true });
    }, RECONCILIATION_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [fetchReconciliation, loading, refreshing]);

  const executeRetry = useCallback(async (id) => {
    try {
      setRefreshing(true);
      setError("");
      await retryIntegrationEvent(id);
      await refreshOperatorSurface({ forceReconciliation: true });
      notifySuccess("Retry queued", `Integration event #${id} was queued for retry.`);
    } catch (err) {
      const message = getErrorMessage(err, "Retry failed");
      setError(message);
      notifyError("Retry failed", message);
    } finally {
      setRefreshing(false);
    }
  }, [notifyError, notifySuccess, refreshOperatorSurface]);

  const executeRetryDead = useCallback(async () => {
    try {
      setRefreshing(true);
      setNotice("");
      const res = await retryDeadIntegrationEvents();
      await refreshOperatorSurface({ forceReconciliation: true });
      const message = res?.message || "Dead events re-queued";
      setNotice(message);
      notifySuccess("Dead events retried", message);
    } catch (err) {
      const message = getErrorMessage(err, "Retry dead failed");
      setError(message);
      notifyError("Retry dead failed", message);
    } finally {
      setRefreshing(false);
    }
  }, [notifyError, notifySuccess, refreshOperatorSurface]);

  const executeRecoverStuck = useCallback(async () => {
    try {
      setRefreshing(true);
      setError("");
      setNotice("");
      const res = await recoverStuckIntegrationEvents();
      await refreshOperatorSurface({ forceReconciliation: true });
      const message = res?.message || "Stale processing events recovered";
      setNotice(message);
      notifySuccess("Recover complete", message);
    } catch (err) {
      const message = getErrorMessage(err, "Recover stuck events failed");
      setError(message);
      notifyError("Recover failed", message);
    } finally {
      setRefreshing(false);
    }
  }, [notifyError, notifySuccess, refreshOperatorSurface]);

  const executeRepairReconciliation = useCallback(async () => {
    try {
      setRefreshing(true);
      setError("");
      setNotice("");
      const res = await repairIntegrationReconciliation();
      await refreshOperatorSurface({ forceReconciliation: true });
      const message = res?.message || "Payroll extras repaired";
      setNotice(message);
      notifySuccess("Parity repaired", message);
    } catch (err) {
      const message = getErrorMessage(err, "Payroll repair failed");
      setError(message);
      notifyError("Repair failed", message);
    } finally {
      setRefreshing(false);
    }
  }, [notifyError, notifySuccess, refreshOperatorSurface]);

  const executeReplay = useCallback(async () => {
    try {
      setRefreshing(true);
      setError("");
      setNotice("");
      const payload = {
        status: replayStatus === "FAILED/DEAD" ? undefined : replayStatus,
        entityType: replayEntityType || undefined,
        entityId: replayEntityId || undefined,
        fromDays: replayDays ? Number(replayDays) : undefined,
      };
      const res = await replayIntegrationEvents(payload);
      await refreshOperatorSurface({ forceReconciliation: true });
      const message = res?.message || "Replay queued";
      setNotice(message);
      notifySuccess("Replay queued", message);
    } catch (err) {
      const message = getErrorMessage(err, "Replay failed");
      setError(message);
      notifyError("Replay failed", message);
    } finally {
      setRefreshing(false);
    }
  }, [
    notifyError,
    notifySuccess,
    replayDays,
    replayEntityId,
    replayEntityType,
    replayStatus,
    refreshOperatorSurface,
  ]);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const openPendingAction = useCallback((action) => {
    setPendingAction(action);
    setError("");
    setNotice("");
  }, []);

  const confirmPendingAction = useCallback(async () => {
    const currentAction = pendingAction;
    if (!currentAction) return;

    clearPendingAction();

    if (currentAction.type === "retry-event") {
      await executeRetry(currentAction.eventId);
      return;
    }

    if (currentAction.type === "retry-dead") {
      await executeRetryDead();
      return;
    }

    if (currentAction.type === "recover-stuck") {
      await executeRecoverStuck();
      return;
    }

    if (currentAction.type === "repair-reconciliation") {
      await executeRepairReconciliation();
      return;
    }

    if (currentAction.type === "replay") {
      await executeReplay();
    }
  }, [
    clearPendingAction,
    executeRecoverStuck,
    executeRepairReconciliation,
    executeReplay,
    executeRetry,
    executeRetryDead,
    pendingAction,
  ]);

  const summaryText = useMemo(() => {
    if (error) return "Access restricted";
    if (loading || refreshing) return "Loading queue...";
    if (status === "ALL") return `${meta.total} total events`;
    return `${meta.total} ${status.toLowerCase()} items`;
  }, [error, loading, refreshing, meta.total, status]);
  const activeStatus = statusMeta[status] || { label: status, className: "status-badge neutral" };
  const metricCount = metrics?.counts || {};
  const backlog = metrics?.backlog ?? 0;
  const actionable = metrics?.actionable ?? 0;
  const stuckProcessingCount = metrics?.stuckProcessingCount ?? 0;
  const healthyProcessingCount = metrics?.healthyProcessingCount ?? (metricCount.PROCESSING ?? 0);
  const processingTimeoutMinutes = metrics?.processingTimeoutMinutes ?? 15;
  const oldestPendingAgeMinutes = metrics?.oldestPendingAgeMinutes ?? 0;
  const oldestLabel = oldestPendingAgeMinutes > 0 ? `${oldestPendingAgeMinutes}m` : "--";
  const backlogSeverity = getSeverityLevel(backlog, METRIC_THRESHOLDS.backlog);
  const actionableSeverity = getSeverityLevel(actionable, METRIC_THRESHOLDS.actionable);
  const oldestSeverity = getSeverityLevel(oldestPendingAgeMinutes, METRIC_THRESHOLDS.oldestPendingAgeMinutes);
  const queueSeverity = getWorstSeverity(backlogSeverity, actionableSeverity, oldestSeverity);
  const queueSeverityLabel = queueSeverity === "critical"
    ? "Critical"
    : queueSeverity === "warning"
      ? "Warning"
      : "Healthy";
  const isTableCompact = loading || events.length === 0;
  const emptyTitle = status === "ALL"
    ? "Queue is idle."
    : `No ${status.toLowerCase()} items right now.`;
  const emptyDetail = status === "ALL"
    ? "Auto-refresh is still watching for new work."
    : "Switch to ALL to confirm overall queue health, or stay here and let auto-refresh keep watch.";
  const replayScopeSummary = [
    replayStatus === "FAILED/DEAD" ? "FAILED + DEAD" : replayStatus,
    replayEntityType ? `type ${replayEntityType}` : null,
    replayEntityId ? `id ${replayEntityId}` : "all entities",
    replayDays ? `from ${replayDays} days` : null,
  ].filter(Boolean).join(" • ");
  const reconciliationSummary = reconciliation?.summary || {};
  const reconciliationSamples = reconciliation?.samples || {};
  const reconciliationStatus = reconciliation
    ? (reconciliation.status || "healthy")
    : reconciliationError
      ? "attention"
      : "checking";
  const reconciliationStatusLabel = reconciliationStatus === "checking"
    ? "Checking"
    : reconciliationStatus === "healthy"
      ? "Aligned"
      : "Needs attention";
  const reconciliationStatusClass = reconciliationStatus === "checking"
    ? "neutral"
    : reconciliationStatus === "healthy"
      ? "success"
      : "warning";
  const reconciliationCheckedAt = reconciliation?.checkedAt
    ? `Checked ${formatDate(reconciliation.checkedAt)}`
    : reconciliationLoading
      ? "Checking parity..."
      : "Snapshot unavailable";
  const extraPayrollCount = Number(reconciliationSummary.extraInPayrollCount || 0);
  const reconciliationSampleGroups = [
    {
      label: "Missing",
      items: reconciliationSamples.missingInPayroll || [],
      renderItem: (employeeId) => employeeId,
    },
    {
      label: "Extra",
      items: reconciliationSamples.extraInPayroll || [],
      renderItem: (employeeId) => employeeId,
    },
    {
      label: "Duplicates",
      items: reconciliationSamples.duplicateActivePayroll || [],
      renderItem: (employeeId) => employeeId,
    },
    {
      label: "Mismatches",
      items: reconciliationSamples.payRateMismatch || [],
      renderItem: (item) => `${item.employeeId} • SA ${formatCurrency(item.sourcePayRate)} • Payroll ${formatCurrency(item.payrollPayRate)}`,
    },
  ].filter((group) => Array.isArray(group.items) && group.items.length > 0);
  const selectedAuditEventLabel = selectedAuditEvent
    ? `${selectedAuditEvent.entity_type}:${selectedAuditEvent.entity_id}`
    : "";
  const auditSummaryText = auditMeta.total > auditEntries.length
    ? `Latest ${auditEntries.length} of ${auditMeta.total} entries`
    : `${auditMeta.total} entr${auditMeta.total === 1 ? "y" : "ies"}`;

  return (
    <div className="integration-panel">
      <div className="integration-toolbar">
        <div className="integration-meta">
          <span className="integration-subtitle">{summaryText}</span>
          <span className={`status-chip ${activeStatus.className}`}>{activeStatus.label}</span>
          <span className={`status-badge queue-sla ${queueSeverity}`}>Queue {queueSeverityLabel}</span>
        </div>
        <div className="integration-actions">
          <div className="integration-control-band">
            <span className="integration-control-label">Queue watch</span>
            <div className="integration-actions-main">
              <label className="sr-only" htmlFor="integration-status-filter">
                Filter integration events by status
              </label>
              <select
                id="integration-status-filter"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="integration-select"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button
                className="icon-btn"
                onClick={handleRefresh}
                aria-label="Refresh"
                disabled={refreshing || loading}
              >
                <FiRefreshCw size={14} />
              </button>
            </div>
          </div>
          <div className="integration-control-band integration-control-band--recovery">
            <span className="integration-control-label">Recovery controls</span>
            <div className="integration-actions-main integration-actions-main--recovery">
              <button
                className="retry-btn retry-dead-btn"
                onClick={() => openPendingAction({
                  type: "retry-dead",
                  title: "Confirm retry for dead events",
                  description: `This will re-queue ${metricCount.DEAD ?? 0} dead event${(metricCount.DEAD ?? 0) === 1 ? "" : "s"} for processing.`,
                  confirmLabel: "Confirm Retry Dead",
                })}
                disabled={refreshing || loading}
                aria-label="Retry all DEAD events"
              >
                <FiRotateCw size={14} />
                {refreshing ? "Working..." : "Retry Dead"}
              </button>
              <button
                className="retry-btn"
                onClick={() => openPendingAction({
                  type: "recover-stuck",
                  title: "Confirm recovery",
                  description: `This will recover ${stuckProcessingCount} processing item${stuckProcessingCount === 1 ? "" : "s"} that exceeded the ${processingTimeoutMinutes}m threshold.`,
                  confirmLabel: "Confirm Recover",
                })}
                disabled={refreshing || loading || stuckProcessingCount === 0}
                aria-label="Recover stale processing events"
              >
                <FiRotateCw size={14} />
                {refreshing ? "Working..." : "Recover"}
              </button>
              <button
                className="toggle-btn integration-replay-toggle"
                onClick={() => setShowReplay((prev) => !prev)}
                aria-expanded={showReplay}
                aria-label={showReplay ? "Hide replay filters" : "Show replay filters"}
              >
                <span>{showReplay ? "Hide Replay" : "Replay"}</span>
                {showReplay ? (
                  <FiChevronUp size={14} className="toggle-btn-icon" aria-hidden="true" />
                ) : (
                  <FiChevronDown size={14} className="toggle-btn-icon" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {pendingAction && (
        <div className="integration-confirmation" role="alertdialog" aria-live="assertive">
          <div className="integration-confirmation-copy">
            <strong>{pendingAction.title}</strong>
            <span>{pendingAction.description}</span>
          </div>
          <div className="integration-confirmation-actions">
            <button type="button" className="mini-btn" onClick={clearPendingAction}>
              Cancel
            </button>
            <button
              type="button"
              className="retry-btn replay-btn"
              onClick={() => void confirmPendingAction()}
              disabled={refreshing || loading}
            >
              {pendingAction.confirmLabel}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="integration-error">
          <FiShieldOff size={14} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="integration-notice">
          <span>{notice}</span>
        </div>
      )}
      {stuckProcessingCount > 0 && (
        <div className="integration-warning">
          <span>
            {stuckProcessingCount} processing item{stuckProcessingCount > 1 ? "s" : ""} exceeded the{" "}
            {processingTimeoutMinutes}m recovery threshold.
          </span>
        </div>
      )}
      {showReplay && (
        <div className="integration-replay">
          <h3 className="integration-replay-title">Replay failed or dead items</h3>
          <div className="integration-replay-controls">
            <label className="sr-only" htmlFor="integration-replay-status">
              Replay status filter
            </label>
            <select
              id="integration-replay-status"
              value={replayStatus}
              onChange={(e) => setReplayStatus(e.target.value)}
              className="integration-select"
            >
              {REPLAY_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="integration-replay-entity-type">
              Replay entity type
            </label>
            <input
              id="integration-replay-entity-type"
              className="integration-input"
              value={replayEntityType}
              onChange={(e) => setReplayEntityType(e.target.value)}
              placeholder="entity type"
            />
            <label className="sr-only" htmlFor="integration-replay-entity-id">
              Replay entity id
            </label>
            <input
              id="integration-replay-entity-id"
              className="integration-input"
              value={replayEntityId}
              onChange={(e) => setReplayEntityId(e.target.value)}
              placeholder="entity id (optional)"
            />
            <label className="sr-only" htmlFor="integration-replay-days">
              Replay from days
            </label>
            <input
              id="integration-replay-days"
              className="integration-input short"
              type="number"
              min="0"
              value={replayDays}
              onChange={(e) => setReplayDays(e.target.value)}
              placeholder="days"
            />
            <button
              className="retry-btn replay-btn"
              onClick={() => openPendingAction({
                type: "replay",
                title: "Confirm replay request",
                description: `Replay will run with scope: ${replayScopeSummary}.`,
                confirmLabel: "Confirm Replay",
              })}
              disabled={refreshing || loading}
              aria-label="Replay filtered failed or dead events"
            >
              {refreshing ? "Working..." : "Replay"}
            </button>
          </div>
          <div className="integration-hint">
            Use replay only after checking the affected entity scope.
          </div>
        </div>
      )}

      <div className="integration-kpis">
        <div className={`integration-kpi integration-kpi--${backlogSeverity}`}>
          <span className="integration-kpi-label">Backlog</span>
          <span className="integration-kpi-value">{backlog}</span>
        </div>
        <div className={`integration-kpi integration-kpi--${actionableSeverity}`}>
          <span className="integration-kpi-label">Actionable</span>
          <span className="integration-kpi-value">{actionable}</span>
        </div>
        <div className={`integration-kpi integration-kpi--${oldestSeverity}`}>
          <span className="integration-kpi-label">Oldest Pending</span>
          <span className="integration-kpi-value">{oldestLabel}</span>
        </div>
        <div className="integration-kpi-tags">
          <span className="status-badge warning">Pending {metricCount.PENDING ?? 0}</span>
          <span className="status-badge info">Processing {healthyProcessingCount}</span>
          {stuckProcessingCount > 0 && (
            <span className="status-badge danger">Stuck {stuckProcessingCount}</span>
          )}
          <span className="status-badge danger">Failed {metricCount.FAILED ?? 0}</span>
          <span className="status-badge danger">Dead {metricCount.DEAD ?? 0}</span>
          <span className="status-badge success">Success {metricCount.SUCCESS ?? 0}</span>
        </div>
      </div>

      <section className="integration-reconciliation" aria-label="Payroll reconciliation snapshot">
        <div className="integration-reconciliation-header">
          <div className="integration-reconciliation-copy">
            <span className="integration-control-label">SA vs Payroll</span>
            <h3>Parity snapshot</h3>
          </div>
          <div className="integration-reconciliation-meta">
            <span className={`status-badge ${reconciliationStatusClass}`}>{reconciliationStatusLabel}</span>
            <span className="integration-reconciliation-time">{reconciliationCheckedAt}</span>
            {extraPayrollCount > 0 && (
              <button
                type="button"
                className="mini-btn integration-reconciliation-repair"
                onClick={() => openPendingAction({
                  type: "repair-reconciliation",
                  title: "Confirm payroll repair",
                  description: `This will terminate ${extraPayrollCount} active payroll row${extraPayrollCount === 1 ? "" : "s"} that no longer exists in SA.`,
                  confirmLabel: "Confirm Repair",
                })}
                disabled={refreshing || reconciliationLoading}
              >
                Repair payroll extras
              </button>
            )}
          </div>
        </div>

        {reconciliationError ? (
          <div className="integration-reconciliation-empty">
            <strong>Parity snapshot unavailable.</strong>
            <span>{reconciliationError}</span>
          </div>
        ) : reconciliationLoading && !reconciliation ? (
          <div className="integration-reconciliation-empty">
            <strong>Loading parity snapshot...</strong>
            <span>Checking source coverage against active payroll rows.</span>
          </div>
        ) : (
          <>
            <div className="integration-reconciliation-grid">
              <div className="integration-reconciliation-card">
                <span className="integration-kpi-label">Source employees</span>
                <strong>{formatCount(reconciliationSummary.sourceEmployeeCount)}</strong>
              </div>
              <div className="integration-reconciliation-card">
                <span className="integration-kpi-label">Payroll covered</span>
                <strong>{formatCount(reconciliationSummary.downstreamCoveredEmployeeCount)}</strong>
              </div>
              <div className="integration-reconciliation-card integration-reconciliation-card--issue">
                <span className="integration-kpi-label">Missing in payroll</span>
                <strong>{formatCount(reconciliationSummary.missingInPayrollCount)}</strong>
              </div>
              <div className="integration-reconciliation-card integration-reconciliation-card--issue">
                <span className="integration-kpi-label">Pay-rate mismatch</span>
                <strong>{formatCount(reconciliationSummary.payRateMismatchCount)}</strong>
              </div>
              <div className="integration-reconciliation-card integration-reconciliation-card--issue">
                <span className="integration-kpi-label">Extra in payroll</span>
                <strong>{formatCount(reconciliationSummary.extraInPayrollCount)}</strong>
              </div>
              <div className="integration-reconciliation-card integration-reconciliation-card--issue">
                <span className="integration-kpi-label">Duplicate active rows</span>
                <strong>{formatCount(reconciliationSummary.duplicateActivePayrollCount)}</strong>
              </div>
              <div className="integration-reconciliation-card integration-reconciliation-card--parity">
                <span className="integration-kpi-label">Parity</span>
                <strong>{reconciliationSummary.parityRate ?? 0}%</strong>
              </div>
            </div>

            {reconciliationSampleGroups.length > 0 ? (
              <div className="integration-reconciliation-samples">
                {reconciliationSampleGroups.map((group) => (
                  <div className="integration-reconciliation-group" key={group.label}>
                    <span className="integration-kpi-label">{group.label}</span>
                    <div className="integration-reconciliation-chip-row">
                      {group.items.map((item) => {
                        const key = typeof item === "string"
                          ? item
                          : `${item.employeeId}-${item.sourcePayRate}-${item.payrollPayRate}`;
                        return (
                          <span className="integration-reconciliation-chip" key={key}>
                            {group.renderItem(item)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="integration-reconciliation-empty integration-reconciliation-empty--healthy">
                <strong>Source and active payroll are aligned.</strong>
                <span>No missing coverage, no extra rows, and no pay-rate mismatches in the current snapshot.</span>
              </div>
            )}
          </>
        )}
      </section>


      <div className={`integration-table${isTableCompact ? ' integration-table--empty' : ''}`}>
        {loading ? (
          <div className="integration-empty">Loading queue...</div>
        ) : events.length === 0 ? (
          <div className="integration-empty integration-empty--guided">
            <div className="integration-empty-copy">
              <strong>{emptyTitle}</strong>
              <span>{emptyDetail}</span>
            </div>
            <div className="integration-empty-actions">
              {status !== "ALL" && (
                <button type="button" className="mini-btn" onClick={() => setStatus("ALL")}>
                  See all statuses
                </button>
              )}
              <button type="button" className="mini-btn" onClick={() => void handleRefresh()}>
                Refresh queue
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="integration-row integration-head">
              <div className="cell-id">ID</div>
              <div className="cell-entity">Entity</div>
              <div className="cell-action">Action</div>
              <div className="cell-status">Status</div>
              <div className="cell-attempts">Attempts</div>
              <div className="cell-updated">Updated</div>
              <div className="cell-command">Action</div>
            </div>
            {events.map((event) => {
              const meta = statusMeta[event.status] || { label: event.status, className: "status-badge" };
              const entityLabel = `${event.entity_type}:${event.entity_id}`;
              return (
                <div className="integration-row" key={event.id}>
                  <div className="cell-id text-mono" title={`Event #${event.id}`}>#{event.id}</div>
                  <div className="cell-entity" title={entityLabel}>{entityLabel}</div>
                  <div className="cell-action text-mono" title={event.action}>{event.action}</div>
                  <div className="cell-status"><span className={meta.className}>{meta.label}</span></div>
                  <div className="cell-attempts">{event.attempts ?? 0}</div>
                  <div className="cell-updated text-muted" title={formatDate(event.updatedAt)}>{formatDate(event.updatedAt)}</div>
                  <div className="cell-command">
                    <div className="cell-command-actions">
                      {(event.status === "FAILED" || event.status === "DEAD") ? (
                        <button
                          className="mini-btn"
                          onClick={() => openPendingAction({
                            type: "retry-event",
                            eventId: event.id,
                            title: `Confirm retry for event #${event.id}`,
                            description: `This will place ${entityLabel} (${event.action}) back on the queue for another processing attempt.`,
                            confirmLabel: "Confirm Retry",
                          })}
                          disabled={refreshing || loading}
                          aria-label={`Retry event ${event.id}`}
                        >
                          Retry
                        </button>
                      ) : null}
                      <button
                        className={`mini-btn${selectedAuditEvent?.id === event.id ? " mini-btn--active" : ""}`}
                        onClick={() => {
                          if (selectedAuditEvent?.id === event.id) {
                            setSelectedAuditEvent(null);
                            setAuditEntries([]);
                            setAuditMeta({ total: 0, page: 1, pages: 1, limit: 6 });
                            setAuditError("");
                            return;
                          }
                          void fetchAuditTrail(event);
                        }}
                        disabled={refreshing || loading}
                        aria-label={selectedAuditEvent?.id === event.id ? `Hide audit for event ${event.id}` : `View audit for event ${event.id}`}
                      >
                        {selectedAuditEvent?.id === event.id ? "Hide" : "Audit"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {selectedAuditEvent && (
        <section className="integration-audit" aria-label={`Audit trail for event ${selectedAuditEvent.id}`}>
          <div className="integration-audit-header">
            <div className="integration-audit-copy">
              <span className="integration-control-label">Operator evidence</span>
              <h3>Audit trail</h3>
              <span className="integration-audit-subtitle">
                Event #{selectedAuditEvent.id} • {selectedAuditEventLabel}
              </span>
            </div>
            <div className="integration-audit-actions">
              <span className="integration-audit-meta">{auditSummaryText}</span>
              <button
                type="button"
                className="mini-btn"
                onClick={() => void refreshSelectedAuditTrail()}
                disabled={auditLoading || refreshing || loading}
              >
                Refresh audit
              </button>
              <button
                type="button"
                className="mini-btn"
                onClick={() => {
                  setSelectedAuditEvent(null);
                  setAuditEntries([]);
                  setAuditMeta({ total: 0, page: 1, pages: 1, limit: 6 });
                  setAuditError("");
                }}
              >
                Close
              </button>
            </div>
          </div>

          {auditError ? (
            <div className="integration-audit-empty integration-audit-empty--error">
              <strong>Audit trail unavailable.</strong>
              <span>{auditError}</span>
            </div>
          ) : auditLoading && auditEntries.length === 0 ? (
            <div className="integration-audit-empty">
              <strong>Loading audit trail...</strong>
              <span>Checking operator actions for the selected event.</span>
            </div>
          ) : auditEntries.length === 0 ? (
            <div className="integration-audit-empty">
              <strong>No operator actions yet.</strong>
              <span>This event has not been retried, replayed, or recovered from Operations.</span>
            </div>
          ) : (
            <div className="integration-audit-list">
              {auditEntries.map((entry) => {
                const detailTokens = buildAuditDetailTokens(entry);
                return (
                  <article className="integration-audit-entry" key={entry.id}>
                    <div className="integration-audit-entry-head">
                      <strong>{humanizeOperatorAction(entry.operator_action)}</strong>
                      <span>{formatDate(entry.createdAt)}</span>
                    </div>
                    <div className="integration-audit-chip-row">
                      <span className="integration-reconciliation-chip integration-audit-chip">
                        {formatAuditTransition(entry.source_status, entry.target_status)}
                      </span>
                      <span className="integration-reconciliation-chip integration-audit-chip">
                        Actor {entry.operator_actor_id || "system"}
                      </span>
                      {entry.operator_request_id ? (
                        <span className="integration-reconciliation-chip integration-audit-chip text-mono">
                          {entry.operator_request_id}
                        </span>
                      ) : null}
                    </div>
                    {detailTokens.length > 0 ? (
                      <div className="integration-audit-chip-row integration-audit-chip-row--details">
                        {detailTokens.map((token) => (
                          <span className="integration-reconciliation-chip integration-audit-chip integration-audit-chip--muted" key={`${entry.id}-${token}`}>
                            {token}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default memo(IntegrationEventsPanel);

