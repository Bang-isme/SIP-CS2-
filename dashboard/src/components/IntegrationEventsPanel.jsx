import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp, FiRefreshCw, FiRotateCw, FiShieldOff } from "react-icons/fi";
import {
  getIntegrationEvents,
  getIntegrationMetrics,
  retryIntegrationEvent,
  retryDeadIntegrationEvents,
  recoverStuckIntegrationEvents,
  replayIntegrationEvents,
} from "../services/api";
import "./IntegrationEventsPanel.css";

const STATUS_OPTIONS = ["FAILED", "DEAD", "PROCESSING", "PENDING", "SUCCESS", "ALL"];
const REPLAY_STATUS_OPTIONS = ["FAILED", "DEAD", "FAILED/DEAD"];
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

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

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

function IntegrationEventsPanel({ onErrorChange }) {
  const [status, setStatus] = useState("FAILED");
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [replayStatus, setReplayStatus] = useState("FAILED/DEAD");
  const [replayEntityType, setReplayEntityType] = useState("employee");
  const [replayEntityId, setReplayEntityId] = useState("");
  const [replayDays, setReplayDays] = useState("7");
  const [showReplay, setShowReplay] = useState(false);

  const fetchEvents = async (options = {}) => {
    const { silent } = options;
    if (!silent) setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await getIntegrationEvents({ status, page: 1, limit: 10 });
      setEvents(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      if (err?.response?.status === 403) {
        setError("Admin only / Access restricted");
      } else {
        setError(err?.response?.data?.message || "Failed to load integration events");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await getIntegrationMetrics();
      setMetrics(res.data || null);
    } catch {
      setMetrics(null);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchMetrics();
    // Refetch when filter status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (typeof onErrorChange === "function") {
      onErrorChange(error || "");
    }
  }, [error, onErrorChange]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      setNotice("");
      await fetchEvents({ silent: true });
      await fetchMetrics();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = async (id) => {
    try {
      setRefreshing(true);
      setError("");
      await retryIntegrationEvent(id);
      await fetchEvents({ silent: true });
      await fetchMetrics();
    } catch (err) {
      setError(err?.response?.data?.message || "Retry failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetryDead = async () => {
    try {
      setRefreshing(true);
      setNotice("");
      const res = await retryDeadIntegrationEvents();
      await fetchEvents({ silent: true });
      await fetchMetrics();
      setNotice(res?.message || "Dead events re-queued");
    } catch (err) {
      setError(err?.response?.data?.message || "Retry dead failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRecoverStuck = async () => {
    try {
      setRefreshing(true);
      setError("");
      setNotice("");
      const res = await recoverStuckIntegrationEvents();
      await fetchEvents({ silent: true });
      await fetchMetrics();
      setNotice(res?.message || "Stale processing events recovered");
    } catch (err) {
      setError(err?.response?.data?.message || "Recover stuck events failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleReplay = async () => {
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
      await fetchEvents({ silent: true });
      await fetchMetrics();
      setNotice(res?.message || "Replay queued");
    } catch (err) {
      setError(err?.response?.data?.message || "Replay failed");
    } finally {
      setRefreshing(false);
    }
  };

  const summaryText = useMemo(() => {
    if (error) return "Access restricted";
    if (loading || refreshing) return "Loading queue...";
    return `${meta.total} events`;
  }, [error, loading, refreshing, meta.total]);
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

  return (
    <div className="integration-panel">
      <div className="integration-toolbar">
        <div className="integration-meta">
          <span className="integration-subtitle">{summaryText}</span>
          <span className={`status-chip ${activeStatus.className}`}>{activeStatus.label}</span>
          <span className={`status-badge queue-sla ${queueSeverity}`}>Queue {queueSeverityLabel}</span>
        </div>
        <div className="integration-actions">
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
            <button
              className="retry-btn retry-dead-btn"
              onClick={handleRetryDead}
              disabled={refreshing || loading}
              aria-label="Retry all DEAD events"
            >
              <FiRotateCw size={14} />
              {refreshing ? "Working..." : "Retry DEAD (All)"}
            </button>
            <button
              className="retry-btn"
              onClick={handleRecoverStuck}
              disabled={refreshing || loading || stuckProcessingCount === 0}
              aria-label="Recover stale processing events"
            >
              <FiRotateCw size={14} />
              {refreshing ? "Working..." : "Recover Stuck"}
            </button>
          </div>
          <button
            className="toggle-btn integration-replay-toggle"
            onClick={() => setShowReplay((prev) => !prev)}
            aria-expanded={showReplay}
            aria-label={showReplay ? "Hide replay filters" : "Show replay filters"}
          >
            <span>{showReplay ? "Hide Replay" : "Replay Filters"}</span>
            {showReplay ? (
              <FiChevronUp size={14} className="toggle-btn-icon" aria-hidden="true" />
            ) : (
              <FiChevronDown size={14} className="toggle-btn-icon" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

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
            {stuckProcessingCount} processing event{stuckProcessingCount > 1 ? "s are" : " is"} past the{" "}
            {processingTimeoutMinutes}m recovery threshold.
          </span>
        </div>
      )}
      {showReplay && (
        <div className="integration-replay">
          <h3 className="integration-replay-title">Filtered Replay (FAILED/DEAD)</h3>
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
              onClick={handleReplay}
              disabled={refreshing || loading}
              aria-label="Replay filtered failed or dead events"
            >
              {refreshing ? "Working..." : "Replay (Filtered)"}
            </button>
          </div>
          <div className="integration-hint">
            Retry DEAD: only DEAD. Recover Stuck: move stale PROCESSING into FAILED/DEAD. Replay: apply FAILED/DEAD filters + entity/time.
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
          <span className="status-badge warning">P {metricCount.PENDING ?? 0}</span>
          <span className="status-badge info">PR {healthyProcessingCount}</span>
          {stuckProcessingCount > 0 && (
            <span className="status-badge danger">Stuck PR {stuckProcessingCount}</span>
          )}
          <span className="status-badge danger">F {metricCount.FAILED ?? 0}</span>
          <span className="status-badge danger">D {metricCount.DEAD ?? 0}</span>
          <span className="status-badge success">S {metricCount.SUCCESS ?? 0}</span>
        </div>
      </div>


      <div className="integration-table">
        <div className="integration-row integration-head">
          <div className="cell-id">ID</div>
          <div className="cell-entity">Entity</div>
          <div className="cell-action">Action</div>
          <div className="cell-status">Status</div>
          <div className="cell-attempts">Attempts</div>
          <div className="cell-updated">Updated</div>
          <div className="cell-command">Action</div>
        </div>

        {loading ? (
          <div className="integration-empty">Loading...</div>
        ) : events.length === 0 ? (
          <div className="integration-empty">No events found.</div>
        ) : (
          events.map((event) => {
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
                  {(event.status === "FAILED" || event.status === "DEAD") ? (
                    <button
                      className="mini-btn"
                      onClick={() => handleRetry(event.id)}
                      disabled={refreshing || loading}
                    >
                      Retry
                    </button>
                  ) : (
                    <span className="text-muted">--</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default IntegrationEventsPanel;

