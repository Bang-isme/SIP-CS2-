import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { FiRefreshCw, FiSliders } from 'react-icons/fi';
import AlertsPanel from '../components/AlertsPanel';
import { SkeletonList } from '../components/Skeletons';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardAlertsSlice } from '../contexts/DashboardDataContext';
import { useDashboardPageChrome } from '../contexts/PageChromeContext';
import { formatNumber, formatTimestamp } from '../utils/formatters';

const formatNum = formatNumber;
const formatUpdatedAt = (value) => formatTimestamp(value, { fallback: 'Unknown' });
const AlertSettingsModal = lazy(() => import('../components/AlertSettingsModal'));

export default function AlertsPage() {
  const { permissions } = useAuth();
  const {
    alertFollowUp,
    alerts,
    alertsError,
    loadingAlerts,
    fetchExecutiveSnapshot,
    fetchAlerts,
    stats,
    setAlerts,
  } = useDashboardAlertsSlice();
  const { setPageRefreshConfig } = useDashboardPageChrome();
  const [showAlertSettingsModal, setShowAlertSettingsModal] = useState(false);
  const [requestedAlertOpen, setRequestedAlertOpen] = useState(null);

  const handleAlertAcknowledged = useCallback((alertId, acknowledgement) => {
    setAlerts((prev) => prev.map((item) => {
      if (item?.alert?._id !== alertId) return item;
      return { ...item, alert: { ...item.alert, acknowledgement } };
    }));
    void fetchExecutiveSnapshot();
  }, [fetchExecutiveSnapshot, setAlerts]);

  const openAlertReview = useCallback((alertId) => {
    if (!alertId) return;
    setRequestedAlertOpen({ alertId, token: Date.now() });
  }, []);

  const refreshAlertsWorkspace = useCallback(async () => {
    await Promise.allSettled([
      fetchAlerts(),
      fetchExecutiveSnapshot(),
    ]);
  }, [fetchAlerts, fetchExecutiveSnapshot]);

  useEffect(() => {
    setPageRefreshConfig({
      label: 'Refresh alerts',
      refreshing: loadingAlerts,
      onRefresh: refreshAlertsWorkspace,
    });

    return () => {
      setPageRefreshConfig(null);
    };
  }, [loadingAlerts, refreshAlertsWorkspace, setPageRefreshConfig]);

  return (
    <div className="dashboard-page-grid dashboard-page-grid--alerts">
      <section className="card follow-up-section">
        <div className="card-header">
          <div>
            <h2>Alert Follow-up Queue</h2>
            <span className="card-subtitle">Start with categories that still need ownership or re-review.</span>
          </div>
          <div className="card-header-actions">
            <span className="badge-count">{formatNum(alertFollowUp.needsAttentionCategories)}</span>
            <span className={`freshness-badge ${alertFollowUp.needsAttentionCategories > 0 ? 'stale' : 'fresh'}`}>
              {alertFollowUp.needsAttentionCategories > 0 ? 'Review' : 'Owned'}
            </span>
          </div>
        </div>
        {loadingAlerts ? (
          <SkeletonList />
        ) : alertsError ? (
          <div className="panel-state panel-state-error">
            <p>{alertsError}</p>
            <button className="panel-action" onClick={fetchAlerts} disabled={loadingAlerts} type="button">
              Retry
            </button>
          </div>
        ) : alerts.length > 0 ? (
          <div className="follow-up-queue">
            <div className="follow-up-summary">
              <div className="follow-up-summary-item">
                <span className="follow-up-summary-label">Owner gaps</span>
                <span className="follow-up-summary-value">{formatNum(alertFollowUp.unassignedCategories)}</span>
              </div>
              <div className="follow-up-summary-item">
                <span className="follow-up-summary-label">Re-review</span>
                <span className="follow-up-summary-value">{formatNum(alertFollowUp.staleCategories)}</span>
              </div>
              <div className="follow-up-summary-item">
                <span className="follow-up-summary-label">Employees</span>
                <span className="follow-up-summary-value">{formatNum(alertFollowUp.needsAttentionEmployees)}</span>
              </div>
            </div>

            {alertFollowUp.queuePreview.length > 0 ? (
              <div className="follow-up-list">
                {alertFollowUp.queuePreview.map((item) => (
                  <article
                    key={item.alertId}
                    className={`follow-up-item follow-up-item--${item.status}`}
                  >
                    <div className="follow-up-item-top">
                      <span className={`follow-up-status follow-up-status--${item.status}`}>
                        {item.status === 'unassigned' ? 'Unassigned' : 'Needs Re-review'}
                      </span>
                      <span className={`follow-up-severity follow-up-severity--${item.severity.toLowerCase()}`}>
                        {item.severity}
                      </span>
                    </div>
                    <div className="follow-up-item-body">
                      <div className="follow-up-item-main">
                        <h3>{item.label}</h3>
                        <div className="follow-up-item-summary">
                          <span>{formatNum(item.count)} employees</span>
                          <span>{item.ownerLabel}</span>
                          <span>{item.status === 'unassigned' ? 'Owner missing' : 'Needs re-review'}</span>
                        </div>
                        <p className="follow-up-item-note">
                          {item.status === 'unassigned'
                            ? 'No owner note yet.'
                            : item.acknowledgedAt
                              ? `Reviewed ${formatUpdatedAt(item.acknowledgedAt)}`
                              : 'Review note is stale.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="panel-action follow-up-action"
                        onClick={() => openAlertReview(item.alertId)}
                      >
                        {item.actionLabel}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="panel-state panel-state-empty">
                <p>All active alert categories already have a current owner note.</p>
                {alertFollowUp.items[0]?.alertId ? (
                  <button className="panel-action" onClick={() => openAlertReview(alertFollowUp.items[0]?.alertId)} type="button">
                    Open Alert Detail
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="panel-state panel-state-empty">
            <p>No alert categories are active right now.</p>
          </div>
        )}
      </section>

      <section className="card alerts-section" id="dashboard-alerts-section">
        <div className="card-header">
          <div>
            <h2>Alert Detail</h2>
            <span className="card-subtitle">Review scope first, then update the owner note if needed.</span>
          </div>
          <div className="card-header-actions">
            {permissions.canManageAlerts && (
              <button
                className="panel-link panel-link-secondary"
                onClick={() => setShowAlertSettingsModal(true)}
                type="button"
              >
                <FiSliders size={13} />
                Alert Settings
              </button>
            )}
            <span className="badge-count">{stats.alerts.categories}</span>
            <button
              className="panel-link"
              onClick={refreshAlertsWorkspace}
              disabled={loadingAlerts}
              type="button"
            >
              {loadingAlerts ? (
                <>
                  <FiRefreshCw size={13} className="spin" />
                  Refreshing...
                </>
              ) : 'Refresh'}
            </button>
          </div>
        </div>
        {loadingAlerts ? (
          <SkeletonList />
        ) : alertsError ? (
          <div className="panel-state panel-state-error">
            <p>{alertsError}</p>
            <button className="panel-action" onClick={refreshAlertsWorkspace} disabled={loadingAlerts} type="button">
              Retry
            </button>
          </div>
        ) : alerts.length > 0 ? (
          <AlertsPanel
            alerts={alerts}
            canManageAlerts={permissions.canManageAlerts}
            onAlertAcknowledged={handleAlertAcknowledged}
            requestedAlertOpen={requestedAlertOpen}
            onRequestedAlertHandled={() => setRequestedAlertOpen(null)}
          />
        ) : (
          <div className="panel-state panel-state-empty">
            <p>No active alerts.</p>
          </div>
        )}
      </section>

      <Suspense fallback={null}>
        {showAlertSettingsModal && (
          <AlertSettingsModal
            onClose={() => setShowAlertSettingsModal(false)}
            onSaveSuccess={async () => {
              await refreshAlertsWorkspace();
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
