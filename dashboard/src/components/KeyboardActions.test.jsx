import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EarningsChart from './EarningsChart';
import VacationChart from './VacationChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: ({ children }) => <div>{children}</div>,
  Cell: () => <div />,
}));

describe('Keyboard interactions for drilldown controls', () => {
  it('activates earnings department row via keyboard', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(
      <EarningsChart
        data={{
          byDepartment: {
            Engineering: { current: 120000, previous: 110000 },
            Finance: { current: 100000, previous: 98000 },
          },
          byShareholder: {
            shareholder: { current: 100000 },
            nonShareholder: { current: 120000 },
          },
          byGender: {
            Male: { current: 120000 },
            Female: { current: 100000 },
          },
          byEthnicity: {
            Asian: { current: 80000 },
            Caucasian: { current: 140000 },
          },
          byEmploymentType: {
            'Full-time': { current: 210000 },
            'Part-time': { current: 10000 },
          },
        }}
        onDrilldown={onDrilldown}
      />,
    );

    const departmentButton = screen
      .getAllByRole('button', { name: /Open drilldown for Engineering/i })
      .find((button) => button.classList.contains('dept-row'));

    if (!departmentButton) {
      throw new Error('Department drilldown button not found');
    }
    departmentButton.focus();
    await user.keyboard('{Enter}');

    expect(onDrilldown).toHaveBeenCalledWith({ department: 'Engineering' });
  });

  it('activates vacation segment row via keyboard', async () => {
    const user = userEvent.setup();
    const onDrilldown = vi.fn();

    render(
      <VacationChart
        data={{
          byShareholder: {
            shareholder: { current: 40 },
            nonShareholder: { current: 80 },
          },
          byGender: {
            Male: { current: 60 },
            Female: { current: 60 },
          },
          byEmploymentType: {
            'Full-time': { current: 100 },
            'Part-time': { current: 20 },
          },
          byEthnicity: {
            Asian: { current: 25 },
            Caucasian: { current: 95 },
          },
        }}
        onDrilldown={onDrilldown}
      />,
    );

    const vacationButton = screen.getByRole('button', { name: /Open drilldown for Shareholders/i });
    vacationButton.focus();
    await user.keyboard('{Enter}');

    expect(onDrilldown).toHaveBeenCalledWith({ isShareholder: 'true' });
  });
});
