import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Dashboard from './Dashboard';
import {
  getBenefitsSummary,
  getEarningsSummary,
  getTriggeredAlerts,
  getVacationSummary,
} from '../services/api';

vi.mock('../services/api', () => ({
  getEarningsSummary: vi.fn(),
  getVacationSummary: vi.fn(),
  getBenefitsSummary: vi.fn(),
  getTriggeredAlerts: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons while data is pending', () => {
    const pending = new Promise(() => {});
    getEarningsSummary.mockReturnValue(pending);
    getVacationSummary.mockReturnValue(pending);
    getBenefitsSummary.mockReturnValue(pending);
    getTriggeredAlerts.mockReturnValue(pending);

    render(<Dashboard onLogout={onLogout} currentUser={userContext} />);

    expect(screen.getAllByTestId('skeleton-chart').length).toBeGreaterThan(0);
    expect(screen.getByTestId('skeleton-list')).toBeInTheDocument();
  });

  it('shows localized summary error state when APIs fail', async () => {
    getEarningsSummary.mockRejectedValue(new Error('earnings failed'));
    getVacationSummary.mockRejectedValue(new Error('vacation failed'));
    getBenefitsSummary.mockRejectedValue(new Error('benefits failed'));
    getTriggeredAlerts.mockRejectedValue(new Error('alerts failed'));

    render(<Dashboard onLogout={onLogout} currentUser={userContext} />);

    expect(await screen.findByText(/Summary data is partially unavailable/i)).toBeInTheDocument();
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
});
