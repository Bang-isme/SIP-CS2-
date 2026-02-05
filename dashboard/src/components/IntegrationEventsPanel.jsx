import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiRotateCw, FiShieldOff } from "react-icons/fi";
import {
  getIntegrationEvents,
  retryIntegrationEvent,
  retryDeadIntegrationEvents,
  replayIntegrationEvents,
} from "../services/api";
import "./IntegrationEventsPanel.css";

const STATUS_OPTIONS = ["FAILED", "DEAD", "PENDING", "SUCCESS", "ALL"];
const REPLAY_STATUS_OPTIONS = ["FAILED", "DEAD", "FAILED/DEAD"];

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

function IntegrationEventsPanel() {
  const [status, setStatus] = useState("FAILED");
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  useEffect(() => {
    fetchEvents();
  }, [status]);

  const handleRetry = async (id) => {
    try {
      await retryIntegrationEvent(id);
      await fetchEvents({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Retry failed");
    }
  };

  const handleRetryDead = async () => {
    try {
      setRefreshing(true);
      setNotice("");
      await retryDeadIntegrationEvents();
      await fetchEvents({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Retry dead failed");
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
      setNotice(res?.message || "Replay queued");
      await fetchEvents({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Replay failed");
    } finally {
      setRefreshing(false);
    }
  };

  const summaryText = useMemo(() => {
    if (error) return "Access restricted";
    if (loading) return "Loading queue...";
    return `${meta.total} events`;
  }, [error, loading, meta.total]);
  const activeStatus = statusMeta[status] || { label: status, className: "status-badge neutral" };

  return (
    <div className="integration-panel">
      <div className="integration-toolbar">
        <div className="integration-meta">
          <span className="integration-subtitle">{summaryText}</span>
          <span className={`status-chip ${activeStatus.className}`}>{activeStatus.label}</span>
        </div>
        <div className="integration-actions">
          <select
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
            onClick={() => fetchEvents({ silent: true })}
            title="Refresh"
            aria-label="Refresh"
          >
            <FiRefreshCw size={14} />
          </button>
          <button
            className="retry-btn"
            onClick={handleRetryDead}
            disabled={refreshing}
            title="Retry all DEAD events (ignores filters)"
          >
            <FiRotateCw size={14} />
            Retry DEAD (All)
          </button>
          <button
            className="toggle-btn"
            onClick={() => setShowReplay((prev) => !prev)}
            aria-expanded={showReplay}
            title="Advanced replay filters"
          >
            {showReplay ? "Hide Replay" : "Replay Filters"}
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
      {showReplay && (
        <div className="integration-replay">
          <div className="integration-replay-title">Filtered Replay (FAILED/DEAD)</div>
          <div className="integration-replay-controls">
            <select
              value={replayStatus}
              onChange={(e) => setReplayStatus(e.target.value)}
              className="integration-select"
            >
              {REPLAY_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <input
              className="integration-input"
              value={replayEntityType}
              onChange={(e) => setReplayEntityType(e.target.value)}
              placeholder="entity type"
            />
            <input
              className="integration-input"
              value={replayEntityId}
              onChange={(e) => setReplayEntityId(e.target.value)}
              placeholder="entity id (optional)"
            />
            <input
              className="integration-input short"
              type="number"
              min="0"
              value={replayDays}
              onChange={(e) => setReplayDays(e.target.value)}
              placeholder="days"
            />
            <button
              className="retry-btn"
              onClick={handleReplay}
              disabled={refreshing}
              title="Replay filtered FAILED/DEAD events"
            >
              Replay (Filtered)
            </button>
          </div>
          <div className="integration-hint">
            Retry DEAD: chỉ DEAD (bỏ qua filter). Replay: áp dụng filter FAILED/DEAD + entity/time.
          </div>
        </div>
      )}


      <div className="integration-table">
        <div className="integration-row integration-head">
          <div>ID</div>
          <div>Entity</div>
          <div>Action</div>
          <div>Status</div>
          <div>Attempts</div>
          <div>Updated</div>
          <div>Action</div>
        </div>

        {loading ? (
          <div className="integration-empty">Loading...</div>
        ) : events.length === 0 ? (
          <div className="integration-empty">No events found.</div>
        ) : (
          events.map((event) => {
            const meta = statusMeta[event.status] || { label: event.status, className: "status-badge" };
            return (
              <div className="integration-row" key={event.id}>
                <div className="text-mono">#{event.id}</div>
                <div>{event.entity_type}:{event.entity_id}</div>
                <div className="text-mono">{event.action}</div>
                <div><span className={meta.className}>{meta.label}</span></div>
                <div>{event.attempts ?? 0}</div>
                <div className="text-muted">{formatDate(event.updatedAt)}</div>
                <div>
                  {(event.status === "FAILED" || event.status === "DEAD") ? (
                    <button className="mini-btn" onClick={() => handleRetry(event.id)}>Retry</button>
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
