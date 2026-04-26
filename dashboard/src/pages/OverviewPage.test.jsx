import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import OverviewPage from './OverviewPage';
import { DashboardDataContext } from '../contexts/DashboardDataContext';

let mockedPermissions = {
  canAccessIntegrationQueue: true,
  canManageEmployees: false,
  canManageAlerts: true,
  canManageUsers: false,
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    effectiveRole: 'admin',
    permissions: mockedPermissions,
  }),
}));

const dashboardContext = {
  executiveBrief: {
    tone: 'warning',
    label: 'Monitor Closely',
    headline: 'This dashboard is usable, with a few follow-ups to clear first.',
    summary: 'Start with the highest-impact exception, then use drilldown to confirm the scope.',
    items: [
      {
        key: 'review-alerts',
        tone: 'info',
        title: 'Review alert ownership',
        detail: 'Use the queue to assign owners first.',
      },
      {
        key: 'open-earnings',
        tone: 'healthy',
        title: 'Open drilldown',
        detail: 'Go deeper on payroll details.',
      },
    ],
  },
  globalFreshness: {
    label: 'Fresh',
    css: 'fresh',
    tooltip: 'All core datasets updated recently.',
  },
  freshnessReadiness: {
    status: 'current',
    actionMode: 'reload',
    actionLabel: 'Refresh data',
    summary: 'Summaries current',
    note: 'Auto 30m',
    detail: 'Core summaries are current.',
  },
  summaryErrorCount: 0,
  summaryRefreshError: '',
  effectiveAlertStats: { categories: 4, affected: 12 },
  alertFollowUp: {
    needsAttentionCategories: 2,
    needsAttentionEmployees: 12,
    unassignedCategories: 1,
    staleCategories: 1,
    ownedCategories: 2,
  },
  canAccessIntegrationQueue: true,
  loadingIntegrationMetrics: false,
  hasExecutiveIntegrationSnapshot: true,
  effectiveIntegrationError: '',
  queueActionable: 7,
  queueBacklog: 11,
  operationalReadiness: {
    checkedAt: '2026-04-22T09:00:00.000Z',
    overall: {
      status: 'warning',
      label: 'Monitor',
      summary: '2 checks need review.',
    },
    cards: [
      {
        key: 'services',
        label: 'Services',
        status: 'healthy',
        metric: '3/3',
        headline: 'All runtimes reachable',
        detail: 'Dashboard, SA, and Payroll health checks are responding.',
      },
      {
        key: 'queue',
        label: 'Queue',
        status: 'warning',
        metric: '7',
        headline: 'Queue needs operator review',
        detail: '7 actionable / 11 backlog / oldest 12m',
        actionKey: 'open-ops',
        actionLabel: 'Open ops',
      },
    ],
  },
  operationalReadinessError: '',
  loadingOperationalReadiness: false,
  rebuildingSummaries: false,
  refreshing: false,
  hasSummaryError: false,
  loadAllData: vi.fn(),
  fetchOperationalReadiness: vi.fn(),
  fetchEarnings: vi.fn(),
  fetchVacation: vi.fn(),
  fetchBenefits: vi.fn(),
  fetchAlerts: vi.fn(),
  earningsError: '',
  vacationError: '',
  benefitsError: '',
  alertsError: '',
  stats: {
    earnings: { value: 1000000, trend: 1.2 },
    vacation: { value: 5000, trend: -0.4 },
    benefits: { value: 1900, trend: 'neutral', subtext: 'Per Employee / Year' },
    alerts: { categories: 4, affected: 12 },
  },
  currentYear: 2026,
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}{location.search}</div>;
}

function renderOverview(contextValue = dashboardContext) {
  return render(
    <DashboardDataContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <LocationProbe />
        <Routes>
          <Route path="/dashboard" element={<OverviewPage />} />
          <Route path="/dashboard/alerts" element={<div />} />
          <Route path="/dashboard/analytics" element={<div />} />
          <Route path="/dashboard/integration" element={<div />} />
        </Routes>
      </MemoryRouter>
    </DashboardDataContext.Provider>,
  );
}

describe('OverviewPage', () => {
  beforeEach(() => {
    mockedPermissions = {
      canAccessIntegrationQueue: true,
      canManageEmployees: false,
      canManageAlerts: true,
      canManageUsers: false,
    };
  });

  it('renders quick navigation and routes the earnings executive action to analytics', async () => {
    const user = userEvent.setup();
    renderOverview();

    expect(screen.getByText(/Ready check/i)).toBeInTheDocument();
    expect(screen.queryByText(/Presentation status/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Operational readiness/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Shortcuts/i })).toBeInTheDocument();
    expect(screen.queryByText(/Track the four numbers that move first/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Open the next route directly/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Analytics/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Open Alerts/i })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Open Operations/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open Drilldown/i }));
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/dashboard/analytics?drilldown=earnings');
  }, 10000);

  it('keeps shortcuts outside the readiness side column for balanced desktop scanning', () => {
    const { container } = renderOverview();

    const shortcutsPanel = screen.getByRole('heading', { name: /Shortcuts/i }).closest('section');
    const sideColumn = container.querySelector('.overview-side-column');

    expect(shortcutsPanel).toBeInTheDocument();
    expect(sideColumn).toBeInTheDocument();
    expect(sideColumn).not.toContainElement(shortcutsPanel);
  });

  it('routes the alert review executive action to the alerts page', async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getAllByRole('button', { name: /Open Alerts/i })[0]);
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/dashboard/alerts');
  });

  it('hides operations quick navigation when the user cannot access integration queue', () => {
    mockedPermissions = {
      canAccessIntegrationQueue: false,
      canManageEmployees: false,
      canManageAlerts: true,
      canManageUsers: false,
    };

    renderOverview({
      ...dashboardContext,
      canAccessIntegrationQueue: false,
    });

    expect(screen.getByRole('button', { name: /Open Analytics/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Open Alerts/i })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Open Operations/i })).not.toBeInTheDocument();
  });

  it('uses summary rebuild flow for admin freshness debt actions', async () => {
    const user = userEvent.setup();
    const loadAllData = vi.fn();

    renderOverview({
      ...dashboardContext,
      loadAllData,
      freshnessReadiness: {
        status: 'refresh_lag',
        actionMode: 'rebuild',
        actionLabel: 'Rebuild summaries',
        summary: 'Summary refresh lag',
        note: 'Auto 30m',
        detail: 'One or more summary datasets are stale.',
      },
      executiveBrief: {
        ...dashboardContext.executiveBrief,
        items: [
          {
            key: 'refresh-summary',
            tone: 'warning',
            title: 'Summary refresh lag',
          },
        ],
      },
    });

    await user.click(screen.getByRole('button', { name: /Rebuild summaries/i }));
    expect(loadAllData).toHaveBeenCalledWith({
      rebuildSummaries: true,
      forceOperationalReadiness: true,
    });
  });

  it('refreshes readiness without reloading the full overview payload', async () => {
    const user = userEvent.setup();
    const loadAllData = vi.fn();
    const fetchOperationalReadiness = vi.fn();

    renderOverview({
      ...dashboardContext,
      loadAllData,
      fetchOperationalReadiness,
    });

    await user.click(screen.getByRole('button', { name: /Refresh readiness/i }));
    expect(fetchOperationalReadiness).toHaveBeenCalledWith(undefined, { forceRefresh: true });
    expect(loadAllData).not.toHaveBeenCalled();
  });
});
