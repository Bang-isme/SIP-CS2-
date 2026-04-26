import {
  FiMenu,
  FiRefreshCw,
} from 'react-icons/fi';
import { formatTimestamp } from '../utils/formatters';

const formatUpdatedAt = (value) => formatTimestamp(value, { fallback: 'Unknown' });

export default function DashboardHeader({
  pageTitle = 'Executive Overview',
  currentYear,
  globalFreshness,
  freshnessReadiness,
  lastUpdatedAt,
  refreshing,
  sessionStatus,
  onMenuToggle,
  onRefresh,
  refreshLabel = 'Refresh',
}) {
  const showMenuButton = typeof onMenuToggle === 'function';

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="header-title-row">
          {showMenuButton && (
            <button
              type="button"
              className="dashboard-menu-btn"
              onClick={onMenuToggle}
              aria-label="Open navigation"
            >
              <FiMenu size={16} />
            </button>
          )}
          <h1>{pageTitle}</h1>
        </div>
        <p className="subtitle-meta-row subtitle-meta-compact header-subline">
          <span className="subtitle-context">FY {currentYear}</span>
          <span className={`freshness-pill ${globalFreshness.css}`} title={globalFreshness.tooltip}>
            {globalFreshness.label}
          </span>
          {freshnessReadiness?.summary ? (
            <span className="header-freshness-note" title={freshnessReadiness.detail}>
              {freshnessReadiness.summary}
              {freshnessReadiness.note ? ` · ${freshnessReadiness.note}` : ''}
            </span>
          ) : null}
          <span>Updated {formatUpdatedAt(lastUpdatedAt)}</span>
        </p>
      </div>
      <div className="header-right">
        <div className="header-status-cluster" role="group" aria-label="Workspace status">
          {sessionStatus?.label && (
            <div
              className={`session-status session-status--${sessionStatus.css || 'neutral'}`}
              title={sessionStatus.tooltip}
            >
              <span className="dot online"></span>
              {sessionStatus.label}
            </div>
          )}
          <div className="system-status">
            <span className="dot online"></span> Live
          </div>
        </div>
        <button onClick={onRefresh} className="refresh-btn" disabled={refreshing}>
          <FiRefreshCw size={14} />
          {refreshing ? 'Refreshing...' : refreshLabel}
        </button>
      </div>
    </header>
  );
}
