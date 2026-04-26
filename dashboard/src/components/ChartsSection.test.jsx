import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ChartsSection from './ChartsSection';

vi.mock('./EarningsChart', () => ({
  default: () => <div data-testid="earnings-chart">earnings chart</div>,
}));

vi.mock('./VacationChart', () => ({
  default: () => <div data-testid="vacation-chart">vacation chart</div>,
}));

vi.mock('./BenefitsChart', () => ({
  default: () => <div data-testid="benefits-chart">benefits chart</div>,
}));

vi.mock('./Skeletons', () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart">loading</div>,
}));

const defaultProps = {
  earnings: { byDepartment: {} },
  vacation: { totals: { current: 0, previous: 0 } },
  benefits: { byPlan: {}, byShareholder: { shareholder: { totalPaid: 0, count: 0, average: 0 }, nonShareholder: { totalPaid: 0, count: 0, average: 0 } } },
  loadingEarnings: false,
  loadingVacation: false,
  loadingBenefits: false,
  earningsError: '',
  vacationError: '',
  benefitsError: '',
  earningsFreshness: { css: 'fresh', tooltip: 'Updated recently', label: 'Fresh' },
  vacationFreshness: { css: 'fresh', tooltip: 'Updated recently', label: 'Fresh' },
  benefitsFreshness: { css: 'fresh', tooltip: 'Updated recently', label: 'Fresh' },
  onRetryEarnings: vi.fn(),
  onRetryVacation: vi.fn(),
  onRetryBenefits: vi.fn(),
  onDrilldown: vi.fn(),
  onContextDrilldown: vi.fn(),
  departmentScope: '',
};

describe('ChartsSection', () => {
  it('does not repeat the active scope badge across every chart card', () => {
    render(<ChartsSection {...defaultProps} departmentScope="Engineering" />);

    expect(screen.getAllByRole('button', { name: /Open drilldown/i })).toHaveLength(3);
    expect(screen.queryByText(/Scope:\s*Engineering/i)).not.toBeInTheDocument();
  });

  it('surfaces analytics brief cards that open targeted drilldowns', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(
      <ChartsSection
        {...defaultProps}
        onDrilldown={onDrilldown}
        earnings={{
          byDepartment: {
            Engineering: { current: 2200000, previous: 1800000 },
            Finance: { current: 1100000, previous: 1500000 },
          },
        }}
        vacation={{
          totals: { current: 300, previous: 240 },
          byDepartment: {
            Engineering: { current: 180, previous: 150 },
            Finance: { current: 120, previous: 90 },
          },
        }}
        benefits={{
          byShareholder: {
            shareholder: { totalPaid: 24000, count: 6, average: 4000 },
            nonShareholder: { totalPaid: 18000, count: 9, average: 2000 },
          },
          byPlan: {
            'Basic Health': {
              shareholder: { totalPaid: 12000, count: 3, average: 4000 },
              nonShareholder: { totalPaid: 9000, count: 6, average: 1500 },
            },
            Dental: {
              shareholder: { totalPaid: 8000, count: 2, average: 4000 },
              nonShareholder: { totalPaid: 3000, count: 2, average: 1500 },
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/Quick checks/i)).toBeInTheDocument();
    expect(screen.queryByText(/Priority checks/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Analytics highlights/i)).not.toBeInTheDocument();
    expect(screen.getByText(/66.7% of payroll/i)).toBeInTheDocument();
    expect(screen.queryByText(/Basic Health drives the largest payout/i)).not.toBeInTheDocument();
    expect(screen.getByText(/60.0% of time off/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Review$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^Open payroll$/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open payroll concentration drilldown/i }));

    expect(onDrilldown).toHaveBeenCalledWith({
      context: 'earnings',
      department: 'Engineering',
    });
  });

  it('switches analytics highlights to within-scope signals when a department scope is active', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(
      <ChartsSection
        {...defaultProps}
        departmentScope="Human Resources"
        onDrilldown={onDrilldown}
        earnings={{
          byDepartment: {},
          byShareholder: {
            shareholder: { current: 900000, previous: 820000 },
            nonShareholder: { current: 1300000, previous: 1190000 },
          },
          byGender: {
            Male: { current: 1000000, previous: 920000 },
            Female: { current: 1200000, previous: 1090000 },
          },
          byEthnicity: {
            Asian: { current: 600000, previous: 520000 },
            Hispanic: { current: 750000, previous: 700000 },
            Caucasian: { current: 850000, previous: 790000 },
          },
          byEmploymentType: {
            'Full-time': { current: 1700000, previous: 1500000 },
            'Part-time': { current: 500000, previous: 510000 },
          },
        }}
        vacation={{
          totals: { current: 260, previous: 220 },
          byDepartment: {},
          byShareholder: {
            shareholder: { current: 90, previous: 70 },
            nonShareholder: { current: 170, previous: 150 },
          },
          byGender: {
            Male: { current: 110, previous: 95 },
            Female: { current: 150, previous: 125 },
          },
          byEthnicity: {
            Asian: { current: 60, previous: 50 },
            Hispanic: { current: 80, previous: 70 },
            Caucasian: { current: 120, previous: 100 },
          },
          byEmploymentType: {
            'Full-time': { current: 190, previous: 165 },
            'Part-time': { current: 70, previous: 55 },
          },
        }}
        benefits={{
          byShareholder: {
            shareholder: { totalPaid: 64000, count: 16, average: 4000 },
            nonShareholder: { totalPaid: 42000, count: 21, average: 2000 },
          },
          byPlan: {
            'Premium Health': {
              shareholder: { totalPaid: 36000, count: 8, average: 4500 },
              nonShareholder: { totalPaid: 24000, count: 12, average: 2000 },
            },
            Dental: {
              shareholder: { totalPaid: 12000, count: 4, average: 3000 },
              nonShareholder: { totalPaid: 9000, count: 6, average: 1500 },
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/77.3% of payroll/i)).toBeInTheDocument();
    expect(screen.queryByText(/Premium Health drives the largest Human Resources payout/i)).not.toBeInTheDocument();
    expect(screen.getByText(/73.1% of time off/i)).toBeInTheDocument();
    expect(screen.getByText(/^Open payroll$/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open payroll concentration drilldown/i }));

    expect(onDrilldown).toHaveBeenCalledWith({
      context: 'earnings',
      employmentType: 'Full-time',
    });
  });
});
