import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { vi } from 'vitest';
import AuthContext from '../contexts/AuthContext';
import DashboardLayout from './DashboardLayout';
import useDashboardData from '../hooks/useDashboardData';
import { useDashboardPageChrome } from '../contexts/PageChromeContext';
import { useDashboardOverviewSlice } from '../contexts/DashboardDataContext';

vi.mock('../hooks/useDashboardData', () => ({
  default: vi.fn(),
}));

const mockDashboardData = {
  earnings: null,
  vacation: null,
  benefits: null,
  alerts: [],
  loadingEarnings: false,
  loadingVacation: false,
  loadingBenefits: false,
  loadingAlerts: false,
  loadingIntegrationMetrics: false,
  earningsError: '',
  vacationError: '',
  benefitsError: '',
  alertsError: '',
  integrationMetricsError: '',
  executiveSnapshotError: '',
  integrationError: '',
  earningsFreshness: { css: 'fresh', label: 'Fresh', tooltip: 'Updated recently.' },
  vacationFreshness: { css: 'fresh', label: 'Fresh', tooltip: 'Updated recently.' },
  benefitsFreshness: { css: 'fresh', label: 'Fresh', tooltip: 'Updated recently.' },
  globalFreshness: { css: 'fresh', label: 'Fresh', tooltip: 'Updated recently.' },
  freshnessReadiness: {
    status: 'current',
    actionMode: 'reload',
    actionLabel: 'Refresh data',
    summary: 'Summaries current',
    note: 'Auto 30m',
    detail: 'Core summaries are current.',
  },
  lastUpdatedAt: new Date('2026-04-10T00:00:00.000Z').toISOString(),
  stats: {
    earnings: { value: 1000, trend: 3.2 },
    vacation: { value: 200, trend: 0 },
    benefits: { value: 150, trend: 'neutral', subtext: 'Per Employee / Year' },
    alerts: { categories: 2, affected: 5 },
  },
  alertFollowUp: {
    needsAttentionCategories: 1,
    needsAttentionEmployees: 5,
    unassignedCategories: 1,
    staleCategories: 0,
    ownedCategories: 0,
    queuePreview: [],
    queue: [],
    items: [],
  },
  executiveBrief: {
    tone: 'warning',
    label: 'Monitor Closely',
    headline: 'This dashboard is usable, with a few follow-ups to clear first.',
    summary: 'Start with the highest-impact exception, then use drilldown to confirm the scope.',
    items: [],
  },
  hasSummaryError: false,
  summaryErrorCount: 0,
  effectiveAlertStats: { categories: 2, affected: 5 },
  effectiveIntegrationError: '',
  queueActionable: 4,
  queueBacklog: 9,
  queueOldestPendingAge: 3,
  hasExecutiveIntegrationSnapshot: true,
  loadAllData: vi.fn().mockResolvedValue(undefined),
  fetchEarnings: vi.fn().mockResolvedValue(undefined),
  fetchVacation: vi.fn().mockResolvedValue(undefined),
  fetchBenefits: vi.fn().mockResolvedValue(undefined),
  fetchAlerts: vi.fn().mockResolvedValue(undefined),
  fetchExecutiveSnapshot: vi.fn().mockResolvedValue(undefined),
  rebuildingSummaries: false,
  refreshing: false,
  setAlerts: vi.fn(),
  setIntegrationError: vi.fn(),
  currentYear: 2026,
};

const createDashboardData = () => ({
  ...mockDashboardData,
  loadAllData: vi.fn().mockResolvedValue(undefined),
  fetchEarnings: vi.fn().mockResolvedValue(undefined),
  fetchVacation: vi.fn().mockResolvedValue(undefined),
  fetchBenefits: vi.fn().mockResolvedValue(undefined),
  fetchAlerts: vi.fn().mockResolvedValue(undefined),
  fetchExecutiveSnapshot: vi.fn().mockResolvedValue(undefined),
  rebuildingSummaries: false,
  setAlerts: vi.fn(),
  setIntegrationError: vi.fn(),
});

const renderLayout = ({
  pathname = '/dashboard',
  roles = ['user'],
  permissions = {
    canAccessIntegrationQueue: false,
    canManageEmployees: false,
    canManageAlerts: false,
    canManageUsers: false,
  },
} = {}) => {
  const authValue = {
    currentUser: {
      _id: 'user-1',
      username: 'demo',
      email: 'demo@example.com',
      roles,
    },
    handleLogout: vi.fn().mockResolvedValue(undefined),
    permissions,
    effectiveRole: roles.includes('super_admin')
      ? 'super_admin'
      : roles.includes('admin')
        ? 'admin'
        : roles.includes('moderator')
          ? 'moderator'
          : 'user',
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[pathname]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<div>Overview child</div>} />
          <Route path="analytics" element={<div>Analytics child</div>} />
          <Route path="analytics/drilldown" element={<div>Analytics drilldown child</div>} />
          <Route path="alerts" element={<div>Alerts child</div>} />
          <Route path="integration" element={<div>Integration child</div>} />
          <Route path="admin/employees" element={<div>Employee admin child</div>} />
          <Route path="admin/users" element={<div>User admin child</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
    </AuthContext.Provider>,
  );
};

function ScopedRefreshChild({ onScopedRefresh }) {
  const { setPageRefreshConfig } = useDashboardPageChrome();

  useEffect(() => {
    setPageRefreshConfig({
      label: 'Refresh analytics',
      refreshing: false,
      onRefresh: onScopedRefresh,
    });

    return () => setPageRefreshConfig(null);
  }, [onScopedRefresh, setPageRefreshConfig]);

  return <div>Scoped refresh child</div>;
}

function OverviewReadinessProbe() {
  const {
    operationalReadiness,
    operationalReadinessError,
    loadingOperationalReadiness,
    fetchOperationalReadiness,
  } = useDashboardOverviewSlice();

  return (
    <div>
      <span>{operationalReadiness?.overall?.summary || 'Readiness missing'}</span>
      <span>{operationalReadinessError || 'No readiness error'}</span>
      <span>{loadingOperationalReadiness ? 'Readiness loading' : 'Readiness settled'}</span>
      <button type="button" onClick={() => fetchOperationalReadiness?.(undefined, { forceRefresh: true })}>
        Probe readiness refresh
      </button>
    </div>
  );
}

describe('DashboardLayout', () => {
  let dashboardData;

  beforeEach(() => {
    dashboardData = createDashboardData();
    vi.mocked(useDashboardData).mockReturnValue(dashboardData);
  });

  it('renders the overview shell with sidebar navigation and refresh actions', async () => {
    const user = userEvent.setup();
    renderLayout();

    expect(screen.getByRole('heading', { name: /Executive Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alerts/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Operations/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
    expect(screen.getByText(/Overview child/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(dashboardData.loadAllData).toHaveBeenCalled();
  });

  it('switches the default header refresh to summary rebuild when freshness semantics require it', async () => {
    const user = userEvent.setup();
    dashboardData = createDashboardData();
    dashboardData.freshnessReadiness = {
      status: 'refresh_lag',
      actionMode: 'rebuild',
      actionLabel: 'Rebuild summaries',
      summary: 'Summary refresh lag',
      note: 'Auto 30m',
      detail: 'One or more summary datasets are stale.',
    };
    vi.mocked(useDashboardData).mockReturnValue(dashboardData);

    renderLayout({
      roles: ['admin'],
      permissions: {
        canAccessIntegrationQueue: true,
        canManageEmployees: false,
        canManageAlerts: true,
        canManageUsers: false,
      },
    });

    const rebuildButton = screen.getByRole('button', { name: /Rebuild summaries/i });
    await user.click(rebuildButton);
    expect(dashboardData.loadAllData).toHaveBeenCalledWith({ rebuildSummaries: true });
  });

  it('passes operational readiness state and refresh action into the overview route slice', async () => {
    const user = userEvent.setup();
    dashboardData = createDashboardData();
    dashboardData.operationalReadiness = {
      overall: {
        status: 'healthy',
        label: 'Ready',
        summary: 'All operational checks are visible.',
      },
      cards: [],
    };
    dashboardData.operationalReadinessError = '';
    dashboardData.loadingOperationalReadiness = false;
    dashboardData.fetchOperationalReadiness = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDashboardData).mockReturnValue(dashboardData);

    const authValue = {
      currentUser: {
        _id: 'user-1',
        username: 'demo',
        email: 'demo@example.com',
        roles: ['admin'],
      },
      handleLogout: vi.fn().mockResolvedValue(undefined),
      permissions: {
        canAccessIntegrationQueue: true,
        canManageEmployees: false,
        canManageAlerts: true,
        canManageUsers: false,
      },
      effectiveRole: 'admin',
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<OverviewReadinessProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText(/All operational checks are visible/i)).toBeInTheDocument();
    expect(screen.getByText(/No readiness error/i)).toBeInTheDocument();
    expect(screen.getByText(/Readiness settled/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Probe readiness refresh/i }));
    expect(dashboardData.fetchOperationalReadiness).toHaveBeenCalledWith(undefined, { forceRefresh: true });
  });

  it('switches the page title for administration routes and shows privileged navigation links', () => {
    renderLayout({
      pathname: '/dashboard/admin/employees',
      roles: ['super_admin'],
      permissions: {
        canAccessIntegrationQueue: true,
        canManageEmployees: true,
        canManageAlerts: true,
        canManageUsers: true,
      },
    });

    expect(screen.getByRole('heading', { name: /Employee Administration/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Operations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage Employees/i })).toHaveAttribute('href', '/dashboard/admin/employees');
    expect(screen.getByRole('link', { name: /Manage Users/i })).toHaveAttribute('href', '/dashboard/admin/users');
    expect(screen.getByText(/Employee admin child/i)).toBeInTheDocument();
  });

  it('shows a dedicated page title for the analytics drilldown workflow', () => {
    renderLayout({
      pathname: '/dashboard/analytics/drilldown?context=earnings',
      roles: ['super_admin'],
      permissions: {
        canAccessIntegrationQueue: true,
        canManageEmployees: true,
        canManageAlerts: true,
        canManageUsers: true,
      },
    });

    expect(screen.getByRole('heading', { name: /Analytics Drilldown/i })).toBeInTheDocument();
    expect(screen.getByText(/Analytics drilldown child/i)).toBeInTheDocument();
  });

  it('opens and closes the mobile drawer from the menu button', async () => {
    const user = userEvent.setup();
    renderLayout();

    const drawer = screen.getByLabelText(/Dashboard navigation/i);
    expect(drawer).not.toHaveClass('dashboard-sidebar--open');

    await user.click(screen.getByLabelText(/Open navigation/i));
    expect(drawer).toHaveClass('dashboard-sidebar--open');

    await user.click(screen.getByLabelText(/Close sidebar/i));
    expect(drawer).not.toHaveClass('dashboard-sidebar--open');
  });

  it('lets desktop users collapse the sidebar to give dashboard content more room', async () => {
    const user = userEvent.setup();
    renderLayout();

    const layout = document.querySelector('.dashboard-layout');
    const sidebar = screen.getByLabelText(/Dashboard navigation/i);

    expect(layout).not.toHaveClass('dashboard-layout--sidebar-collapsed');
    expect(sidebar).not.toHaveClass('dashboard-sidebar--collapsed');

    await user.click(screen.getByRole('button', { name: /Collapse sidebar/i }));

    expect(layout).toHaveClass('dashboard-layout--sidebar-collapsed');
    expect(sidebar).toHaveClass('dashboard-sidebar--collapsed');
    expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeInTheDocument();
  });

  it('lets the active route override the header refresh action', async () => {
    const user = userEvent.setup();
    const onScopedRefresh = vi.fn().mockResolvedValue(undefined);

    const authValue = {
      currentUser: {
        _id: 'user-1',
        username: 'demo',
        email: 'demo@example.com',
        roles: ['admin'],
      },
      handleLogout: vi.fn().mockResolvedValue(undefined),
      permissions: {
        canAccessIntegrationQueue: true,
        canManageEmployees: false,
        canManageAlerts: true,
        canManageUsers: false,
      },
      effectiveRole: 'admin',
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dashboard/analytics']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route path="analytics" element={<ScopedRefreshChild onScopedRefresh={onScopedRefresh} />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: /Refresh analytics/i }));

    expect(onScopedRefresh).toHaveBeenCalled();
    expect(dashboardData.loadAllData).not.toHaveBeenCalled();
  });

  it('resets the dashboard content scroll position when changing routes', async () => {
    const user = userEvent.setup();
    renderLayout();

    const mainContent = document.querySelector('.dashboard-main-content');
    expect(mainContent).toBeTruthy();
    mainContent.scrollTop = 640;

    await user.click(screen.getByRole('link', { name: /Analytics/i }));

    await waitFor(() => {
      expect(screen.getByText(/Analytics child/i)).toBeInTheDocument();
    });
    expect(mainContent.scrollTop).toBe(0);
  });

  it('wraps route content in a stable transition frame that updates on navigation', async () => {
    const user = userEvent.setup();
    renderLayout();

    const initialFrame = document.querySelector('.dashboard-route-frame');
    expect(initialFrame).toBeTruthy();
    expect(initialFrame).toHaveAttribute('data-route-key', '/dashboard');
    expect(initialFrame).toHaveAttribute('data-route-title', 'Executive Overview');
    expect(initialFrame).toHaveAttribute('aria-label', 'Executive Overview content');

    await user.click(screen.getByRole('link', { name: /Analytics/i }));

    await waitFor(() => {
      expect(screen.getByText(/Analytics child/i)).toBeInTheDocument();
    });

    const nextFrame = document.querySelector('.dashboard-route-frame');
    expect(nextFrame).toBeTruthy();
    expect(nextFrame).toHaveAttribute('data-route-key', '/dashboard/analytics');
    expect(nextFrame).toHaveAttribute('data-route-title', 'Analytics');
    expect(nextFrame).toHaveAttribute('aria-label', 'Analytics content');
  });
});
