import { FiAlertCircle } from 'react-icons/fi';
import { formatNumber } from '../utils/formatters';

const formatNum = formatNumber;

export default function ExecutiveBrief({
  executiveBrief,
  globalFreshness,
  freshnessReadiness,
  staleDatasetCount,
  summaryErrorCount,
  summaryRefreshError,
  effectiveAlertStats,
  alertFollowUp,
  canAccessIntegrationQueue,
  loadingIntegrationMetrics,
  hasExecutiveIntegrationSnapshot,
  effectiveIntegrationError,
  queueActionable,
  queueBacklog,
  rebuildingSummaries,
  refreshing,
  hasSummaryError,
  onRefresh,
  onExecutiveAction,
  getExecutiveActionLabel,
}) {
  const conciseHeadline = (() => {
    if (hasSummaryError) return 'Fix data issues first';
    if (executiveBrief.tone === 'healthy') return 'Ready to brief';
    if (executiveBrief.tone === 'critical') return 'Resolve blockers first';
    return 'Check highlighted risks';
  })();

  const conciseSummary = (() => {
    if (hasSummaryError) return 'Retry failed loads before sharing this view.';
    if (alertFollowUp.needsAttentionCategories > 0) {
      return `${formatNum(alertFollowUp.needsAttentionCategories)} follow-ups still need review.`;
    }
    if (canAccessIntegrationQueue && queueActionable > 0) {
      return `${formatNum(queueActionable)} queue items still need action.`;
    }
    return 'Core checks are within range for this slice.';
  })();

  const executiveMetrics = [
    {
      label: 'Data',
      value: freshnessReadiness?.summary || (
        staleDatasetCount > 0
          ? `${formatNum(staleDatasetCount)} stale datasets`
          : 'All core datasets current'
      ),
      note: freshnessReadiness?.note || '',
      css: freshnessReadiness?.css || globalFreshness.css,
    },
    {
      label: 'Jobs',
      value:
        summaryErrorCount > 0
          ? `${formatNum(summaryErrorCount)} failed loads`
          : 'No failed loads',
      note:
        summaryErrorCount > 0
          ? 'Retry needed'
          : '',
    },
    {
      label: 'Ownership',
      value:
        effectiveAlertStats.categories === 0
          ? 'No active categories'
          : alertFollowUp.needsAttentionCategories > 0
            ? `${formatNum(alertFollowUp.needsAttentionCategories)} categories pending`
            : `${formatNum(effectiveAlertStats.categories)} categories already owned`,
      note: `${formatNum(effectiveAlertStats.affected)} employees`,
    },
    {
      label: 'Queue',
      value: canAccessIntegrationQueue
        ? !hasExecutiveIntegrationSnapshot && loadingIntegrationMetrics
          ? 'Loading queue state'
          : effectiveIntegrationError
            ? 'Queue health degraded'
            : queueActionable > 0
              ? `${formatNum(queueActionable)} actionable events`
              : 'No actionable events'
        : 'Restricted',
      note: canAccessIntegrationQueue
        ? effectiveIntegrationError
          ? 'Check ops'
          : queueBacklog > 0
            ? `${formatNum(queueBacklog)} backlog`
            : ''
        : '',
    },
  ];

  return (
    <>
      {hasSummaryError && (
        <div className="dashboard-banner dashboard-banner-error" role="alert">
          <div className="dashboard-banner-text">
            <FiAlertCircle size={14} />
            <span>Some summary data is unavailable. Retry the failed loads before you present this view.</span>
          </div>
          <button className="panel-action" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Retrying...' : 'Retry Failed'}
          </button>
        </div>
      )}

      {summaryRefreshError && (
        <div className="dashboard-banner dashboard-banner-warning" role="alert">
          <div className="dashboard-banner-text dashboard-banner-text--warning">
            <FiAlertCircle size={14} />
            <span>{summaryRefreshError}</span>
          </div>
          <button className="panel-action" onClick={onRefresh} disabled={refreshing || rebuildingSummaries}>
            {rebuildingSummaries ? 'Rebuilding...' : 'Retry refresh'}
          </button>
        </div>
      )}

      <section className={`executive-brief executive-brief--${executiveBrief.tone}`}>
        <div className="executive-brief-main">
          <div className="executive-brief-eyebrow">Ready check</div>
          <div className="executive-brief-title-row">
            <h2>{conciseHeadline}</h2>
          </div>
          <p className="executive-brief-summary">{conciseSummary}</p>

          <div className="executive-brief-metrics">
            {executiveMetrics.map((metric) => (
              <div key={metric.label} className="executive-metric">
                <span className="executive-metric-label">{metric.label}</span>
                <span className={`executive-metric-value${metric.css ? ` executive-metric-value--${metric.css}` : ''}`}>
                  {metric.value}
                </span>
                {metric.note ? <span className="executive-metric-note">{metric.note}</span> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="executive-brief-list" aria-label="Executive action items">
          {executiveBrief.items.map((item) => (
            <article key={item.key} className={`executive-task executive-task--${item.tone}`}>
              <div className="executive-task-copy">
                <span className="executive-task-title">{item.title}</span>
              </div>
              <button
                type="button"
                className="executive-task-button"
                onClick={() => onExecutiveAction(item.key)}
                disabled={refreshing && (item.key === 'retry-summary' || item.key === 'refresh-summary')}
              >
                {item.actionLabel || getExecutiveActionLabel(item.key)}
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
