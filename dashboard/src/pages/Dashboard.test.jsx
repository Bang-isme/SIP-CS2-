import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Dashboard from './Dashboard';
import {
  getBenefitsSummary,
  getEarningsSummary,
  getExecutiveBrief,
  getIntegrationMetrics,
  getTriggeredAlerts,
  getVacationSummary,
} from '../services/api';

vi.mock('../services/api', () => ({
  getEarningsSummary: vi.fn(),
  getVacationSummary: vi.fn(),
  getBenefitsSummary: vi.fn(),
  getExecutiveBrief: vi.fn(),
  getTriggeredAlerts: vi.fn(),
  getIntegrationMetrics: vi.fn(),
}));

vi.mock('../components/EarningsChart', () => ({
  default: () => <div data-testid="earnings-chart-mock">earnings-chart</div>,
}));

vi.mock('../components/VacationChart', () => ({
  default: () => <div data-testid="vacation-chart-mock">vacation-chart</div>,
}));

vi.mock('../components/BenefitsChart', () => ({
  default: () => <div data-testid="benefits-chart-mock">benefits-chart</div>,
}));

vi.mock('../components/Skeletons', () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
  SkeletonList: () => <div data-testid="skeleton-list" />,
}));

vi.mock('../components/IntegrationEventsPanel', () => ({
  default: () => <div data-testid="integration-panel-mock">integration-panel</div>,
}));

describe('Dashboard states', () => {
  const onLogout = vi.fn();
  const userContext = { roles: ['user'] };
  const updatedAt = new Date().toISOString();

  const successEarnings = {
    data: {
      byDepartment: {
        Engineering: { current: 120000, previous: 100000 },
      },
      byShareholder: {
        shareholder: { current: 60000 },
        nonShareholder: { current: 60000 },
      },
      byGender: {
        Male: { current: 60000 },
        Female: { current: 60000 },
      },
      byEthnicity: {
        Asian: { current: 30000 },
        Caucasian: { current: 90000 },
      },
      byEmploymentType: {
        'Full-time': { current: 120000 },
      },
    },
    meta: { updatedAt },
  };

  const successVacation = {
    data: {
      totals: { current: 120, previous: 90 },
      byShareholder: {
        shareholder: { current: 40 },
        nonShareholder: { current: 80 },
      },
      byGender: {
        Male: { current: 60 },
        Female: { current: 60 },
      },
      byEthnicity: {
        Asian: { current: 20 },
        Caucasian: { current: 100 },
      },
      byEmploymentType: {
        'Full-time': { current: 120 },
      },
    },
    meta: { updatedAt },
  };

  const successBenefits = {
    data: {
      byShareholder: {
        shareholder: { count: 1, totalPaid: 4000, average: 4000 },
        nonShareholder: { count: 1, totalPaid: 2000, average: 2000 },
      },
      byPlan: {
        Standard: {
          shareholder: { average: 4000 },
          nonShareholder: { average: 2000 },
        },
      },
    },
    meta: { updatedAt },
  };

  const successIntegrationMetrics = {
    data: {
      actionable: 7,
      backlog: 11,
      oldestPendingAgeMinutes: 18,
      counts: {
        PENDING: 2,
        PROCESSING: 1,
        SUCCESS: 10,
        FAILED: 4,
        DEAD: 3,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getExecutiveBrief.mockRejectedValue(new Error('executive brief unavailable'));
    getIntegrationMetrics.mockResolvedValue(successIntegrationMetrics);
  });

  it('renders loading skeletons while data is pending', () => {
    const pending = new Promise(() => {});
    getEarningsSummary.mockReturnValue(pending);
    getVacationSummary.mockReturnValue(pending);
    getBenefitsSummary.mockReturnValue(pending);
    getExecutiveBrief.mockReturnValue(pending);
    getTriggeredAlerts.mockReturnValue(pending);
    getIntegrationMetrics.mockReturnValue(pending);

    render(<Dashboard onLogout={onLogout} currentUser={userContext} />);

    expect(screen.getAllByTestId('skeleton-chart').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('skeleton-list').length).toBeGreaterThan(0);
  });

  it('shows localized summary error state when APIs fail', async () => {
    getEarningsSummary.mockRejectedValue(new Error('earnings failed'));
    getVacationSummary.mockRejectedValue(new Error('vacation failed'));
    getBenefitsSummary.mockRejectedValue(new Error('benefits failed'));
    getTriggeredAlerts.mockRejectedValue(new Error('alerts failed'));
    getIntegrationMetrics.mockRejectedValue(new Error('queue failed'));

    render(<Dashboard onLogout={onLogout} currentUser={userContext} />);

    expect(await screen.findByText(/Some summary sections are unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Failed Loads/i })).toBeInTheDocument();
  });

  it('shows empty alerts state when no alert records exist', async () => {
    getEarningsSummary.mockResolvedValue(successEarnings);
    getVacationSummary.mockResolvedValue(successVacation);
    getBenefitsSummary.mockResolvedValue(successBenefits);
    getTriggeredAlerts.mockResolvedValue({ data: [] });

    render(<Dashboard onLogout={onLogout} currentUser={userContext} />);

    await waitFor(() => {
      expect(screen.getByText(/No active alerts. System is currently clear/i)).toBeInTheDocument();
    });
  });

  it('allows super admin to access integration queue panel', async () => {
    getEarningsSummary.mockResolvedValue(successEarnings);
    getVacationSummary.mockResolvedValue(successVacation);
    getBenefitsSummary.mockResolvedValue(successBenefits);
    getTriggeredAlerts.mockResolvedValue({ data: [] });

    render(<Dashboard onLogout={onLogout} currentUser={{ roles: ['super_admin'] }} />);

    expect(await screen.findByTestId('integration-panel-mock')).toBeInTheDocument();
    expect(screen.queryByText(/restricted to admin/i)).not.toBeInTheDocument();
    expect(screen.getByText(/7 actionable \/ 11 backlog/i)).toBeInTheDocument();
  });

  it('shows alert settings control for admin users', async () => {
    getEarningsSummary.mockResolvedValue(successEarnings);
    getVacationSummary.mockResolvedValue(successVacation);
    getBenefitsSummary.mockResolvedValue(successBenefits);
    getTriggeredAlerts.mockResolvedValue({ data: [] });

    render(<Dashboard onLogout={onLogout} currentUser={{ roles: ['admin'] }} />);

    expect(await screen.findByRole('button', { name: /alert settings/i })).toBeInTheDocument();
  });

  it('lets moderators manage alerts without exposing integration controls', async () => {
    getEarningsSummary.mockResolvedValue(successEarnings);
    getVacationSummary.mockResolvedValue(successVacation);
    getBenefitsSummary.mockResolvedValue(successBenefits);
    getTriggeredAlerts.mockResolvedValue({ data: [] });

    render(<Dashboard onLogout={onLogout} currentUser={{ roles: ['moderator'] }} />);

    expect(await screen.findByRole('button', { name: /alert settings/i })).toBeInTheDocument();
    expect(screen.queryByTestId('integration-panel-mock')).not.toBeInTheDocument();
    expect(screen.getByText(/restricted to admin or super-admin role/i)).toBeInTheDocument();
    expect(screen.getByText(/Restricted \(moderator\)/i)).toBeInTheDocument();
  });

  it('surfaces executive action items when alerts and queue risk exist', async () => {
    getEarningsSummary.mockResolvedValue(successEarnings);
    getVacationSummary.mockResolvedValue(successVacation);
    getBenefitsSummary.mockResolvedValue(successBenefits);
    getTriggeredAlerts.mockResolvedValue({
      data: [
        { count: 4, alert: { _id: 'vac-1', type: 'vacation', name: 'Vacation Threshold' } },
        { count: 2, alert: { _id: 'birthday-1', type: 'birthday', name: 'Birthdays' } },
      ],
    });

    render(<Dashboard onLogout={onLogout} currentUser={{ roles: ['admin'] }} />);

    expect(await screen.findByText(/This snapshot needs a quick review before presentation/i)).toBeInTheDocument();
    expect(screen.getByText(/Alert ownership still has gaps/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review Queue/i })).toBeInTheDocument();
  });

  it('shows alert follow-up queue for unassigned and stale ownership states', async () => {
    getEarningsSummary.mockResolvedValue(successEarnings);
    getVacationSummary.mockResolvedValue(successVacation);
    getBenefitsSummary.mockResolvedValue(successBenefits);
    getTriggeredAlerts.mockResolvedValue({
      data: [
        {
          count: 6,
          alert: {
            _id: 'vac-1',
            type: 'vacation',
            name: 'Vacation Threshold',
          },
        },
        {
          count: 3,
          alert: {
            _id: 'benefits-1',
            type: 'benefits_change',
            name: 'Benefits Change',
            acknowledgement: {
              needsReview: true,
              acknowledgedAt: updatedAt,
              acknowledgedCount: 1,
              acknowledgedBy: {
                username: 'opslead',
              },
            },
          },
        },
      ],
    });

    render(<Dashboard onLogout={onLogout} currentUser={{ roles: ['admin'] }} />);

    expect(await screen.findByRole('heading', { name: /Alert Follow-up Queue/i })).toBeInTheDocument();
    expect(screen.getByText(/No owner note is recorded for the current alert snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Alert volume moved from 1 to 3 employees since the last note/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assign Owner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-review Alert/i })).toBeInTheDocument();
  });

  it('prefers backend executive snapshot for action center and follow-up queue', async () => {
    getEarningsSummary.mockResolvedValue(successEarnings);
    getVacationSummary.mockResolvedValue(successVacation);
    getBenefitsSummary.mockResolvedValue(successBenefits);
    getTriggeredAlerts.mockResolvedValue({
      data: [
        {
          count: 6,
          alert: {
            _id: 'vac-1',
            type: 'vacation',
            name: 'Vacation Threshold',
          },
        },
      ],
    });
    getExecutiveBrief.mockResolvedValue({
      data: {
        freshness: {
          global: {
            label: 'Fresh',
            css: 'fresh',
            lastUpdatedAt: updatedAt,
          },
        },
        alerts: {
          stats: {
            categories: 1,
            affected: 6,
          },
          followUp: {
            items: [
              {
                alertId: 'vac-1',
                label: 'High Vacation Balance',
                severity: 'High',
                count: 6,
                status: 'unassigned',
                detail: 'Backend follow-up detail',
                ownerLabel: 'Unassigned',
                actionLabel: 'Assign Owner',
              },
            ],
            queue: [
              {
                alertId: 'vac-1',
                label: 'High Vacation Balance',
                severity: 'High',
                count: 6,
                status: 'unassigned',
                detail: 'Backend follow-up detail',
                ownerLabel: 'Unassigned',
                actionLabel: 'Assign Owner',
              },
            ],
            queuePreview: [
              {
                alertId: 'vac-1',
                label: 'High Vacation Balance',
                severity: 'High',
                count: 6,
                status: 'unassigned',
                detail: 'Backend follow-up detail',
                ownerLabel: 'Unassigned',
                actionLabel: 'Assign Owner',
              },
            ],
            needsAttentionCategories: 1,
            needsAttentionEmployees: 6,
            unassignedCategories: 1,
            staleCategories: 0,
            ownedCategories: 0,
          },
        },
        integration: {
          accessible: true,
          metrics: successIntegrationMetrics.data,
        },
        actionCenter: {
          status: 'critical',
          label: 'Action Required',
          headline: 'Backend-owned executive headline.',
          summary: 'Backend-owned executive summary.',
          items: [
            {
              key: 'review-alert-ownership',
              tone: 'critical',
              title: 'Backend-owned alert ownership gap',
              detail: 'Review the backend-generated follow-up queue first.',
              actionLabel: 'Review Alerts',
            },
          ],
        },
      },
    });

    render(<Dashboard onLogout={onLogout} currentUser={{ roles: ['admin'] }} />);

    expect(await screen.findByText(/Backend-owned executive headline/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend-owned executive summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend-owned alert ownership gap/i)).toBeInTheDocument();
    expect(screen.getByText(/Backend follow-up detail/i)).toBeInTheDocument();
  });
});
