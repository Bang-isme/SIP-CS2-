import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import BenefitsChart from './BenefitsChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar-series" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const benefitsData = {
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
    Vision: {
      shareholder: { totalPaid: 4000, count: 1, average: 4000 },
      nonShareholder: { totalPaid: 6000, count: 1, average: 6000 },
    },
  },
};

describe('BenefitsChart', () => {
  it('shows impact insights and lets users open a plan-level drilldown', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(<BenefitsChart data={benefitsData} onDrilldown={onDrilldown} />);

    expect(screen.getByText(/Highest impact plan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open enrollment drilldown for Basic Health/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open enrollment drilldown for Basic Health/i }));

    expect(onDrilldown).toHaveBeenCalledWith({ benefitPlan: 'Basic Health' });
  });

  it('lets operators open the widest shareholder gap plan from the insight card', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(<BenefitsChart data={benefitsData} onDrilldown={onDrilldown} />);

    await user.click(screen.getByRole('button', { name: /Open gap drilldown for Basic Health/i }));

    expect(onDrilldown).toHaveBeenCalledWith({ benefitPlan: 'Basic Health' });
  });

  it('shows a balanced state instead of a fake spread alert when plan averages are equal', () => {
    render(
      <BenefitsChart
        data={{
          byShareholder: {
            shareholder: { totalPaid: 12000, count: 3, average: 4000 },
            nonShareholder: { totalPaid: 12000, count: 3, average: 4000 },
          },
          byPlan: {
            Standard: {
              shareholder: { totalPaid: 12000, count: 3, average: 4000 },
              nonShareholder: { totalPaid: 12000, count: 3, average: 4000 },
            },
          },
        }}
        onDrilldown={vi.fn()}
      />,
    );

    expect(screen.getByText(/Balanced averages/i)).toBeInTheDocument();
    expect(screen.getByText(/No material shareholder spread/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No gap drilldown available/i })).toBeDisabled();
  });
});
