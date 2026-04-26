const formatCheckedAt = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getStatusLabel = (status) => {
  if (status === 'critical') return 'Needs action';
  if (status === 'warning') return 'Monitor';
  if (status === 'restricted') return 'Restricted';
  if (status === 'unknown') return 'Unknown';
  return 'Healthy';
};

export default function OperationalReadinessPanel({
  operationalReadiness,
  operationalReadinessError,
  loadingOperationalReadiness,
  onRefresh,
  onAction,
}) {
  const cards = operationalReadiness?.cards || [];
  const overall = operationalReadiness?.overall || null;
  const checkedAtLabel = formatCheckedAt(operationalReadiness?.checkedAt);

  return (
    <section className="dashboard-overview-group overview-panel overview-panel--readiness">
      <div className="overview-panel-header overview-panel-header--inline">
        <div>
          <h2 className="overview-panel-title">Operational readiness</h2>
          <p className="overview-panel-caption">
            One view for services, summaries, parity, and queue.
          </p>
        </div>

        <div className="operational-readiness-head-actions">
          {checkedAtLabel ? (
            <span className="operational-readiness-checked">Checked {checkedAtLabel}</span>
          ) : null}
          <button
            type="button"
            className="panel-action"
            onClick={onRefresh}
            disabled={loadingOperationalReadiness}
          >
            {loadingOperationalReadiness ? 'Refreshing...' : 'Refresh readiness'}
          </button>
        </div>
      </div>

      {operationalReadinessError ? (
        <div className="dashboard-banner dashboard-banner-warning" role="alert">
          <div className="dashboard-banner-text dashboard-banner-text--warning">
            <span>{operationalReadinessError}</span>
          </div>
          <button
            type="button"
            className="panel-action"
            onClick={onRefresh}
            disabled={loadingOperationalReadiness}
          >
            Retry
          </button>
        </div>
      ) : null}

      {loadingOperationalReadiness && !operationalReadiness ? (
        <div className="panel-state panel-state-loading" role="status">
          <p>Loading readiness checks...</p>
        </div>
      ) : (
        <>
          {overall ? (
            <div className="operational-readiness-overview">
              <span className={`operational-readiness-badge operational-readiness-badge--${overall.status || 'unknown'}`}>
                {overall.label}
              </span>
              <span className="operational-readiness-overview-text">{overall.summary}</span>
            </div>
          ) : null}

          <div className="operational-readiness-grid">
            {cards.map((card) => (
              <article
                key={card.key}
                className={`operational-readiness-card operational-readiness-card--${card.status || 'unknown'}`}
              >
                <div className="operational-readiness-card-head">
                  <span className="operational-readiness-card-label">{card.label}</span>
                  <span className="operational-readiness-card-metric">{card.metric}</span>
                </div>
                <strong className="operational-readiness-card-title">{card.headline}</strong>
                <p className="operational-readiness-card-detail">{card.detail}</p>
                <div className="operational-readiness-card-footer">
                  <span className={`operational-readiness-card-status operational-readiness-card-status--${card.status || 'unknown'}`}>
                    {getStatusLabel(card.status)}
                  </span>
                  {card.actionKey ? (
                    <button
                      type="button"
                      className="panel-link"
                      onClick={() => onAction?.(card.actionKey)}
                    >
                      {card.actionLabel}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
