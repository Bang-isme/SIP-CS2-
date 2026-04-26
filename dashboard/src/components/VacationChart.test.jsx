import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import VacationChart from './VacationChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="pie-cell" />,
  Tooltip: () => null,
}));

const vacationData = {
  totals: { current: 120, previous: 100 },
  byShareholder: {
    shareholder: { current: 45, previous: 35 },
    nonShareholder: { current: 75, previous: 65 },
  },
  byGender: {
    Male: { current: 40, previous: 38 },
    Female: { current: 68, previous: 54 },
    Other: { current: 12, previous: 8 },
  },
  byEmploymentType: {
    'Full-time': { current: 96, previous: 82 },
    'Part-time': { current: 24, previous: 18 },
  },
  byEthnicity: {
    Hispanic: { current: 20, previous: 18 },
    Asian: { current: 18, previous: 14 },
    Caucasian: { current: 28, previous: 22 },
    'African American': { current: 24, previous: 21 },
    Other: { current: 16, previous: 10 },
  },
};

describe('VacationChart', () => {
  it('shows every composition segment and keeps scope separate from the mode badge', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(<VacationChart data={vacationData} departmentScope="IT Support" onDrilldown={onDrilldown} />);

    await user.click(screen.getByRole('tab', { name: /Ethnicity/i }));

    expect(screen.getByText(/^Composition$/i)).toBeInTheDocument();
    expect(screen.getByText(/IT Support scope/i)).toBeInTheDocument();
    expect(screen.queryByText(/Within IT Support/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Composition view/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByText(/Segments/i)).toBeInTheDocument();
    expect(screen.queryByText(/Key signals/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Caucasian · 26\.4%/i)).toBeInTheDocument();
    expect(screen.getByText(/26\.4% \| PY 22 days/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open drilldown for Hispanic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open drilldown for Asian/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open drilldown for Caucasian/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open drilldown for African American/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open drilldown for Other/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open drilldown for Hispanic/i }));

    expect(onDrilldown).toHaveBeenCalledWith({ ethnicity: 'Hispanic' });
  });

  it('opens a drilldown from the top-segment insight card', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(<VacationChart data={vacationData} onDrilldown={onDrilldown} />);

    await user.click(screen.getByRole('button', { name: /Open top segment drilldown/i }));

    expect(onDrilldown).toHaveBeenCalledWith({ isShareholder: 'false' });
  });

  it('uses a baseline card instead of a change card when there is no previous-year total', () => {
    const noBaselineData = {
      ...vacationData,
      byShareholder: {
        shareholder: { current: 45, previous: 0 },
        nonShareholder: { current: 75, previous: 0 },
      },
    };

    render(<VacationChart data={noBaselineData} onDrilldown={vi.fn()} />);

    expect(screen.getByText(/^Baseline$/i)).toBeInTheDocument();
    expect(screen.getByText(/No PY baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/Lead margin: 30 days/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Change$/i)).not.toBeInTheDocument();
  });
});
