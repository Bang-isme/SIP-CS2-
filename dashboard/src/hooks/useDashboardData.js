import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBenefitsSummary,
  getEarningsSummary,
  getExecutiveBrief,
  getIntegrationMetrics,
  getOperationalReadiness,
  getTriggeredAlerts,
  getVacationSummary,
  refreshDashboardSummaries,
} from '../services/api';
import { getErrorMessage, formatNumber } from '../utils/formatters';

const formatNum = formatNumber;

/* ────────────────────────────── constants ────────────────────────────── */

const FRESH_THRESHOLD_MINUTES = 120;
const QUEUE_ACTIONABLE_WARNING = 5;
const QUEUE_ACTIONABLE_CRITICAL = 20;
const QUEUE_PENDING_AGE_WARNING = 10;
const QUEUE_PENDING_AGE_CRITICAL = 30;

export const ALERT_TYPE_META = {
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

const isRequestAborted = (error, signal) => {
  return Boolean(
    signal?.aborted
    || error?.code === 'ERR_CANCELED'
    || error?.name === 'CanceledError',
  );
};

/* ────────────────────────────── helpers ──────────────────────────────── */

export const getFreshnessInfo = (updatedAt) => {
  if (!updatedAt) {
    return { status: 'unknown', label: 'Unknown', css: 'unknown', staleMinutes: null, tooltip: 'No freshness metadata from API.' };
  }
  const updatedDate = new Date(updatedAt);
  if (Number.isNaN(updatedDate.getTime())) {
    return { status: 'unknown', label: 'Unknown', css: 'unknown', staleMinutes: null, tooltip: 'Invalid updatedAt metadata.' };
  }
  const staleMinutes = Math.max(0, Math.round((Date.now() - updatedDate.getTime()) / 60000));
  if (staleMinutes <= FRESH_THRESHOLD_MINUTES) {
    return { status: 'fresh', label: 'Fresh', css: 'fresh', staleMinutes, tooltip: `Updated ${staleMinutes} minute${staleMinutes === 1 ? '' : 's'} ago.` };
  }
  return { status: 'stale', label: 'Stale', css: 'stale', staleMinutes, tooltip: `Updated ${staleMinutes} minutes ago.` };
};

const buildFallbackFreshnessReadiness = (globalFreshness) => {
  if (!globalFreshness) {
    return {
      status: 'unknown',
      label: 'Unknown',
      css: 'unknown',
      summary: 'Freshness unknown',
      note: 'Check summaries',
      detail: 'The dashboard could not determine summary freshness from the current metadata.',
      actionMode: 'reload',
      actionLabel: 'Refresh data',
    };
  }

  if (globalFreshness.css === 'unknown') {
    return {
      status: 'coverage_gap',
      label: 'Coverage gap',
      css: 'unknown',
      summary: 'Coverage incomplete',
      note: 'Rebuild needed',
      detail: globalFreshness.tooltip || 'One or more summary datasets are missing metadata or rows.',
      actionMode: 'rebuild',
      actionLabel: 'Rebuild summaries',
    };
  }

  if (globalFreshness.css === 'stale') {
    return {
      status: 'refresh_lag',
      label: 'Refresh lag',
      css: 'stale',
      summary: 'Summary refresh lag',
      note: 'Rebuild needed',
      detail: globalFreshness.tooltip || 'One or more summary datasets are outside the freshness window.',
      actionMode: 'rebuild',
      actionLabel: 'Rebuild summaries',
    };
  }

  return {
    status: 'current',
    label: 'Current',
    css: 'fresh',
    summary: 'Summaries current',
    note: 'Ready',
    detail: globalFreshness.tooltip || 'Core summary datasets are current.',
    actionMode: 'reload',
    actionLabel: 'Refresh data',
  };
};

const softenExecutiveHeadline = (headline) => {
  if (headline === 'Action is required before this snapshot is safe to present.') return 'This snapshot needs a quick review before presentation.';
  if (headline === 'The dashboard is usable, but several follow-ups should be cleared first.') return 'This dashboard is usable, with a few follow-ups to clear first.';
  if (headline === 'The dashboard is stable and ready for memo defense.') return 'This dashboard is ready for memo review.';
  return headline;
};

const softenExecutiveSummary = (summary) => {
  if (summary === 'Resolve failed summary feeds or outbox risks before using this view as executive evidence.') return 'Refresh stale sections and review ownership notes before presenting this view.';
  if (summary === 'Focus on the highest-impact exception first, then use drilldown to validate the affected scope.') return 'Start with the highest-impact exception, then use drilldown to confirm the scope.';
  if (summary === 'Current aggregates, alerts, and queue signals do not show immediate blockers.') return 'Current summaries, alerts, and queue checks do not show an immediate blocker.';
  return summary;
};

const trimExecutiveItemsForDisplay = (items, { hasFollowUpQueue = false } = {}) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter(Boolean)
    .filter((item) => !(hasFollowUpQueue && item.key === 'review-alerts'))
    .slice(0, 2);
};

/* ────────────────────────────── hook ─────────────────────────────────── */

export default function useDashboardData({ canAccessIntegrationQueue }) {
  const scheduleStateUpdate = useCallback((updater) => {
    startTransition(() => {
      updater();
    });
  }, []);

  /* ── state ── */
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

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
  const [summaryRefreshError, setSummaryRefreshError] = useState('');
  const [operationalReadiness, setOperationalReadiness] = useState(null);
  const [operationalReadinessError, setOperationalReadinessError] = useState('');
  const [loadingOperationalReadiness, setLoadingOperationalReadiness] = useState(true);

  const [integrationMetrics, setIntegrationMetrics] = useState(null);
  const [loadingIntegrationMetrics, setLoadingIntegrationMetrics] = useState(false);
  const [integrationMetricsError, setIntegrationMetricsError] = useState('');
  const [integrationError, setIntegrationError] = useState('');

  const [rebuildingSummaries, setRebuildingSummaries] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ── fetch functions ── */

  const fetchEarnings = useCallback(async (yearOverride = currentYear, requestOptions = {}) => {
    setLoadingEarnings(true);
    setEarningsError('');
    try {
      const res = await getEarningsSummary(yearOverride, requestOptions);
      if (requestOptions.signal?.aborted) return;
      scheduleStateUpdate(() => {
        setEarnings(res.data || null);
        setEarningsMeta(res.meta || null);
      });
    } catch (error) {
      if (isRequestAborted(error, requestOptions.signal)) return;
      scheduleStateUpdate(() => {
        setEarnings(null);
        setEarningsMeta(null);
        setEarningsError(getErrorMessage(error, 'Unable to load earnings summary'));
      });
    } finally {
      if (!requestOptions.signal?.aborted) {
        setLoadingEarnings(false);
      }
    }
  }, [currentYear, scheduleStateUpdate]);

  const fetchVacation = useCallback(async (yearOverride = currentYear, requestOptions = {}) => {
    setLoadingVacation(true);
    setVacationError('');
    try {
      const res = await getVacationSummary(yearOverride, requestOptions);
      if (requestOptions.signal?.aborted) return;
      scheduleStateUpdate(() => {
        setVacation(res.data || null);
        setVacationMeta(res.meta || null);
      });
    } catch (error) {
      if (isRequestAborted(error, requestOptions.signal)) return;
      scheduleStateUpdate(() => {
        setVacation(null);
        setVacationMeta(null);
        setVacationError(getErrorMessage(error, 'Unable to load vacation summary'));
      });
    } finally {
      if (!requestOptions.signal?.aborted) {
        setLoadingVacation(false);
      }
    }
  }, [currentYear, scheduleStateUpdate]);

  const fetchBenefits = useCallback(async (requestOptions = {}) => {
    setLoadingBenefits(true);
    setBenefitsError('');
    try {
      const res = await getBenefitsSummary(requestOptions);
      if (requestOptions.signal?.aborted) return;
      scheduleStateUpdate(() => {
        setBenefits(res.data || null);
        setBenefitsMeta(res.meta || null);
      });
    } catch (error) {
      if (isRequestAborted(error, requestOptions.signal)) return;
      scheduleStateUpdate(() => {
        setBenefits(null);
        setBenefitsMeta(null);
        setBenefitsError(getErrorMessage(error, 'Unable to load benefits summary'));
      });
    } finally {
      if (!requestOptions.signal?.aborted) {
        setLoadingBenefits(false);
      }
    }
  }, [scheduleStateUpdate]);

  const fetchAlerts = useCallback(async (requestOptions = {}) => {
    setLoadingAlerts(true);
    setAlertsError('');
    try {
      const res = await getTriggeredAlerts(requestOptions);
      if (requestOptions.signal?.aborted) return;
      scheduleStateUpdate(() => {
        setAlerts(Array.isArray(res.data) ? res.data : []);
      });
    } catch (error) {
      if (isRequestAborted(error, requestOptions.signal)) return;
      scheduleStateUpdate(() => {
        setAlerts([]);
        setAlertsError(getErrorMessage(error, 'Unable to load triggered alerts'));
      });
    } finally {
      if (!requestOptions.signal?.aborted) {
        setLoadingAlerts(false);
      }
    }
  }, [scheduleStateUpdate]);

  const fetchExecutiveSnapshot = useCallback(async (yearOverride = currentYear, requestOptions = {}) => {
    setExecutiveSnapshotError('');
    try {
      const res = await getExecutiveBrief(yearOverride, requestOptions);
      if (requestOptions.signal?.aborted) return;
      scheduleStateUpdate(() => {
        setExecutiveSnapshot(res.data || null);
      });
    } catch (error) {
      if (isRequestAborted(error, requestOptions.signal)) return;
      scheduleStateUpdate(() => {
        setExecutiveSnapshot(null);
        setExecutiveSnapshotError(getErrorMessage(error, 'Unable to load executive briefing snapshot'));
      });
    }
  }, [currentYear, scheduleStateUpdate]);

  const fetchIntegrationSnapshot = useCallback(async (requestOptions = {}) => {
    if (!canAccessIntegrationQueue) {
      setIntegrationMetrics(null);
      setIntegrationMetricsError('');
      setLoadingIntegrationMetrics(false);
      return;
    }
    setLoadingIntegrationMetrics(true);
    setIntegrationMetricsError('');
    try {
      const res = await getIntegrationMetrics(requestOptions);
      if (requestOptions.signal?.aborted) return;
      scheduleStateUpdate(() => {
        setIntegrationMetrics(res.data || null);
      });
    } catch (error) {
      if (isRequestAborted(error, requestOptions.signal)) return;
      scheduleStateUpdate(() => {
        setIntegrationMetrics(null);
        setIntegrationMetricsError(getErrorMessage(error, 'Unable to load integration queue summary'));
      });
    } finally {
      if (!requestOptions.signal?.aborted) {
        setLoadingIntegrationMetrics(false);
      }
    }
  }, [canAccessIntegrationQueue, scheduleStateUpdate]);

  const fetchOperationalReadiness = useCallback(async (yearOverride = currentYear, requestOptions = {}) => {
    const { forceRefresh = false, ...apiRequestOptions } = requestOptions || {};
    setLoadingOperationalReadiness(true);
    setOperationalReadinessError('');
    try {
      const res = await getOperationalReadiness(yearOverride, {
        ...apiRequestOptions,
        forceRefresh,
      });
      if (apiRequestOptions.signal?.aborted) return;
      scheduleStateUpdate(() => {
        setOperationalReadiness(res.data || null);
      });
    } catch (error) {
      if (isRequestAborted(error, apiRequestOptions.signal)) return;
      scheduleStateUpdate(() => {
        setOperationalReadiness(null);
        setOperationalReadinessError(getErrorMessage(error, 'Unable to load operational readiness'));
      });
    } finally {
      if (!apiRequestOptions.signal?.aborted) {
        setLoadingOperationalReadiness(false);
      }
    }
  }, [currentYear, scheduleStateUpdate]);

  const loadAllData = useCallback(async (requestOptions = {}) => {
    const {
      rebuildSummaries = false,
      forceOperationalReadiness = false,
      ...requestConfig
    } = requestOptions || {};
    setRefreshing(true);
    if (rebuildSummaries) {
      setSummaryRefreshError('');
      setRebuildingSummaries(true);
      try {
        await refreshDashboardSummaries(currentYear, requestConfig);
      } catch (error) {
        if (!isRequestAborted(error, requestConfig.signal)) {
          setSummaryRefreshError(getErrorMessage(error, 'Unable to rebuild dashboard summaries'));
        }
      } finally {
        if (!requestConfig.signal?.aborted) {
          setRebuildingSummaries(false);
        }
      }
    }
    const tasks = [
      fetchEarnings(currentYear, requestConfig),
      fetchVacation(currentYear, requestConfig),
      fetchBenefits(requestConfig),
      fetchAlerts(requestConfig),
      fetchExecutiveSnapshot(currentYear, requestConfig),
      fetchOperationalReadiness(currentYear, {
        ...requestConfig,
        forceRefresh: forceOperationalReadiness,
      }),
    ];
    if (canAccessIntegrationQueue) {
      tasks.push(fetchIntegrationSnapshot(requestConfig));
    } else {
      setIntegrationMetrics(null);
      setIntegrationMetricsError('');
    }
    await Promise.allSettled(tasks);
    if (requestConfig.signal?.aborted) return;
    scheduleStateUpdate(() => {
      setRefreshing(false);
    });
  }, [
    canAccessIntegrationQueue,
    currentYear,
    fetchAlerts,
    fetchBenefits,
    fetchEarnings,
    fetchExecutiveSnapshot,
    fetchIntegrationSnapshot,
    fetchOperationalReadiness,
    fetchVacation,
    scheduleStateUpdate,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAllData({ signal: controller.signal });
    return () => controller.abort();
  }, [loadAllData]);

  /* ── computed: stats ── */

  const stats = useMemo(() => {
    const earningsRows = earnings?.byDepartment ? Object.values(earnings.byDepartment) : [];
    const totalEarnings = earningsRows.reduce((acc, curr) => acc + Number(curr?.current || 0), 0);
    const previousEarnings = earningsRows.reduce((acc, curr) => acc + Number(curr?.previous || 0), 0);
    const earningsTrend = previousEarnings ? ((totalEarnings - previousEarnings) / previousEarnings) * 100 : 0;

    const totalVacation = Number(vacation?.totals?.current || 0);
    const previousVacation = Number(vacation?.totals?.previous || 0);
    const vacationTrend = previousVacation ? ((totalVacation - previousVacation) / previousVacation) * 100 : 0;

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

  /* ── computed: freshness ── */

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
      return { label: 'Unknown', css: 'unknown', tooltip: 'No freshness metadata from core summary endpoints.' };
    }
    if (states.some((item) => item.status === 'stale')) {
      const staleValues = states.map((item) => item.staleMinutes).filter((value) => Number.isFinite(value));
      const maxStale = staleValues.length > 0 ? Math.max(...staleValues) : null;
      return {
        label: 'Stale',
        css: 'stale',
        tooltip: maxStale !== null ? `One or more datasets are stale (${maxStale}m old).` : 'One or more datasets are stale.',
      };
    }
    return { label: 'Fresh', css: 'fresh', tooltip: 'All core datasets updated recently.' };
  }, [earningsFreshness, vacationFreshness, benefitsFreshness]);

  const snapshotFreshness = !executiveSnapshotError ? executiveSnapshot?.freshness : null;
  const lastUpdatedAt = snapshotFreshness?.global?.lastUpdatedAt || fallbackLastUpdatedAt;
  const globalFreshness = snapshotFreshness?.global || fallbackGlobalFreshness;
  const freshnessReadiness = snapshotFreshness?.readiness || buildFallbackFreshnessReadiness(globalFreshness);
  const hasSummaryError = Boolean(earningsError || vacationError || benefitsError);
  const summaryErrorCount = [earningsError, vacationError, benefitsError].filter(Boolean).length;

  /* ── computed: alert follow-up ── */

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

  /* ── computed: executive brief ── */

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

    if (freshnessReadiness.actionMode === 'rebuild') {
      items.push({
        key: 'refresh-summary',
        tone: 'warning',
        title: freshnessReadiness.summary,
        detail: freshnessReadiness.detail,
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
        items.push({
          key: 'review-alerts',
          tone: 'info',
          title: 'Manage-by-exception queue is active',
          detail: `${formatNum(stats.alerts.affected)} employees are currently covered by ${stats.alerts.categories} active alert categories.`,
        });
      }
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
        detail: stats.alerts.categories > 0
          ? `No core blockers detected. All ${formatNum(stats.alerts.categories)} active alert categories have a current acknowledgement note.`
          : 'No core blockers detected. Use drilldown to answer follow-up questions without leaving the briefing flow.',
      });
    }

    const hasCritical = items.some((item) => item.tone === 'critical');
    const hasWarning = items.some((item) => item.tone === 'warning');
    const hasInfo = items.some((item) => item.tone === 'info');
    const tone = hasCritical ? 'critical' : hasWarning || hasInfo ? 'warning' : 'healthy';
    const headline = hasCritical
      ? 'This snapshot needs a quick review before presentation.'
      : hasWarning || hasInfo
        ? 'This dashboard is usable, with a few follow-ups to clear first.'
        : 'This dashboard is ready for memo review.';
    const summary = hasCritical
      ? 'Refresh stale sections and review ownership notes before presenting this view.'
      : hasWarning || hasInfo
        ? 'Start with the highest-impact exception, then use drilldown to confirm the scope.'
        : 'Current summaries, alerts, and queue checks do not show an immediate blocker.';

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
    freshnessReadiness,
    stats.alerts.affected,
    stats.alerts.categories,
    summaryErrorCount,
  ]);

  const executiveBrief = useMemo(() => {
    const hasFollowUpQueue = alertFollowUp.needsAttentionCategories > 0;
    if (executiveSnapshot?.actionCenter && !executiveSnapshotError) {
      const backendBrief = executiveSnapshot.actionCenter;
      return {
        tone: backendBrief.status === 'critical' ? 'critical' : backendBrief.status === 'healthy' ? 'healthy' : 'warning',
        label: backendBrief.label || 'Monitor Closely',
        headline: softenExecutiveHeadline(backendBrief.headline),
        summary: softenExecutiveSummary(backendBrief.summary),
        items: trimExecutiveItemsForDisplay(backendBrief.items, { hasFollowUpQueue }),
      };
    }
    return {
      ...computedExecutiveBrief,
      headline: softenExecutiveHeadline(computedExecutiveBrief.headline),
      summary: softenExecutiveSummary(computedExecutiveBrief.summary),
      items: trimExecutiveItemsForDisplay(computedExecutiveBrief.items, { hasFollowUpQueue }),
    };
  }, [alertFollowUp.needsAttentionCategories, computedExecutiveBrief, executiveSnapshot, executiveSnapshotError]);

  /* ── public API ── */

  return useMemo(() => ({
    // raw data
    earnings,
    vacation,
    benefits,
    alerts,
    // loading
    loadingEarnings,
    loadingVacation,
    loadingBenefits,
    loadingAlerts,
    loadingIntegrationMetrics,
    loadingOperationalReadiness,
    // errors
    earningsError,
    vacationError,
    benefitsError,
    alertsError,
    integrationMetricsError,
    executiveSnapshotError,
    operationalReadinessError,
    integrationError,
    // freshness
    earningsFreshness,
    vacationFreshness,
    benefitsFreshness,
    globalFreshness,
    lastUpdatedAt,
    // computed
    stats,
    alertFollowUp,
    executiveBrief,
    freshnessReadiness,
    hasSummaryError,
    summaryErrorCount,
    summaryRefreshError,
    effectiveAlertStats,
    effectiveIntegrationMetrics,
    effectiveIntegrationError,
    queueActionable,
    queueBacklog,
    queueOldestPendingAge,
    hasExecutiveIntegrationSnapshot,
    operationalReadiness,
    // actions
    loadAllData,
    fetchEarnings,
    fetchVacation,
    fetchBenefits,
    fetchAlerts,
    fetchExecutiveSnapshot,
    fetchOperationalReadiness,
    // refresh state
    rebuildingSummaries,
    refreshing,
    // setters needed by child components
    setAlerts,
    setIntegrationError,
    // constants
    currentYear,
    setCurrentYear,
    // role-gated flags (convenience)
    effectiveRole: undefined, // set by caller
  }), [
    earnings,
    vacation,
    benefits,
    alerts,
    loadingEarnings,
    loadingVacation,
    loadingBenefits,
    loadingAlerts,
    loadingIntegrationMetrics,
    loadingOperationalReadiness,
    earningsError,
    vacationError,
    benefitsError,
    alertsError,
    integrationMetricsError,
    executiveSnapshotError,
    operationalReadinessError,
    integrationError,
    earningsFreshness,
    vacationFreshness,
    benefitsFreshness,
    globalFreshness,
    lastUpdatedAt,
    stats,
    alertFollowUp,
    executiveBrief,
    freshnessReadiness,
    hasSummaryError,
    summaryErrorCount,
    summaryRefreshError,
    effectiveAlertStats,
    effectiveIntegrationMetrics,
    effectiveIntegrationError,
    queueActionable,
    queueBacklog,
    queueOldestPendingAge,
    hasExecutiveIntegrationSnapshot,
    operationalReadiness,
    loadAllData,
    fetchEarnings,
    fetchVacation,
    fetchBenefits,
    fetchAlerts,
    fetchExecutiveSnapshot,
    fetchOperationalReadiness,
    rebuildingSummaries,
    refreshing,
    setAlerts,
    setIntegrationError,
    currentYear,
    setCurrentYear,
  ]);
}
