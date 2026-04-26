import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EarningsChart from './EarningsChart';

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

const earningsData = {
  byDepartment: {
    Engineering: { current: 2200000, previous: 1700000 },
    Finance: { current: 1100000, previous: 1350000 },
    Support: { current: 500000, previous: 450000 },
  },
  byShareholder: {
    shareholder: { current: 1600000, previous: 1450000 },
    nonShareholder: { current: 2200000, previous: 2050000 },
  },
  byGender: {
    Male: { current: 1800000, previous: 1600000 },
    Female: { current: 2000000, previous: 1900000 },
  },
  byEthnicity: {
    Asian: { current: 900000, previous: 840000 },
    Hispanic: { current: 1300000, previous: 1180000 },
    Caucasian: { current: 1600000, previous: 1520000 },
  },
  byEmploymentType: {
    'Full-time': { current: 3000000, previous: 2700000 },
    'Part-time': { current: 800000, previous: 800000 },
  },
};

describe('EarningsChart', () => {
  it('surfaces narrative action cards for payroll lead and workforce concentration', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(<EarningsChart data={earningsData} onDrilldown={onDrilldown} />);

    expect(screen.getByText(/57.9% of payroll/i)).toBeInTheDocument();
    expect(screen.getByText(/Lead in employment mix over Part-time/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open payroll lead drilldown/i }));
    expect(onDrilldown).toHaveBeenCalledWith({ department: 'Engineering' });

    await user.click(screen.getByRole('button', { name: /Open workforce mix drilldown/i }));
    expect(onDrilldown).toHaveBeenCalledWith({ employmentType: 'Full-time' });
  });

  it('switches the primary breakdown to the scoped workforce mix when department scope is active', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(
      <EarningsChart
        data={{
          ...earningsData,
          byDepartment: {},
        }}
        departmentScope="Human Resources"
        onDrilldown={onDrilldown}
      />,
    );

    expect(screen.getByText(/78.9% of payroll/i)).toBeInTheDocument();
    expect(screen.getByText(/Segments/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Employment Type$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Top Departments/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open payroll lead drilldown/i }));

    expect(onDrilldown).toHaveBeenCalledWith({ employmentType: 'Full-time' });
  });

  it('uses the leading segment name in breakdown footers instead of the runner-up label', () => {
    render(<EarningsChart data={earningsData} onDrilldown={vi.fn()} />);

    expect(screen.getByText(/Female · 52.6% share/i)).toBeInTheDocument();
    expect(screen.getByText(/Full-time · 78.9% share/i)).toBeInTheDocument();
    expect(screen.queryByText(/\(Male\)/i)).not.toBeInTheDocument();
  });
});
