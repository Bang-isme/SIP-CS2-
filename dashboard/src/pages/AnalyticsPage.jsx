import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnalyticsFilterBar from '../components/AnalyticsFilterBar';
import ChartsSection from '../components/ChartsSection';
import { useDashboardAnalyticsSlice } from '../contexts/DashboardDataContext';
import { useDashboardPageChrome } from '../contexts/PageChromeContext';
import {
  getBenefitsSummary,
  getDepartments,
  getEarningsSummary,
  getVacationSummary,
} from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/formatters';
import { getFreshnessInfo } from '../hooks/useDashboardData';
import {
  buildDrilldownSearch,
  normalizeDrilldownContext,
  toSearchString,
  VALID_DRILLDOWN_CONTEXTS,
} from '../utils/drilldownRoute';

const createScopedAnalyticsState = () => ({
  earnings: null,
  vacation: null,
  benefits: null,
  earningsMeta: null,
  vacationMeta: null,
  benefitsMeta: null,
  loadingEarnings: false,
  loadingVacation: false,
  loadingBenefits: false,
  earningsError: '',
  vacationError: '',
  benefitsError: '',
});

export default function AnalyticsPage() {
  const {
    earnings,
    vacation,
    benefits,
    loadingEarnings,
    loadingVacation,
    loadingBenefits,
    earningsError,
    vacationError,
    benefitsError,
    earningsFreshness,
    vacationFreshness,
    benefitsFreshness,
    fetchEarnings,
    fetchVacation,
    fetchBenefits,
    currentYear,
    setCurrentYear,
  } = useDashboardAnalyticsSlice();
  const { notifyError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [departmentScope, setDepartmentScope] = useState('');
  const [departments, setDepartments] = useState([]);
  const [scopedAnalytics, setScopedAnalytics] = useState(createScopedAnalyticsState);
  const { setPageRefreshConfig } = useDashboardPageChrome();

  const queryDrilldown = useMemo(() => {
    const value = searchParams.get('drilldown');
    return VALID_DRILLDOWN_CONTEXTS.has(value) ? value : '';
  }, [searchParams]);

  const buildSummaryScope = useCallback(
    (scopeValue = departmentScope) => (scopeValue ? { department: scopeValue } : {}),
    [departmentScope],
  );

  const fetchScopedAnalytics = useCallback(async ({ year = currentYear, department, signal } = {}) => {
    const scopeConfig = { department, signal };
    const [earningsResult, vacationResult, benefitsResult] = await Promise.allSettled([
      getEarningsSummary(year, scopeConfig),
      getVacationSummary(year, scopeConfig),
      getBenefitsSummary({ year, department, signal }),
    ]);

    if (signal?.aborted) {
      return null;
    }

    return {
      earnings: earningsResult.status === 'fulfilled' ? (earningsResult.value?.data || null) : null,
      vacation: vacationResult.status === 'fulfilled' ? (vacationResult.value?.data || null) : null,
      benefits: benefitsResult.status === 'fulfilled' ? (benefitsResult.value?.data || null) : null,
      earningsMeta: earningsResult.status === 'fulfilled' ? (earningsResult.value?.meta || null) : null,
      vacationMeta: vacationResult.status === 'fulfilled' ? (vacationResult.value?.meta || null) : null,
      benefitsMeta: benefitsResult.status === 'fulfilled' ? (benefitsResult.value?.meta || null) : null,
      loadingEarnings: false,
      loadingVacation: false,
      loadingBenefits: false,
      earningsError: earningsResult.status === 'fulfilled' ? '' : getErrorMessage(earningsResult.reason, 'Unable to load scoped earnings summary'),
      vacationError: vacationResult.status === 'fulfilled' ? '' : getErrorMessage(vacationResult.reason, 'Unable to load scoped time-off summary'),
      benefitsError: benefitsResult.status === 'fulfilled' ? '' : getErrorMessage(benefitsResult.reason, 'Unable to load scoped benefits summary'),
    };
  }, [currentYear]);

  const startScopedRefresh = useCallback(() => {
    setScopedAnalytics((current) => ({
      ...current,
      loadingEarnings: true,
      loadingVacation: true,
      loadingBenefits: true,
      earningsError: '',
      vacationError: '',
      benefitsError: '',
    }));
  }, []);

  useEffect(() => {
    let active = true;

    const loadDepartments = async () => {
      try {
        const list = await getDepartments();
        if (!active) return;
        setDepartments(Array.isArray(list) ? list : []);
      } catch (error) {
        if (!active) return;
        setDepartments([]);
        notifyError(getErrorMessage(error, 'Unable to load department scope options.'));
      }
    };

    void loadDepartments();

    return () => {
      active = false;
    };
  }, [notifyError]);

  useEffect(() => {
    if (!departmentScope) return undefined;

    const controller = new AbortController();
    const run = async () => {
      const nextState = await fetchScopedAnalytics({
        year: currentYear,
        department: departmentScope,
        signal: controller.signal,
      });
      if (nextState && !controller.signal.aborted) {
        setScopedAnalytics(nextState);
      }
    };

    void run();

    return () => controller.abort();
  }, [currentYear, departmentScope, fetchScopedAnalytics]);

  const refreshAnalytics = useCallback(async ({ year = currentYear, department = departmentScope } = {}) => {
    if (department) {
      startScopedRefresh();
      const nextState = await fetchScopedAnalytics({ year, department });
      if (nextState) {
        setScopedAnalytics(nextState);
      }
      return;
    }

    const scopeConfig = buildSummaryScope(department);
    await Promise.allSettled([
      fetchEarnings(year, scopeConfig),
      fetchVacation(year, scopeConfig),
      fetchBenefits({ year, ...scopeConfig }),
    ]);
  }, [buildSummaryScope, currentYear, departmentScope, fetchBenefits, fetchEarnings, fetchVacation, fetchScopedAnalytics, startScopedRefresh]);

  useEffect(() => {
    setPageRefreshConfig({
      label: 'Refresh analytics',
      refreshing: loadingEarnings || loadingVacation || loadingBenefits,
      onRefresh: refreshAnalytics,
    });

    return () => {
      setPageRefreshConfig(null);
    };
  }, [
    loadingBenefits,
    loadingEarnings,
    loadingVacation,
    refreshAnalytics,
    setPageRefreshConfig,
  ]);

  useEffect(() => {
    if (!queryDrilldown) return;
    const nextSearch = buildDrilldownSearch(searchParams, { context: queryDrilldown });
    navigate(
      {
        pathname: '/dashboard/analytics/drilldown',
        search: toSearchString(nextSearch),
      },
      { replace: true },
    );
  }, [navigate, queryDrilldown, searchParams]);

  const openDrilldown = (filters) => {
    const context = normalizeDrilldownContext(filters?.context);
    if (!context) return;
    const nextSearch = buildDrilldownSearch(searchParams, {
      ...filters,
      context,
      department: filters?.department || departmentScope || undefined,
    });
    navigate({
      pathname: '/dashboard/analytics/drilldown',
      search: toSearchString(nextSearch),
    });
  };

  const scopedMode = Boolean(departmentScope);
  const displayedEarnings = scopedMode ? scopedAnalytics.earnings : earnings;
  const displayedVacation = scopedMode ? scopedAnalytics.vacation : vacation;
  const displayedBenefits = scopedMode ? scopedAnalytics.benefits : benefits;
  const displayedLoadingEarnings = scopedMode ? scopedAnalytics.loadingEarnings : loadingEarnings;
  const displayedLoadingVacation = scopedMode ? scopedAnalytics.loadingVacation : loadingVacation;
  const displayedLoadingBenefits = scopedMode ? scopedAnalytics.loadingBenefits : loadingBenefits;
  const displayedEarningsError = scopedMode ? scopedAnalytics.earningsError : earningsError;
  const displayedVacationError = scopedMode ? scopedAnalytics.vacationError : vacationError;
  const displayedBenefitsError = scopedMode ? scopedAnalytics.benefitsError : benefitsError;
  const displayedEarningsFreshness = scopedMode
    ? getFreshnessInfo(scopedAnalytics.earningsMeta?.updatedAt)
    : earningsFreshness;
  const displayedVacationFreshness = scopedMode
    ? getFreshnessInfo(scopedAnalytics.vacationMeta?.updatedAt)
    : vacationFreshness;
  const displayedBenefitsFreshness = scopedMode
    ? getFreshnessInfo(scopedAnalytics.benefitsMeta?.updatedAt)
    : benefitsFreshness;

  return (
    <div className="dashboard-page-stack">
      <AnalyticsFilterBar
        currentYear={currentYear}
        onYearChange={(nextYear) => {
          if (!Number.isFinite(nextYear) || nextYear === currentYear) return;
          if (departmentScope) {
            startScopedRefresh();
          }
          setCurrentYear(nextYear);
        }}
        departments={departments}
        departmentScope={departmentScope}
        onDepartmentScopeChange={(nextScope) => {
          if (!nextScope) {
            setScopedAnalytics(createScopedAnalyticsState());
          } else {
            startScopedRefresh();
          }
          setDepartmentScope(nextScope);
        }}
        onClearScope={() => {
          setScopedAnalytics(createScopedAnalyticsState());
          setDepartmentScope('');
        }}
      />

      <ChartsSection
        earnings={displayedEarnings}
        vacation={displayedVacation}
        benefits={displayedBenefits}
        departmentScope={departmentScope}
        loadingEarnings={displayedLoadingEarnings}
        loadingVacation={displayedLoadingVacation}
        loadingBenefits={displayedLoadingBenefits}
        earningsError={displayedEarningsError}
        vacationError={displayedVacationError}
        benefitsError={displayedBenefitsError}
        earningsFreshness={displayedEarningsFreshness}
        vacationFreshness={displayedVacationFreshness}
        benefitsFreshness={displayedBenefitsFreshness}
        onRetryEarnings={() => scopedMode
          ? refreshAnalytics({ year: currentYear, department: departmentScope })
          : fetchEarnings(currentYear, buildSummaryScope())}
        onRetryVacation={() => scopedMode
          ? refreshAnalytics({ year: currentYear, department: departmentScope })
          : fetchVacation(currentYear, buildSummaryScope())}
        onRetryBenefits={() => scopedMode
          ? refreshAnalytics({ year: currentYear, department: departmentScope })
          : fetchBenefits({ year: currentYear, ...buildSummaryScope() })}
        onDrilldown={openDrilldown}
        onContextDrilldown={(context) => openDrilldown({ context })}
      />
    </div>
  );
}
