import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AuthContext from '../contexts/AuthContext';
import { DashboardAlertsContext } from '../contexts/DashboardDataContext';
import AlertsPage from './AlertsPage';

vi.mock('../components/AlertsPanel', () => ({
  default: ({ alerts, canManageAlerts, requestedAlertOpen }) => (
    <div data-testid="alerts-panel-mock">
      alerts:{alerts.length}
      role:{canManageAlerts ? 'manage' : 'readonly'}
      requested:{requestedAlertOpen?.alertId || 'none'}
    </div>
  ),
}));

vi.mock('../components/AlertSettingsModal', () => ({
  default: () => <div data-testid="alert-settings-modal">alert-settings-modal</div>,
}));

vi.mock('../components/Skeletons', () => ({
  SkeletonList: () => <div data-testid="skeleton-list">loading</div>,
}));

const createDashboardContext = (overrides = {}) => ({
  alertFollowUp: {
    needsAttentionCategories: 1,
    needsAttentionEmployees: 58283,
    unassignedCategories: 1,
    staleCategories: 0,
    queuePreview: [
      {
        alertId: 'vac-1',
        status: 'unassigned',
        severity: 'High',
        label: 'High Vacation Balance',
        detail: 'No owner note is recorded for the current alert snapshot.',
        count: 58283,
        ownerLabel: 'Unassigned',
        acknowledgedAt: null,
        actionLabel: 'Assign Owner',
      },
    ],
    items: [],
  },
  alerts: [
    {
      count: 58283,
      alert: {
        _id: 'vac-1',
        type: 'vacation',
        name: 'High Vacation Balance',
      },
    },
  ],
  alertsError: '',
  loadingAlerts: false,
  fetchExecutiveSnapshot: vi.fn().mockResolvedValue(undefined),
  fetchAlerts: vi.fn().mockResolvedValue(undefined),
  stats: {
    alerts: {
      categories: 1,
      affected: 58283,
    },
  },
  setAlerts: vi.fn(),
  ...overrides,
});

const renderAlertsPage = ({
  canManageAlerts = true,
  dashboardOverrides = {},
} = {}) => {
  const authValue = {
    currentUser: {
      _id: 'user-1',
      username: 'demo-admin',
      email: 'demo@example.com',
      roles: canManageAlerts ? ['admin'] : ['user'],
    },
    permissions: {
      canAccessIntegrationQueue: canManageAlerts,
      canManageEmployees: false,
      canManageAlerts,
      canManageUsers: false,
    },
    effectiveRole: canManageAlerts ? 'admin' : 'user',
    handleLogout: vi.fn(),
  };

  const dashboardValue = createDashboardContext(dashboardOverrides);

  render(
    <AuthContext.Provider value={authValue}>
      <DashboardAlertsContext.Provider value={dashboardValue}>
        <AlertsPage />
      </DashboardAlertsContext.Provider>
    </AuthContext.Provider>,
  );

  return { dashboardValue };
};

describe('AlertsPage', () => {
  it('uses refresh wording for the healthy detail panel action', () => {
    renderAlertsPage();

    expect(screen.getByRole('button', { name: /^Refresh$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Retry$/i })).not.toBeInTheDocument();
  });

  it('renders the follow-up queue and forwards the selected alert to the detail panel', async () => {
    const user = userEvent.setup();
    renderAlertsPage();

    expect(screen.getByRole('heading', { name: /Alert Follow-up Queue/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Alert Detail/i })).toBeInTheDocument();
    expect(screen.getByTestId('alerts-panel-mock')).toHaveTextContent('requested:none');

    await user.click(screen.getByRole('button', { name: /Assign Owner/i }));

    expect(screen.getByTestId('alerts-panel-mock')).toHaveTextContent('requested:vac-1');
  });

  it('opens the alert settings modal when the user can manage alerts', async () => {
    const user = userEvent.setup();
    renderAlertsPage();

    await user.click(screen.getByRole('button', { name: /Alert Settings/i }));

    expect(await screen.findByTestId('alert-settings-modal')).toBeInTheDocument();
  });

  it('does not render an empty-state CTA when there is no alert item to open', () => {
    renderAlertsPage({
      dashboardOverrides: {
        alertFollowUp: {
          needsAttentionCategories: 0,
          needsAttentionEmployees: 0,
          unassignedCategories: 0,
          staleCategories: 0,
          queuePreview: [],
          items: [],
        },
      },
    });

    expect(screen.getByText(/All active alert categories already have a current owner note\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open Alert Detail/i })).not.toBeInTheDocument();
  });

  it('hides alert settings for users without alert permissions', () => {
    renderAlertsPage({ canManageAlerts: false });

    expect(screen.queryByRole('button', { name: /Alert Settings/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('alerts-panel-mock')).toHaveTextContent('role:readonly');
  });
});
