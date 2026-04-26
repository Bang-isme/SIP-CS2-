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
            Finance: { current: 90000, previous: 98000 },
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

  it('supports keyboard navigation across earnings mover tabs', async () => {
    const user = userEvent.setup();

    render(
      <EarningsChart
        data={{
          byDepartment: {
            Engineering: { current: 120000, previous: 110000 },
            Finance: { current: 100000, previous: 98000 },
          },
          byShareholder: {
            shareholder: { current: 100000, previous: 95000 },
            nonShareholder: { current: 120000, previous: 110000 },
          },
          byGender: {
            Male: { current: 120000, previous: 115000 },
            Female: { current: 100000, previous: 90000 },
          },
          byEthnicity: {
            Asian: { current: 80000, previous: 76000 },
            Caucasian: { current: 140000, previous: 130000 },
          },
          byEmploymentType: {
            'Full-time': { current: 210000, previous: 200000 },
            'Part-time': { current: 10000, previous: 5000 },
          },
        }}
        onDrilldown={vi.fn()}
      />,
    );

    const declinesTab = screen.getByRole('tab', { name: /Declines/i });
    const smallestTab = screen.getByRole('tab', { name: /Smallest Growth/i });

    const activeTab = screen.getByRole('tab', { selected: true });
    const expectedNextTab = activeTab === declinesTab ? smallestTab : declinesTab;

    expect([declinesTab, smallestTab]).toContain(activeTab);
    activeTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(expectedNextTab).toHaveFocus();
    expect(expectedNextTab).toHaveAttribute('aria-selected', 'true');
  });

  it('supports keyboard navigation across vacation demographic tabs', async () => {
    const user = userEvent.setup();

    render(
      <VacationChart
        data={{
          byShareholder: {
            shareholder: { current: 40, previous: 38 },
            nonShareholder: { current: 80, previous: 75 },
          },
          byGender: {
            Male: { current: 60, previous: 58 },
            Female: { current: 60, previous: 55 },
          },
          byEmploymentType: {
            'Full-time': { current: 100, previous: 95 },
            'Part-time': { current: 20, previous: 18 },
          },
          byEthnicity: {
            Asian: { current: 25, previous: 20 },
            Caucasian: { current: 95, previous: 88 },
          },
        }}
        onDrilldown={vi.fn()}
      />,
    );

    const shareholderTab = screen.getByRole('tab', { name: /Shareholder/i });
    const genderTab = screen.getByRole('tab', { name: /Gender/i });

    expect(shareholderTab).toHaveAttribute('aria-selected', 'true');
    shareholderTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(genderTab).toHaveFocus();
    expect(genderTab).toHaveAttribute('aria-selected', 'true');
  });
});
