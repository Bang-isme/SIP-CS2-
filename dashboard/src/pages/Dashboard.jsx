import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBenefitsSummary,
  getEarningsSummary,
  getExecutiveBrief,
  getIntegrationMetrics,
  getTriggeredAlerts,
  getVacationSummary,
} from '../services/api';
import EarningsChart from '../components/EarningsChart';
import VacationChart from '../components/VacationChart';
import BenefitsChart from '../components/BenefitsChart';
import AlertsPanel from '../components/AlertsPanel';
import { SkeletonChart, SkeletonList } from '../components/Skeletons';
import StatCard from '../components/StatCard';
import {
  FiAlertCircle,
  FiBell,
  FiCalendar,
  FiDollarSign,
  FiHeart,
  FiRefreshCw,
  FiSliders,
  FiUsers,
} from 'react-icons/fi';
import './Dashboard.css';

const DrilldownModal = lazy(() => import('../components/DrilldownModal'));
const IntegrationEventsPanel = lazy(() => import('../components/IntegrationEventsPanel'));
const AdminUsersModal = lazy(() => import('../components/AdminUsersModal'));
const AlertSettingsModal = lazy(() => import('../components/AlertSettingsModal'));
const FRESH_THRESHOLD_MINUTES = 120;
const QUEUE_ACTIONABLE_WARNING = 5;
const QUEUE_ACTIONABLE_CRITICAL = 20;
const QUEUE_PENDING_AGE_WARNING = 10;
const QUEUE_PENDING_AGE_CRITICAL = 30;
const ALERT_TYPE_META = {
  anniversary: { label: 'Anniversaries', severity: 'Low', severityRank: 1 },
  vacation: { label: 'High Vacation Balance', severity: 'High', severityRank: 3 },
  benefits_change: { label: 'Benefits Payroll Impact', severity: 'Medium', severityRank: 2 },
  birthday: { label: 'Birthday Alert', severity: 'Low', severityRank: 1 },
};
const ALERT_FOLLOW_UP_PRIORITY = {
  unassigned: 3,
  stale: 2,
  owned: 1,
};

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const getFreshnessInfo = (updatedAt) => {
  if (!updatedAt) {
    return {
      status: 'unknown',
      label: 'Unknown',
      css: 'unknown',
      staleMinutes: null,
      tooltip: 'No freshness metadata from API.',
    };
  }

  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) {
    return {
      status: 'unknown',
      label: 'Unknown',
      css: 'unknown',
      staleMinutes: null,
      tooltip: 'Invalid updatedAt metadata.',
    };
  }

  const staleMinutes = Math.max(0, Math.round((Date.now() - updatedDate.getTime()) / 60000));
  if (staleMinutes <= FRESH_THRESHOLD_MINUTES) {
    return {
      status: 'fresh',
      label: 'Fresh',
      css: 'fresh',
      staleMinutes,
      tooltip: `Updated ${staleMinutes} minute${staleMinutes === 1 ? '' : 's'} ago.`,
    };
  }

  return {
    status: 'stale',
    label: 'Stale',
    css: 'stale',
    staleMinutes,
    tooltip: `Updated ${staleMinutes} minutes ago.`,
  };
};

function Dashboard({ onLogout, currentUser }) {
  const [earnings, setEarnings] = useState(null);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [earningsMeta, setEarningsMeta] = useState(null);
  const [earningsError, setEarningsError] = useState('');

  const [vacation, setVacation] = useState(null);
  const [loadingVacation, setLoadingVacation] = useState(true);
  const [vacationMeta, setVacationMeta] = useState(null);
  const [vacationError, setVacationError] = useState('');

  const [benefits, setBenefits] = useState(null);
  const [loadingBenefits, setLoadingBenefits] = useState(true);
  const [benefitsMeta, setBenefitsMeta] = useState(null);
  const [benefitsError, setBenefitsError] = useState('');

  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alertsError, setAlertsError] = useState('');
  const [executiveSnapshot, setExecutiveSnapshot] = useState(null);
  const [executiveSnapshotError, setExecutiveSnapshotError] = useState('');

  const [integrationMetrics, setIntegrationMetrics] = useState(null);
  const [loadingIntegrationMetrics, setLoadingIntegrationMetrics] = useState(false);
  const [integrationMetricsError, setIntegrationMetricsError] = useState('');
  const [integrationError, setIntegrationError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [drilldown, setDrilldown] = useState(null);
  const [showAdminUsersModal, setShowAdminUsersModal] = useState(false);
  const [showAlertSettingsModal, setShowAlertSettingsModal] = useState(false);
  const [requestedAlertOpen, setRequestedAlertOpen] = useState(null);
  const currentYear = new Date().getFullYear();

  const currentRoles = useMemo(() => {
    if (!Array.isArray(currentUser?.roles)) return [];
    return currentUser.roles
      .map((role) => {
        if (!role) return null;
        if (typeof role === 'string') return role.toLowerCase();
        if (typeof role === 'object' && role.name) return String(role.name).toLowerCase();
        return null;
      })
      .filter(Boolean);
  }, [currentUser]);

  const canAccessIntegrationQueue = currentRoles.some(
    (roleName) => roleName === 'admin' || roleName === 'super_admin',
  );
  const canManageAlerts = currentRoles.some(
    (roleName) => roleName === 'moderator' || roleName === 'admin' || roleName === 'super_admin',
  );
  const canManageUsers = currentRoles.includes('super_admin');
  const effectiveRole = useMemo(() => {
    if (currentRoles.includes('super_admin')) return 'super_admin';
    if (currentRoles.includes('admin')) return 'admin';
    if (currentRoles.includes('moderator')) return 'moderator';
    if (currentRoles.includes('user')) return 'user';
    return 'anonymous';
  }, [currentRoles]);

  const formatMoney = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatNum = (value) => new Intl.NumberFormat('en-US').format(value || 0);

  const formatUpdatedAt = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fetchEarnings = async () => {
    setLoadingEarnings(true);
    setEarningsError('');
    try {
      const res = await getEarningsSummary(currentYear);
      setEarnings(res.data || null);
      setEarningsMeta(res.meta || null);
    } catch (error) {
      setEarnings(null);
      setEarningsMeta(null);
      setEarningsError(getErrorMessage(error, 'Unable to load earnings summary'));
    } finally {
      setLoadingEarnings(false);
    }
  };

  const fetchVacation = async () => {
    setLoadingVacation(true);
    setVacationError('');
    try {
      const res = await getVacationSummary(currentYear);
      setVacation(res.data || null);
      setVacationMeta(res.meta || null);
    } catch (error) {
      setVacation(null);
      setVacationMeta(null);
      setVacationError(getErrorMessage(error, 'Unable to load vacation summary'));
    } finally {
      setLoadingVacation(false);
    }
  };

  const fetchBenefits = async () => {
    setLoadingBenefits(true);
    setBenefitsError('');
    try {
      const res = await getBenefitsSummary();
      setBenefits(res.data || null);
      setBenefitsMeta(res.meta || null);
    } catch (error) {
      setBenefits(null);
      setBenefitsMeta(null);
      setBenefitsError(getErrorMessage(error, 'Unable to load benefits summary'));
    } finally {
      setLoadingBenefits(false);
    }
  };

  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    setAlertsError('');
    try {
      const res = await getTriggeredAlerts();
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setAlerts([]);
      setAlertsError(getErrorMessage(error, 'Unable to load triggered alerts'));
    } finally {
      setLoadingAlerts(false);
    }
  };

  const fetchExecutiveSnapshot = async () => {
    setExecutiveSnapshotError('');
    try {
      const res = await getExecutiveBrief(currentYear);
      setExecutiveSnapshot(res.data || null);
    } catch (error) {
      setExecutiveSnapshot(null);
      setExecutiveSnapshotError(getErrorMessage(error, 'Unable to load executive briefing snapshot'));
    }
  };

  const fetchIntegrationSnapshot = async () => {
    if (!canAccessIntegrationQueue) {
      setIntegrationMetrics(null);
      setIntegrationMetricsError('');
      setLoadingIntegrationMetrics(false);
      return;
    }

    setLoadingIntegrationMetrics(true);
    setIntegrationMetricsError('');
    try {
      const res = await getIntegrationMetrics();
      setIntegrationMetrics(res.data || null);
    } catch (error) {
      setIntegrationMetrics(null);
      setIntegrationMetricsError(getErrorMessage(error, 'Unable to load integration queue summary'));
    } finally {
      setLoadingIntegrationMetrics(false);
    }
  };

  const loadAllData = async () => {
    setRefreshing(true);
    const tasks = [
      fetchEarnings(),
      fetchVacation(),
      fetchBenefits(),
      fetchAlerts(),
      fetchExecutiveSnapshot(),
    ];
    if (canAccessIntegrationQueue) {
      tasks.push(fetchIntegrationSnapshot());
    } else {
      setIntegrationMetrics(null);
      setIntegrationMetricsError('');
    }
    await Promise.allSettled(tasks);
    setRefreshing(false);
  };

  useEffect(() => {
    void loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccessIntegrationQueue]);

  const stats = useMemo(() => {
    const earningsRows = earnings?.byDepartment ? Object.values(earnings.byDepartment) : [];
    const totalEarnings = earningsRows.reduce((acc, curr) => acc + Number(curr?.current || 0), 0);
    const previousEarnings = earningsRows.reduce((acc, curr) => acc + Number(curr?.previous || 0), 0);
    const earningsTrend = previousEarnings
      ? ((totalEarnings - previousEarnings) / previousEarnings) * 100
      : 0;

    const totalVacation = Number(vacation?.totals?.current || 0);
    const previousVacation = Number(vacation?.totals?.previous || 0);
    const vacationTrend = previousVacation
      ? ((totalVacation - previousVacation) / previousVacation) * 100
      : 0;

    const shareholderCount = Number(benefits?.byShareholder?.shareholder?.count || 0);
    const nonShareholderCount = Number(benefits?.byShareholder?.nonShareholder?.count || 0);
    const employeeCount = shareholderCount + nonShareholderCount;
    const shareholderPaid = Number(benefits?.byShareholder?.shareholder?.totalPaid || 0);
    const nonShareholderPaid = Number(benefits?.byShareholder?.nonShareholder?.totalPaid || 0);
    const totalBenefits = shareholderPaid + nonShareholderPaid;
    const avgBenefits = employeeCount > 0 ? totalBenefits / employeeCount : 0;

    const alertCategories = alerts.filter((item) => Number(item?.count || 0) > 0).length;
    const totalAffected = alerts.reduce((acc, curr) => acc + Number(curr?.count || 0), 0);

    return {
      earnings: { value: totalEarnings, trend: earningsTrend },
      vacation: { value: totalVacation, trend: vacationTrend },
      benefits: { value: avgBenefits, trend: 'neutral', subtext: 'Per Employee / Year' },
      alerts: { categories: alertCategories, affected: totalAffected },
    };
  }, [earnings, vacation, benefits, alerts]);

  const earningsFreshness = useMemo(() => getFreshnessInfo(earningsMeta?.updatedAt), [earningsMeta]);
  const vacationFreshness = useMemo(() => getFreshnessInfo(vacationMeta?.updatedAt), [vacationMeta]);
  const benefitsFreshness = useMemo(() => getFreshnessInfo(benefitsMeta?.updatedAt), [benefitsMeta]);

  const fallbackLastUpdatedAt = useMemo(() => {
    const candidates = [earningsMeta?.updatedAt, vacationMeta?.updatedAt, benefitsMeta?.updatedAt]
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));
    if (candidates.length === 0) return null;
    return new Date(Math.max(...candidates.map((date) => date.getTime()))).toISOString();
  }, [earningsMeta, vacationMeta, benefitsMeta]);

  const fallbackGlobalFreshness = useMemo(() => {
    const states = [earningsFreshness, vacationFreshness, benefitsFreshness];
    if (states.every((item) => item.status === 'unknown')) {
      return {
        label: 'Unknown',
        css: 'unknown',
        tooltip: 'No freshness metadata from core summary endpoints.',
      };
    }

    if (states.some((item) => item.status === 'stale')) {
      const staleValues = states
        .map((item) => item.staleMinutes)
        .filter((value) => Number.isFinite(value));
      const maxStale = staleValues.length > 0 ? Math.max(...staleValues) : null;
      return {
        label: 'Stale',
        css: 'stale',
        tooltip: maxStale !== null
          ? `One or more datasets are stale (${maxStale}m old).`
          : 'One or more datasets are stale.',
      };
    }

    return {
      label: 'Fresh',
      css: 'fresh',
      tooltip: 'All core datasets updated recently.',
    };
  }, [earningsFreshness, vacationFreshness, benefitsFreshness]);

  const snapshotFreshness = !executiveSnapshotError ? executiveSnapshot?.freshness : null;
  const lastUpdatedAt = snapshotFreshness?.global?.lastUpdatedAt || fallbackLastUpdatedAt;
  const globalFreshness = snapshotFreshness?.global || fallbackGlobalFreshness;
  const hasSummaryError = Boolean(earningsError || vacationError || benefitsError);
  const summaryErrorCount = [earningsError, vacationError, benefitsError].filter(Boolean).length;
  const staleDatasetCount = [earningsFreshness, vacationFreshness, benefitsFreshness].filter(
    (item) => item.status === 'stale',
  ).length;
  const computedAlertFollowUp = useMemo(() => {
    const items = (alerts || [])
      .filter((item) => Number(item?.count || 0) > 0)
      .map((item) => {
        const type = item?.alert?.type;
        const meta = ALERT_TYPE_META[type] || {};
        const acknowledgement = item?.alert?.acknowledgement || null;
        const count = Number(item?.count || 0);
        const acknowledgedCount = Number(acknowledgement?.acknowledgedCount || 0);
        const status = acknowledgement?.needsReview
          ? 'stale'
          : acknowledgement?.acknowledgedAt
            ? 'owned'
            : 'unassigned';

        let detail = 'Owner note is current for this alert category.';
        if (status === 'unassigned') {
          detail = 'No owner note is recorded for the current alert snapshot.';
        } else if (status === 'stale') {
          detail = acknowledgedCount > 0 && acknowledgedCount !== count
            ? `Alert volume moved from ${acknowledgedCount} to ${count} employees since the last note.`
            : 'The current snapshot refreshed after the last acknowledgement.';
        } else if (acknowledgement?.note) {
          detail = acknowledgement.note;
        }

        return {
          alertId: item?.alert?._id || `${type}-${count}`,
          label: meta.label || item?.alert?.name || 'Alert',
          severity: meta.severity || 'Low',
          severityRank: meta.severityRank || 0,
          status,
          statusRank: ALERT_FOLLOW_UP_PRIORITY[status] || 0,
          count,
          detail,
          ownerLabel: acknowledgement?.acknowledgedBy?.username
            || acknowledgement?.acknowledgedBy?.email
            || 'Unassigned',
          acknowledgedAt: acknowledgement?.acknowledgedAt || null,
          actionLabel: status === 'unassigned'
            ? 'Assign Owner'
            : status === 'stale'
              ? 'Re-review Alert'
              : 'Open Note',
        };
      })
      .sort((a, b) => {
        if (b.statusRank !== a.statusRank) return b.statusRank - a.statusRank;
        if (b.severityRank !== a.severityRank) return b.severityRank - a.severityRank;
        return b.count - a.count;
      });

    const queue = items.filter((item) => item.status !== 'owned');

    return {
      items,
      queue,
      queuePreview: queue.slice(0, 3),
      needsAttentionCategories: queue.length,
      needsAttentionEmployees: queue.reduce((sum, item) => sum + item.count, 0),
      unassignedCategories: items.filter((item) => item.status === 'unassigned').length,
      staleCategories: items.filter((item) => item.status === 'stale').length,
      ownedCategories: items.filter((item) => item.status === 'owned').length,
    };
  }, [alerts]);

  const alertFollowUp = !executiveSnapshotError && executiveSnapshot?.alerts?.followUp
    ? executiveSnapshot.alerts.followUp
    : computedAlertFollowUp;
  const effectiveAlertStats = !executiveSnapshotError && executiveSnapshot?.alerts?.stats
    ? executiveSnapshot.alerts.stats
    : stats.alerts;
  const effectiveIntegrationSnapshot = !executiveSnapshotError ? executiveSnapshot?.integration : null;
  const hasExecutiveIntegrationSnapshot = Boolean(
    !executiveSnapshotError
    && executiveSnapshot?.integration
    && (
      Object.prototype.hasOwnProperty.call(executiveSnapshot.integration, 'metrics')
      || Object.prototype.hasOwnProperty.call(executiveSnapshot.integration, 'error')
    ),
  );
  const effectiveIntegrationMetrics = effectiveIntegrationSnapshot?.metrics || integrationMetrics;
  const effectiveIntegrationError = hasExecutiveIntegrationSnapshot
    ? (effectiveIntegrationSnapshot?.error || '')
    : integrationMetricsError;
  const queueActionable = Number(effectiveIntegrationMetrics?.actionable || 0);
  const queueBacklog = Number(effectiveIntegrationMetrics?.backlog || 0);
  const queueOldestPendingAge = Number(effectiveIntegrationMetrics?.oldestPendingAgeMinutes || 0);

  const computedExecutiveBrief = useMemo(() => {
    const items = [];

    if (summaryErrorCount > 0) {
      items.push({
        key: 'retry-summary',
        tone: 'critical',
        title: 'Core summaries are partially unavailable',
        detail: `${summaryErrorCount} summary feed${summaryErrorCount === 1 ? ' is' : 's are'} failing. Refresh before using this snapshot in the CEO memo.`,
      });
    }

    if (staleDatasetCount > 0) {
      items.push({
        key: 'refresh-summary',
        tone: 'warning',
        title: 'Pre-aggregated data is stale',
        detail: `${staleDatasetCount} dataset${staleDatasetCount === 1 ? '' : 's'} exceeded the ${FRESH_THRESHOLD_MINUTES}-minute freshness window.`,
      });
    }

    if (stats.alerts.categories > 0) {
      if (alertFollowUp.needsAttentionCategories > 0) {
        items.push({
          key: 'review-alert-ownership',
          tone: alertFollowUp.unassignedCategories > 0 ? 'critical' : 'warning',
          title: alertFollowUp.unassignedCategories > 0
            ? 'Alert ownership still has gaps'
            : 'Alert ownership needs re-review',
          detail: `${formatNum(alertFollowUp.unassignedCategories)} unassigned, ${formatNum(alertFollowUp.staleCategories)} stale across ${formatNum(alertFollowUp.needsAttentionEmployees)} affected employees.`,
        });
      }

      items.push({
        key: 'review-alerts',
        tone: alertFollowUp.needsAttentionCategories > 0
          ? 'info'
          : stats.alerts.affected >= 10 || stats.alerts.categories >= 2
            ? 'warning'
            : 'info',
        title: alertFollowUp.needsAttentionCategories > 0
          ? 'Manage-by-exception queue is active'
          : 'Alert queue is covered by active owners',
        detail: alertFollowUp.needsAttentionCategories > 0
          ? `${formatNum(stats.alerts.affected)} employees are currently covered by ${stats.alerts.categories} active alert categories.`
          : `All ${formatNum(stats.alerts.categories)} active alert categories have a current acknowledgement note.`,
      });
    }

    if (canAccessIntegrationQueue) {
      if (effectiveIntegrationError) {
        items.push({
          key: 'review-queue',
          tone: 'warning',
          title: 'Queue health summary is unavailable',
          detail: 'Open the integration monitor and verify retry/replay controls before treating the sync path as healthy.',
        });
      } else if (queueActionable > 0 || queueBacklog > 0) {
        const queueTone = queueActionable >= QUEUE_ACTIONABLE_CRITICAL
          || queueOldestPendingAge >= QUEUE_PENDING_AGE_CRITICAL
          ? 'critical'
          : queueActionable >= QUEUE_ACTIONABLE_WARNING
            || queueOldestPendingAge >= QUEUE_PENDING_AGE_WARNING
            ? 'warning'
            : 'info';

        items.push({
          key: 'review-queue',
          tone: queueTone,
          title: 'Outbox recovery needs operator review',
          detail: `${formatNum(queueActionable)} actionable event${queueActionable === 1 ? '' : 's'}, backlog ${formatNum(queueBacklog)}, oldest pending ${queueOldestPendingAge || 0}m.`,
        });
      }
    }

    if (items.length === 0) {
      items.push({
        key: 'open-earnings',
        tone: 'healthy',
        title: 'Dashboard is ready for executive review',
        detail: 'No core blockers detected. Use drilldown to answer follow-up questions without leaving the briefing flow.',
      });
    }

    const hasCritical = items.some((item) => item.tone === 'critical');
    const hasWarning = items.some((item) => item.tone === 'warning');
    const hasInfo = items.some((item) => item.tone === 'info');
    const tone = hasCritical ? 'critical' : hasWarning || hasInfo ? 'warning' : 'healthy';
    const headline = hasCritical
      ? 'Action is required before this snapshot is safe to present.'
      : hasWarning || hasInfo
        ? 'The dashboard is usable, but several follow-ups should be cleared first.'
        : 'The dashboard is stable and ready for memo defense.';
    const summary = hasCritical
      ? 'Resolve failed summary feeds or outbox risks before using this view as executive evidence.'
      : hasWarning || hasInfo
        ? 'Focus on the highest-impact exception first, then use drilldown to validate the affected scope.'
        : 'Current aggregates, alerts, and queue signals do not show immediate blockers.';

    return {
      tone,
      label: hasCritical ? 'Action Required' : hasWarning || hasInfo ? 'Monitor Closely' : 'Ready for Memo',
      headline,
      summary,
      items: items.slice(0, 3),
    };
  }, [
    canAccessIntegrationQueue,
    alertFollowUp.needsAttentionCategories,
    alertFollowUp.needsAttentionEmployees,
    alertFollowUp.staleCategories,
    alertFollowUp.unassignedCategories,
    effectiveIntegrationError,
    queueActionable,
    queueBacklog,
    queueOldestPendingAge,
    staleDatasetCount,
    stats.alerts.affected,
    stats.alerts.categories,
    summaryErrorCount,
  ]);

  const executiveBrief = useMemo(() => {
    if (executiveSnapshot?.actionCenter && !executiveSnapshotError) {
      const backendBrief = executiveSnapshot.actionCenter;
      return {
        tone: backendBrief.status === 'critical'
          ? 'critical'
          : backendBrief.status === 'healthy'
            ? 'healthy'
            : 'warning',
        label: backendBrief.label || 'Monitor Closely',
        headline: backendBrief.headline,
        summary: backendBrief.summary,
        items: Array.isArray(backendBrief.items) ? backendBrief.items.slice(0, 3) : [],
      };
    }

    return computedExecutiveBrief;
  }, [computedExecutiveBrief, executiveSnapshot, executiveSnapshotError]);

  const openAlertReview = useCallback((alertId) => {
    if (alertId) {
      setRequestedAlertOpen({
        alertId,
        token: Date.now(),
      });
    }
    document.getElementById('dashboard-alerts-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const handleRequestedAlertHandled = useCallback(() => {
    setRequestedAlertOpen(null);
  }, []);

  const runExecutiveAction = (actionKey) => {
    if (actionKey === 'retry-summary' || actionKey === 'refresh-summary') {
      void loadAllData();
      return;
    }

    if (actionKey === 'review-alert-ownership') {
      openAlertReview(alertFollowUp.queuePreview[0]?.alertId);
      return;
    }

    if (actionKey === 'review-alerts') {
      openAlertReview(alertFollowUp.items[0]?.alertId);
      return;
    }

    if (actionKey === 'review-queue') {
      document.getElementById('dashboard-integration-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      return;
    }

    if (actionKey === 'open-earnings') {
      openContextDrilldown('earnings');
    }
  };

  const getExecutiveActionLabel = (actionKey) => {
    if (actionKey === 'retry-summary') return refreshing ? 'Refreshing...' : 'Refresh All Data';
    if (actionKey === 'refresh-summary') return refreshing ? 'Refreshing...' : 'Refresh Freshness';
    if (actionKey === 'review-alert-ownership') return 'Open Follow-up Queue';
    if (actionKey === 'review-alerts') return 'Review Alerts';
    if (actionKey === 'review-queue') return 'Review Queue';
    if (actionKey === 'open-earnings') return 'Open Earnings Drilldown';
    return 'Open';
  };

  const handleLogout = () => {
    onLogout();
  };

  const handleDrilldown = (filters) => {
    setDrilldown(filters);
  };

  const openContextDrilldown = (context) => {
    setDrilldown({ context });
  };

  const handleAlertAcknowledged = (alertId, acknowledgement) => {
    setAlerts((currentAlerts) => currentAlerts.map((item) => {
      if (item?.alert?._id !== alertId) {
        return item;
      }
      return {
        ...item,
        alert: {
          ...item.alert,
          acknowledgement,
        },
      };
    }));
    void fetchExecutiveSnapshot();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>
            <span>HQ</span> HR & Payroll Analytics
          </h1>
          <p className="subtitle-meta-row subtitle-meta-compact">
            <span className="subtitle-context">Executive Overview - FY {currentYear}</span>
            <span className={`freshness-pill ${globalFreshness.css}`} title={globalFreshness.tooltip}>
              {globalFreshness.label}
            </span>
            <span>Data updated: {formatUpdatedAt(lastUpdatedAt)}</span>
          </p>
        </div>
        <div className="header-right">
          <div className="system-status">
            <span className="dot online"></span> Systems Active
          </div>
          {canManageUsers && (
            <button
              onClick={() => setShowAdminUsersModal(true)}
              className="manage-users-btn"
              type="button"
            >
              <FiUsers size={14} />
              Manage Users
            </button>
          )}
          <button
            onClick={() => {
              void loadAllData();
            }}
            className="refresh-btn"
            disabled={refreshing}
          >
            <FiRefreshCw size={14} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Sign Out
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {hasSummaryError && (
          <div className="dashboard-banner dashboard-banner-error" role="alert">
            <div className="dashboard-banner-text">
              <FiAlertCircle size={14} />
              <span>Summary data is partially unavailable. Retry failed sections before making decisions.</span>
            </div>
            <button
              className="panel-action"
              onClick={() => {
                void loadAllData();
              }}
              disabled={refreshing}
            >
              {refreshing ? 'Retrying...' : 'Retry Failed Loads'}
            </button>
          </div>
        )}

        <section className={`executive-brief executive-brief--${executiveBrief.tone}`}>
          <div className="executive-brief-main">
            <div className="executive-brief-eyebrow">Executive Action Center</div>
            <div className="executive-brief-title-row">
              <h2>{executiveBrief.headline}</h2>
              <span className={`executive-brief-pill executive-brief-pill--${executiveBrief.tone}`}>
                {executiveBrief.label}
              </span>
            </div>
            <p className="executive-brief-summary">{executiveBrief.summary}</p>

            <div className="executive-brief-metrics">
              <div className="executive-metric">
                <span className="executive-metric-label">Freshness</span>
                <span className={`executive-metric-value executive-metric-value--${globalFreshness.css}`}>
                  {globalFreshness.label}
                </span>
              </div>
              <div className="executive-metric">
                <span className="executive-metric-label">Summary Failures</span>
                <span className="executive-metric-value">{formatNum(summaryErrorCount)}</span>
              </div>
              <div className="executive-metric">
                <span className="executive-metric-label">Alert Follow-up</span>
                <span className="executive-metric-value">
                  {effectiveAlertStats.categories === 0
                    ? 'Clear'
                    : alertFollowUp.needsAttentionCategories > 0
                      ? `${formatNum(alertFollowUp.needsAttentionCategories)} pending / ${formatNum(effectiveAlertStats.categories)} active`
                      : 'All Owned'}
                </span>
              </div>
              <div className="executive-metric">
                <span className="executive-metric-label">Integration Queue</span>
                <span className="executive-metric-value">
                  {canAccessIntegrationQueue
                    ? !hasExecutiveIntegrationSnapshot && loadingIntegrationMetrics
                      ? 'Loading...'
                      : effectiveIntegrationError
                        ? 'Degraded'
                        : `${formatNum(queueActionable)} actionable / ${formatNum(queueBacklog)} backlog`
                    : `Restricted (${effectiveRole})`}
                </span>
              </div>
            </div>
          </div>

          <div className="executive-brief-list" aria-label="Executive action items">
            {executiveBrief.items.map((item) => (
              <article
                key={item.key}
                className={`executive-task executive-task--${item.tone}`}
              >
                <div className="executive-task-copy">
                  <span className="executive-task-title">{item.title}</span>
                  <p>{item.detail}</p>
                </div>
                <button
                  type="button"
                  className="executive-task-button"
                  onClick={() => runExecutiveAction(item.key)}
                  disabled={refreshing && (item.key === 'retry-summary' || item.key === 'refresh-summary')}
                >
                  {item.actionLabel || getExecutiveActionLabel(item.key)}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="kpi-grid">
          <StatCard
            title="Total Payroll YTD"
            value={formatMoney(stats.earnings.value)}
            icon={<FiDollarSign size={16} />}
            subtext={`${stats.earnings.trend > 0 ? '+' : ''}${stats.earnings.trend.toFixed(1)}% vs Last Year`}
            trend={stats.earnings.trend >= 0 ? 'up' : 'down'}
            loading={loadingEarnings}
            error={earningsError}
            onRetry={fetchEarnings}
          />
          <StatCard
            title="Total Vacation Days"
            value={`${formatNum(stats.vacation.value)} Days`}
            icon={<FiCalendar size={16} />}
            subtext={`${stats.vacation.trend > 0 ? '+' : ''}${stats.vacation.trend.toFixed(1)}% vs Last Year`}
            trend={stats.vacation.trend <= 0 ? 'up' : 'neutral'}
            loading={loadingVacation}
            error={vacationError}
            onRetry={fetchVacation}
          />
          <StatCard
            title="Avg Benefits Cost"
            value={formatMoney(stats.benefits.value)}
            icon={<FiHeart size={16} />}
            subtext={stats.benefits.subtext}
            trend={stats.benefits.trend}
            loading={loadingBenefits}
            error={benefitsError}
            onRetry={fetchBenefits}
          />
          <StatCard
            title="Action Items"
            value={`${stats.alerts.categories} Alerts`}
            icon={<FiBell size={16} />}
            subtext={`${formatNum(stats.alerts.affected)} employees affected`}
            trend={stats.alerts.categories > 0 ? 'down' : 'up'}
            loading={loadingAlerts}
            error={alertsError}
            onRetry={fetchAlerts}
          />
        </section>

        <section className="dashboard-main-layout">
          <div className="decision-column">
            <div className="card earnings-section">
              <div className="card-header">
                <div>
                  <h2>Earnings Overview</h2>
                  <span className="card-subtitle">Distribution by Department</span>
                </div>
                <div className="card-header-actions">
                  <span className={`freshness-badge ${earningsFreshness.css}`} title={earningsFreshness.tooltip}>
                    {earningsFreshness.label}
                  </span>
                  <button
                    className="panel-link"
                    onClick={() => openContextDrilldown('earnings')}
                    disabled={loadingEarnings || Boolean(earningsError) || !earnings}
                  >
                    Open Drilldown
                  </button>
                </div>
              </div>
              <div className="card-hint">Quick query: use Drilldown -&gt; Min Earnings &gt; $X</div>
              {loadingEarnings ? (
                <SkeletonChart />
              ) : earningsError ? (
                <div className="panel-state panel-state-error">
                  <p>{earningsError}</p>
                  <button className="panel-action" onClick={fetchEarnings} disabled={loadingEarnings}>
                    Retry
                  </button>
                </div>
              ) : earnings ? (
                <EarningsChart
                  data={earnings}
                  onDrilldown={(filters) => handleDrilldown({ ...filters, context: 'earnings' })}
                />
              ) : (
                <div className="panel-state panel-state-empty">
                  <p>No earnings data available for current filters.</p>
                </div>
              )}
            </div>

            <section className="charts-grid-secondary">
              <div className="card vacation-section">
                <div className="card-header">
                  <div>
                    <h2>Time-off Overview</h2>
                    <span className="card-subtitle">Usage trends and concentration</span>
                  </div>
                  <div className="card-header-actions">
                    <span className={`freshness-badge ${vacationFreshness.css}`} title={vacationFreshness.tooltip}>
                      {vacationFreshness.label}
                    </span>
                    <button
                      className="panel-link"
                      onClick={() => openContextDrilldown('vacation')}
                      disabled={loadingVacation || Boolean(vacationError) || !vacation}
                    >
                      Open Drilldown
                    </button>
                  </div>
                </div>
                {loadingVacation ? (
                  <SkeletonChart />
                ) : vacationError ? (
                  <div className="panel-state panel-state-error">
                    <p>{vacationError}</p>
                    <button className="panel-action" onClick={fetchVacation} disabled={loadingVacation}>
                      Retry
                    </button>
                  </div>
                ) : vacation ? (
                  <VacationChart
                    data={vacation}
                    onDrilldown={(filters) => handleDrilldown({ ...filters, context: 'vacation' })}
                  />
                ) : (
                  <div className="panel-state panel-state-empty">
                    <p>No vacation data available for this period.</p>
                  </div>
                )}
              </div>

              <div className="card benefits-section">
                <div className="card-header">
                  <div>
                    <h2>Benefits Plan Distribution</h2>
                    <span className="card-subtitle">Cost efficiency signals</span>
                  </div>
                  <div className="card-header-actions">
                    <span className={`freshness-badge ${benefitsFreshness.css}`} title={benefitsFreshness.tooltip}>
                      {benefitsFreshness.label}
                    </span>
                    <button
                      className="panel-link"
                      onClick={() => openContextDrilldown('benefits')}
                      disabled={loadingBenefits || Boolean(benefitsError) || !benefits}
                    >
                      Open Drilldown
                    </button>
                  </div>
                </div>
                {loadingBenefits ? (
                  <SkeletonChart />
                ) : benefitsError ? (
                  <div className="panel-state panel-state-error">
                    <p>{benefitsError}</p>
                    <button className="panel-action" onClick={fetchBenefits} disabled={loadingBenefits}>
                      Retry
                    </button>
                  </div>
                ) : benefits ? (
                  <BenefitsChart
                    data={benefits}
                    onDrilldown={(filters) => handleDrilldown({ ...filters, context: 'benefits' })}
                  />
                ) : (
                  <div className="panel-state panel-state-empty">
                    <p>No benefits data available for this period.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="operations-rail">
            <div className="card follow-up-section">
              <div className="card-header">
                <div>
                  <h2>Alert Follow-up Queue</h2>
                  <span className="card-subtitle">Ownership and re-review priority</span>
                </div>
                <div className="card-header-actions">
                  <span className="badge-count">{formatNum(alertFollowUp.needsAttentionCategories)}</span>
                  <span className={`freshness-badge ${alertFollowUp.needsAttentionCategories > 0 ? 'stale' : 'fresh'}`}>
                    {alertFollowUp.needsAttentionCategories > 0 ? 'Needs Review' : 'Owned'}
                  </span>
                </div>
              </div>
              <div className="card-hint">Operational cue: assign an owner first, then re-check alerts whose snapshot changed.</div>
              {loadingAlerts ? (
                <SkeletonList />
              ) : alertsError ? (
                <div className="panel-state panel-state-error">
                  <p>{alertsError}</p>
                  <button className="panel-action" onClick={fetchAlerts} disabled={loadingAlerts}>
                    Retry
                  </button>
                </div>
              ) : alerts.length > 0 ? (
                alertFollowUp.queuePreview.length > 0 ? (
                  <div className="follow-up-queue">
                    <div className="follow-up-summary">
                      <div className="follow-up-summary-item">
                        <span className="follow-up-summary-label">Unassigned</span>
                        <span className="follow-up-summary-value">{formatNum(alertFollowUp.unassignedCategories)}</span>
                      </div>
                      <div className="follow-up-summary-item">
                        <span className="follow-up-summary-label">Needs Re-review</span>
                        <span className="follow-up-summary-value">{formatNum(alertFollowUp.staleCategories)}</span>
                      </div>
                      <div className="follow-up-summary-item">
                        <span className="follow-up-summary-label">Employees at Risk</span>
                        <span className="follow-up-summary-value">{formatNum(alertFollowUp.needsAttentionEmployees)}</span>
                      </div>
                    </div>

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
                          <div className="follow-up-item-main">
                            <h3>{item.label}</h3>
                            <p>{item.detail}</p>
                          </div>
                          <div className="follow-up-meta">
                            <span>{formatNum(item.count)} employees</span>
                            <span>{item.ownerLabel}</span>
                            <span>{item.acknowledgedAt ? `Updated ${formatUpdatedAt(item.acknowledgedAt)}` : 'No note yet'}</span>
                          </div>
                          <button
                            type="button"
                            className="panel-action follow-up-action"
                            onClick={() => openAlertReview(item.alertId)}
                          >
                            {item.actionLabel}
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="panel-state panel-state-empty">
                    <p>All active alert categories currently have a current acknowledgement.</p>
                    <p className="panel-state-caption">Use the alerts panel below if you need to inspect employee rows or update the owner note.</p>
                    <button className="panel-action" onClick={() => openAlertReview(alertFollowUp.items[0]?.alertId)}>
                      Review Alerts
                    </button>
                  </div>
                )
              ) : (
                <div className="panel-state panel-state-empty">
                  <p>No alert categories are active, so there is no follow-up queue right now.</p>
                </div>
              )}
            </div>

            <div className="card alerts-section" id="dashboard-alerts-section">
              <div className="card-header">
                <div>
                  <h2>Action Items & Alerts</h2>
                  <span className="card-subtitle">Manage-by-exception</span>
                </div>
                <div className="card-header-actions">
                  {canManageAlerts && (
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
                    onClick={fetchAlerts}
                    disabled={loadingAlerts}
                  >
                    {loadingAlerts ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              </div>
              <div className="card-hint">Decision view: prioritize high-severity alerts first.</div>
              {loadingAlerts ? (
                <SkeletonList />
              ) : alertsError ? (
                <div className="panel-state panel-state-error">
                  <p>{alertsError}</p>
                  <button className="panel-action" onClick={fetchAlerts} disabled={loadingAlerts}>
                    Retry
                  </button>
                </div>
              ) : alerts.length > 0 ? (
                <AlertsPanel
                  alerts={alerts}
                  canManageAlerts={canManageAlerts}
                  onAlertAcknowledged={handleAlertAcknowledged}
                  requestedAlertOpen={requestedAlertOpen}
                  onRequestedAlertHandled={handleRequestedAlertHandled}
                />
              ) : (
                <div className="panel-state panel-state-empty">
                  <p>No active alerts. System is currently clear.</p>
                </div>
              )}
            </div>

            <div className="card integration-section" id="dashboard-integration-section">
              <div className="card-header">
                <div>
                  <h2>Integration Exceptions</h2>
                  <span className="card-subtitle">Queue health and recovery controls</span>
                </div>
                <div className="card-header-actions">
                  <span className="badge-count">Outbox</span>
                  {integrationError && <span className="integration-inline-error">Degraded</span>}
                </div>
              </div>
              <div className="card-hint">Diagnostic view: use retry/replay after validating impacted scope.</div>
              {canAccessIntegrationQueue ? (
                <Suspense
                  fallback={
                    <div className="panel-state panel-state-loading">
                      <FiRefreshCw size={14} className="spin" />
                      <p>Loading integration queue...</p>
                    </div>
                  }
                >
                  <IntegrationEventsPanel onErrorChange={setIntegrationError} />
                </Suspense>
              ) : (
                <div className="panel-state panel-state-empty">
                  <p>Integration Queue is restricted to admin or super-admin role.</p>
                  <p className="panel-state-caption">Current effective role: {effectiveRole}</p>
                  <p className="panel-state-caption">Use an admin or super-admin account to run retry/replay operations.</p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>

      {drilldown && (
        <Suspense
          fallback={
            <div className="modal-loading-overlay">
              <div className="modal-loading-card">
                <FiRefreshCw size={14} className="spin" />
                <span>Opening drilldown...</span>
              </div>
            </div>
          }
        >
          <DrilldownModal
            filters={drilldown}
            onClose={() => setDrilldown(null)}
          />
        </Suspense>
      )}

      {showAdminUsersModal && (
        <Suspense
          fallback={
            <div className="modal-loading-overlay">
              <div className="modal-loading-card">
                <FiRefreshCw size={14} className="spin" />
                <span>Opening user manager...</span>
              </div>
            </div>
          }
        >
          <AdminUsersModal
            onClose={() => setShowAdminUsersModal(false)}
            currentUser={currentUser}
          />
        </Suspense>
      )}

      {showAlertSettingsModal && (
        <Suspense
          fallback={
            <div className="modal-loading-overlay">
              <div className="modal-loading-card">
                <FiRefreshCw size={14} className="spin" />
                <span>Opening alert settings...</span>
              </div>
            </div>
          }
        >
          <AlertSettingsModal
            onClose={() => setShowAlertSettingsModal(false)}
            onSaveSuccess={async () => {
              await Promise.allSettled([
                fetchAlerts(),
                fetchExecutiveSnapshot(),
              ]);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default Dashboard;
