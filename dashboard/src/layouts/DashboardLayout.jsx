import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageChromeContext from '../contexts/PageChromeContext';
import DashboardDataContext, {
  DashboardAlertsContext,
  DashboardAnalyticsContext,
  DashboardIntegrationContext,
  DashboardOverviewContext,
} from '../contexts/DashboardDataContext';
import useDashboardData from '../hooks/useDashboardData';
import DashboardHeader from '../components/DashboardHeader';
import Sidebar from '../components/Sidebar';
import './DashboardLayout.css';
import '../pages/Dashboard.css';

const getPageTitle = (pathname) => {
  if (pathname.startsWith('/dashboard/analytics/drilldown')) return 'Analytics Drilldown';
  if (pathname.startsWith('/dashboard/analytics')) return 'Analytics';
  if (pathname.startsWith('/dashboard/alerts')) return 'Alert Review';
  if (pathname.startsWith('/dashboard/integration')) return 'Integration Queue';
  if (pathname.startsWith('/dashboard/admin/employees')) return 'Employee Administration';
  if (pathname.startsWith('/dashboard/admin/users')) return 'User Administration';
  return 'Executive Overview';
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    handleLogout: authLogout,
    permissions,
    sessionStatus,
  } = useAuth();
  const dashboardData = useDashboardData({ canAccessIntegrationQueue: permissions.canAccessIntegrationQueue });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pageRefreshConfig, setPageRefreshConfig] = useState(null);
  const mainContentRef = useRef(null);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const canRebuildSummaries = permissions.canAccessIntegrationQueue
    && dashboardData.freshnessReadiness?.actionMode === 'rebuild';
  const defaultRefreshAction = canRebuildSummaries
    ? () => dashboardData.loadAllData({ rebuildSummaries: true })
    : dashboardData.loadAllData;
  const activeRefreshAction = pageRefreshConfig?.onRefresh || defaultRefreshAction;
  const activeRefreshLabel = pageRefreshConfig?.label || (
    canRebuildSummaries
      ? (dashboardData.rebuildingSummaries ? 'Rebuilding...' : 'Rebuild summaries')
      : 'Refresh'
  );
  const activeRefreshing = typeof pageRefreshConfig?.refreshing === 'boolean'
    ? pageRefreshConfig.refreshing
    : (dashboardData.refreshing || dashboardData.rebuildingSummaries);
  const pageChromeValue = useMemo(() => ({
    setPageRefreshConfig,
  }), []);
  const overviewSlice = useMemo(() => ({
    stats: dashboardData.stats,
    alertFollowUp: dashboardData.alertFollowUp,
    executiveBrief: dashboardData.executiveBrief,
    globalFreshness: dashboardData.globalFreshness,
    freshnessReadiness: dashboardData.freshnessReadiness,
    operationalReadiness: dashboardData.operationalReadiness,
    operationalReadinessError: dashboardData.operationalReadinessError,
    loadingOperationalReadiness: dashboardData.loadingOperationalReadiness,
    fetchOperationalReadiness: dashboardData.fetchOperationalReadiness,
    summaryErrorCount: dashboardData.summaryErrorCount,
    summaryRefreshError: dashboardData.summaryRefreshError,
    effectiveAlertStats: dashboardData.effectiveAlertStats,
    loadingIntegrationMetrics: dashboardData.loadingIntegrationMetrics,
    hasExecutiveIntegrationSnapshot: dashboardData.hasExecutiveIntegrationSnapshot,
    effectiveIntegrationError: dashboardData.effectiveIntegrationError,
    queueActionable: dashboardData.queueActionable,
    queueBacklog: dashboardData.queueBacklog,
    earningsFreshness: dashboardData.earningsFreshness,
    vacationFreshness: dashboardData.vacationFreshness,
    benefitsFreshness: dashboardData.benefitsFreshness,
    loadingEarnings: dashboardData.loadingEarnings,
    loadingVacation: dashboardData.loadingVacation,
    loadingBenefits: dashboardData.loadingBenefits,
    loadingAlerts: dashboardData.loadingAlerts,
    earningsError: dashboardData.earningsError,
    vacationError: dashboardData.vacationError,
    benefitsError: dashboardData.benefitsError,
    alertsError: dashboardData.alertsError,
    loadAllData: dashboardData.loadAllData,
    rebuildingSummaries: dashboardData.rebuildingSummaries,
    refreshing: dashboardData.refreshing,
  }), [
    dashboardData.alertFollowUp,
    dashboardData.alertsError,
    dashboardData.benefitsError,
    dashboardData.benefitsFreshness,
    dashboardData.effectiveAlertStats,
    dashboardData.effectiveIntegrationError,
    dashboardData.earningsError,
    dashboardData.earningsFreshness,
    dashboardData.executiveBrief,
    dashboardData.fetchOperationalReadiness,
    dashboardData.freshnessReadiness,
    dashboardData.globalFreshness,
    dashboardData.hasExecutiveIntegrationSnapshot,
    dashboardData.loadAllData,
    dashboardData.loadingAlerts,
    dashboardData.loadingBenefits,
    dashboardData.loadingEarnings,
    dashboardData.loadingIntegrationMetrics,
    dashboardData.loadingOperationalReadiness,
    dashboardData.loadingVacation,
    dashboardData.operationalReadiness,
    dashboardData.operationalReadinessError,
    dashboardData.queueActionable,
    dashboardData.queueBacklog,
    dashboardData.refreshing,
    dashboardData.rebuildingSummaries,
    dashboardData.stats,
    dashboardData.summaryErrorCount,
    dashboardData.summaryRefreshError,
    dashboardData.vacationError,
    dashboardData.vacationFreshness,
  ]);
  const analyticsSlice = useMemo(() => ({
    earnings: dashboardData.earnings,
    vacation: dashboardData.vacation,
    benefits: dashboardData.benefits,
    loadingEarnings: dashboardData.loadingEarnings,
    loadingVacation: dashboardData.loadingVacation,
    loadingBenefits: dashboardData.loadingBenefits,
    earningsError: dashboardData.earningsError,
    vacationError: dashboardData.vacationError,
    benefitsError: dashboardData.benefitsError,
    earningsFreshness: dashboardData.earningsFreshness,
    vacationFreshness: dashboardData.vacationFreshness,
    benefitsFreshness: dashboardData.benefitsFreshness,
    fetchEarnings: dashboardData.fetchEarnings,
    fetchVacation: dashboardData.fetchVacation,
    fetchBenefits: dashboardData.fetchBenefits,
    currentYear: dashboardData.currentYear,
    setCurrentYear: dashboardData.setCurrentYear,
  }), [
    dashboardData.benefits,
    dashboardData.benefitsError,
    dashboardData.benefitsFreshness,
    dashboardData.currentYear,
    dashboardData.earnings,
    dashboardData.earningsError,
    dashboardData.earningsFreshness,
    dashboardData.fetchBenefits,
    dashboardData.fetchEarnings,
    dashboardData.fetchVacation,
    dashboardData.loadingBenefits,
    dashboardData.loadingEarnings,
    dashboardData.loadingVacation,
    dashboardData.setCurrentYear,
    dashboardData.vacation,
    dashboardData.vacationError,
    dashboardData.vacationFreshness,
  ]);
  const alertsSlice = useMemo(() => ({
    alertFollowUp: dashboardData.alertFollowUp,
    alerts: dashboardData.alerts,
    alertsError: dashboardData.alertsError,
    loadingAlerts: dashboardData.loadingAlerts,
    fetchExecutiveSnapshot: dashboardData.fetchExecutiveSnapshot,
    fetchAlerts: dashboardData.fetchAlerts,
    stats: dashboardData.stats,
    setAlerts: dashboardData.setAlerts,
    currentYear: dashboardData.currentYear,
  }), [
    dashboardData.alertFollowUp,
    dashboardData.alerts,
    dashboardData.alertsError,
    dashboardData.currentYear,
    dashboardData.fetchAlerts,
    dashboardData.fetchExecutiveSnapshot,
    dashboardData.loadingAlerts,
    dashboardData.setAlerts,
    dashboardData.stats,
  ]);
  const integrationSlice = useMemo(() => ({
    currentYear: dashboardData.currentYear,
    refreshing: dashboardData.refreshing,
    loadAllData: dashboardData.loadAllData,
    queueActionable: dashboardData.queueActionable,
    queueBacklog: dashboardData.queueBacklog,
    queueOldestPendingAge: dashboardData.queueOldestPendingAge,
    hasExecutiveIntegrationSnapshot: dashboardData.hasExecutiveIntegrationSnapshot,
    effectiveIntegrationError: dashboardData.effectiveIntegrationError,
    loadingIntegrationMetrics: dashboardData.loadingIntegrationMetrics,
  }), [
    dashboardData.currentYear,
    dashboardData.effectiveIntegrationError,
    dashboardData.hasExecutiveIntegrationSnapshot,
    dashboardData.loadAllData,
    dashboardData.loadingIntegrationMetrics,
    dashboardData.queueActionable,
    dashboardData.queueBacklog,
    dashboardData.queueOldestPendingAge,
    dashboardData.refreshing,
  ]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    document.body.classList.add('dashboard-shell-active');
    document.documentElement.classList.add('dashboard-shell-active');

    return () => {
      document.body.classList.remove('dashboard-shell-active');
      document.documentElement.classList.remove('dashboard-shell-active');
    };
  }, []);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await authLogout?.();
    navigate('/login', { replace: true });
  };

  return (
    <DashboardDataContext.Provider value={dashboardData}>
      <DashboardOverviewContext.Provider value={overviewSlice}>
        <DashboardAnalyticsContext.Provider value={analyticsSlice}>
          <DashboardAlertsContext.Provider value={alertsSlice}>
            <DashboardIntegrationContext.Provider value={integrationSlice}>
              <PageChromeContext.Provider value={pageChromeValue}>
                <div
                  className={`dashboard-layout${sidebarOpen ? ' dashboard-layout--sidebar-open' : ''}${sidebarCollapsed ? ' dashboard-layout--sidebar-collapsed' : ''}`}
                >
                  <Sidebar
                    mobileOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    currentUser={currentUser}
                    permissions={permissions}
                    onLogout={handleLogout}
                    collapsed={sidebarCollapsed}
                    onCollapsedChange={setSidebarCollapsed}
                  />

                  <div className="dashboard-main-shell">
                    <DashboardHeader
                      pageTitle={pageTitle}
                      currentYear={dashboardData.currentYear}
                      globalFreshness={dashboardData.globalFreshness}
                      freshnessReadiness={dashboardData.freshnessReadiness}
                      lastUpdatedAt={dashboardData.lastUpdatedAt}
                      refreshing={activeRefreshing}
                      refreshLabel={activeRefreshLabel}
                      sessionStatus={sessionStatus}
                      onMenuToggle={() => setSidebarOpen((prev) => !prev)}
                      onRefresh={() => void activeRefreshAction()}
                    />

                    <main className="dashboard-main-content" ref={mainContentRef}>
                      <div className="dashboard-page-stack">
                        <section
                          key={location.pathname}
                          className="dashboard-route-frame"
                          data-route-key={location.pathname}
                          data-route-title={pageTitle}
                          aria-label={`${pageTitle} content`}
                        >
                          <Outlet />
                        </section>
                      </div>
                    </main>
                  </div>
                </div>
              </PageChromeContext.Provider>
            </DashboardIntegrationContext.Provider>
          </DashboardAlertsContext.Provider>
        </DashboardAnalyticsContext.Provider>
      </DashboardOverviewContext.Provider>
    </DashboardDataContext.Provider>
  );
}
