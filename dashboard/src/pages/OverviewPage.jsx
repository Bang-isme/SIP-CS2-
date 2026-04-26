import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ExecutiveBrief from '../components/ExecutiveBrief';
import KPIGrid from '../components/KPIGrid';
import OperationalReadinessPanel from '../components/OperationalReadinessPanel';
import QuickNavGrid from '../components/QuickNavGrid';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardOverviewSlice } from '../contexts/DashboardDataContext';

const countStaleDatasets = (freshnessList = []) =>
  freshnessList.filter((item) => item?.status === 'stale').length;

const formatCompactCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

const formatCompactCount = (value) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

export default function OverviewPage() {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const {
    stats,
    alertFollowUp,
    executiveBrief,
    globalFreshness,
    freshnessReadiness,
    summaryErrorCount,
    summaryRefreshError,
    effectiveAlertStats,
    loadingIntegrationMetrics,
    hasExecutiveIntegrationSnapshot,
    effectiveIntegrationError,
    queueActionable,
    queueBacklog,
    operationalReadiness,
    operationalReadinessError,
    loadingOperationalReadiness,
    earningsFreshness,
    vacationFreshness,
    benefitsFreshness,
    loadingEarnings,
    loadingVacation,
    loadingBenefits,
    loadingAlerts,
    earningsError,
    vacationError,
    benefitsError,
    alertsError,
    loadAllData,
    fetchOperationalReadiness,
    rebuildingSummaries,
    refreshing,
  } = useDashboardOverviewSlice();

  const staleDatasetCount = countStaleDatasets([earningsFreshness, vacationFreshness, benefitsFreshness]);
  const shouldRebuildSummaries = permissions.canAccessIntegrationQueue && freshnessReadiness?.actionMode === 'rebuild';

  const refreshOverview = (options = {}) => {
    void loadAllData({
      forceOperationalReadiness: true,
      ...options,
    });
  };

  const refreshOperationalReadiness = () => {
    void fetchOperationalReadiness(undefined, { forceRefresh: true });
  };

  const handleExecutiveAction = (actionKey) => {
    if (actionKey === 'retry-summary' || actionKey === 'refresh-summary') {
      refreshOverview(shouldRebuildSummaries ? { rebuildSummaries: true } : undefined);
      return;
    }
    if (actionKey === 'review-alert-ownership' || actionKey === 'review-alerts') {
      navigate('/dashboard/alerts');
      return;
    }
    if (actionKey === 'review-queue') {
      navigate('/dashboard/integration');
      return;
    }
    if (actionKey === 'open-earnings') {
      navigate('/dashboard/analytics?drilldown=earnings');
    }
  };

  const handleReadinessAction = (actionKey) => {
    if (actionKey === 'refresh-summary') {
      refreshOverview(shouldRebuildSummaries ? { rebuildSummaries: true } : undefined);
      return;
    }
    if (actionKey === 'open-ops') {
      navigate('/dashboard/integration');
    }
  };

  const quickNavCards = useMemo(() => {
    const cards = [
      {
        key: 'analytics',
        eyebrow: 'Analytics',
        metric: staleDatasetCount > 0 ? `${formatCompactCount(staleDatasetCount)} stale` : 'Current',
        title: 'Payroll drilldown',
        summary: `${formatCompactCurrency(stats.earnings.value)} YTD`,
        actionLabel: 'Open Analytics',
        onClick: () => navigate('/dashboard/analytics?drilldown=earnings'),
      },
      {
        key: 'alerts',
        eyebrow: 'Alerts',
        metric:
          alertFollowUp.needsAttentionCategories > 0
            ? `${formatCompactCount(alertFollowUp.needsAttentionCategories)} open`
            : 'All owned',
        title: 'Ownership gaps',
        summary: `${formatCompactCount(alertFollowUp.needsAttentionEmployees)} affected`,
        actionLabel: 'Open Alerts',
        onClick: () => navigate('/dashboard/alerts'),
      },
    ];

    if (permissions.canAccessIntegrationQueue) {
          cards.push({
        key: 'operations',
        eyebrow: 'Operations',
        metric:
          queueActionable > 0
            ? `${formatCompactCount(queueActionable)} actions`
            : 'Queue healthy',
        title: 'Queue health',
        summary: `${formatCompactCount(queueBacklog)} backlog`,
        actionLabel: 'Open Operations',
        onClick: () => navigate('/dashboard/integration'),
      });
    }

    return cards;
  }, [
    alertFollowUp.needsAttentionCategories,
    alertFollowUp.needsAttentionEmployees,
    navigate,
    permissions.canAccessIntegrationQueue,
    queueActionable,
    queueBacklog,
    staleDatasetCount,
    stats.earnings.value,
  ]);

  return (
    <div className="dashboard-page-stack">
      <section className="dashboard-overview-group">
        <ExecutiveBrief
          executiveBrief={executiveBrief}
          globalFreshness={globalFreshness}
          freshnessReadiness={freshnessReadiness}
          staleDatasetCount={staleDatasetCount}
          summaryErrorCount={summaryErrorCount}
          summaryRefreshError={summaryRefreshError}
          effectiveAlertStats={effectiveAlertStats}
          alertFollowUp={alertFollowUp}
          canAccessIntegrationQueue={permissions.canAccessIntegrationQueue}
          loadingIntegrationMetrics={loadingIntegrationMetrics}
          hasExecutiveIntegrationSnapshot={hasExecutiveIntegrationSnapshot}
          effectiveIntegrationError={effectiveIntegrationError}
          queueActionable={queueActionable}
          queueBacklog={queueBacklog}
          rebuildingSummaries={rebuildingSummaries}
          refreshing={refreshing}
          hasSummaryError={summaryErrorCount > 0}
          onRefresh={() => refreshOverview(shouldRebuildSummaries ? { rebuildSummaries: true } : undefined)}
          onExecutiveAction={handleExecutiveAction}
          getExecutiveActionLabel={(actionKey) => {
            if (actionKey === 'retry-summary' || actionKey === 'refresh-summary') {
              if (shouldRebuildSummaries) {
                return rebuildingSummaries ? 'Rebuilding...' : (freshnessReadiness?.actionLabel || 'Rebuild summaries');
              }
              return refreshing ? 'Refreshing...' : 'Refresh data';
            }
            if (actionKey === 'review-alert-ownership') return 'Open queue';
            if (actionKey === 'review-alerts') return 'Open alerts';
            if (actionKey === 'review-queue') return 'Open ops';
            if (actionKey === 'open-earnings') return 'Open drilldown';
            return 'Open';
          }}
        />
      </section>

      <div className="overview-main-grid">
        <section className="dashboard-overview-group overview-panel overview-panel--snapshot">
          <div className="overview-panel-header">
            <h2 className="overview-panel-title">Snapshot</h2>
          </div>
          <KPIGrid
            stats={stats}
            loadingEarnings={loadingEarnings}
            loadingVacation={loadingVacation}
            loadingBenefits={loadingBenefits}
            loadingAlerts={loadingAlerts}
            earningsError={earningsError}
            vacationError={vacationError}
            benefitsError={benefitsError}
            alertsError={alertsError}
            onRetryEarnings={() => void loadAllData()}
            onRetryVacation={() => void loadAllData()}
            onRetryBenefits={() => void loadAllData()}
            onRetryAlerts={() => void loadAllData()}
          />
        </section>

        <div className="overview-side-column">
          <OperationalReadinessPanel
            operationalReadiness={operationalReadiness}
            operationalReadinessError={operationalReadinessError}
            loadingOperationalReadiness={loadingOperationalReadiness}
            onRefresh={refreshOperationalReadiness}
            onAction={handleReadinessAction}
          />
        </div>

        <section className="dashboard-overview-group overview-panel overview-panel--actions">
          <div className="overview-panel-header">
            <h2 className="overview-panel-title">Shortcuts</h2>
          </div>
          <QuickNavGrid cards={quickNavCards} compact />
        </section>
      </div>
    </div>
  );
}
