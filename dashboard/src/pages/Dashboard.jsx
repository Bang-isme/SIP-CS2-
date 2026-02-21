import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  getBenefitsSummary,
  getEarningsSummary,
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
  FiUsers,
} from 'react-icons/fi';
import './Dashboard.css';

const DrilldownModal = lazy(() => import('../components/DrilldownModal'));
const IntegrationEventsPanel = lazy(() => import('../components/IntegrationEventsPanel'));
const AdminUsersModal = lazy(() => import('../components/AdminUsersModal'));
const FRESH_THRESHOLD_MINUTES = 120;

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

  const [integrationError, setIntegrationError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [drilldown, setDrilldown] = useState(null);
  const [showAdminUsersModal, setShowAdminUsersModal] = useState(false);
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
  const canManageUsers = currentRoles.includes('super_admin');
  const effectiveRole = useMemo(() => {
    if (currentRoles.includes('super_admin')) return 'super_admin';
    if (currentRoles.includes('admin')) return 'admin';
    if (currentRoles.includes('moderator')) return 'moderator';
    if (currentRoles.includes('user')) return 'user';
    return 'anonymous';
  }, [currentRoles]);

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

  const loadAllData = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetchEarnings(),
      fetchVacation(),
      fetchBenefits(),
      fetchAlerts(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    void loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const earningsFreshness = useMemo(() => getFreshnessInfo(earningsMeta?.updatedAt), [earningsMeta]);
  const vacationFreshness = useMemo(() => getFreshnessInfo(vacationMeta?.updatedAt), [vacationMeta]);
  const benefitsFreshness = useMemo(() => getFreshnessInfo(benefitsMeta?.updatedAt), [benefitsMeta]);

  const lastUpdatedAt = useMemo(() => {
    const candidates = [earningsMeta?.updatedAt, vacationMeta?.updatedAt, benefitsMeta?.updatedAt]
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));
    if (candidates.length === 0) return null;
    return new Date(Math.max(...candidates.map((date) => date.getTime()))).toISOString();
  }, [earningsMeta, vacationMeta, benefitsMeta]);

  const globalFreshness = useMemo(() => {
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

  const hasSummaryError = Boolean(earningsError || vacationError || benefitsError);

  const handleLogout = () => {
    onLogout();
  };

  const handleDrilldown = (filters) => {
    setDrilldown(filters);
  };

  const openContextDrilldown = (context) => {
    setDrilldown({ context });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>
            <span>HQ</span> HR & Payroll Analytics
          </h1>
          <span className="subtitle">Executive Overview - FY {currentYear}</span>
          <p className="subtitle subtitle-meta-row">
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
            <div className="card alerts-section">
              <div className="card-header">
                <div>
                  <h2>Action Items & Alerts</h2>
                  <span className="card-subtitle">Manage-by-exception</span>
                </div>
                <div className="card-header-actions">
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
                <AlertsPanel alerts={alerts} />
              ) : (
                <div className="panel-state panel-state-empty">
                  <p>No active alerts. System is currently clear.</p>
                </div>
              )}
            </div>

            <div className="card integration-section">
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
    </div>
  );
}

export default Dashboard;
