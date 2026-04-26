import { useLocation, MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AnalyticsPage from './AnalyticsPage';
import { DashboardDataContext } from '../contexts/DashboardDataContext';
import {
  exportDrilldownCsv,
  getBenefitsSummary,
  getDepartments,
  getDrilldown,
  getEarningsSummary,
  getVacationSummary,
} from '../services/api';

vi.mock('../services/api', () => ({
  getDrilldown: vi.fn(),
  getDepartments: vi.fn(),
  getBenefitsSummary: vi.fn(),
  getEarningsSummary: vi.fn(),
  getVacationSummary: vi.fn(),
  exportDrilldownCsv: vi.fn(),
}));

vi.mock('react-window', () => ({
  FixedSizeList: ({ itemCount, children }) => (
    <div>
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index}>{children({ index, style: {} })}</div>
      ))}
    </div>
  ),
}));

vi.mock('../components/ChartsSection', () => ({
  default: ({ onContextDrilldown }) => (
    <div>
      <span data-testid="charts-section-mock">charts</span>
      <button type="button" onClick={() => onContextDrilldown('vacation')}>
        Open Vacation Drilldown
      </button>
    </div>
  ),
}));

vi.mock('../components/DrilldownModal', () => ({
  default: ({ filters, onClose }) => (
    <div role="dialog" aria-modal="true">
      <span data-testid="drilldown-filters">
        {JSON.stringify(filters)}
      </span>
      <button type="button" onClick={onClose} aria-label="Close drilldown">
        Close drilldown
      </button>
    </div>
  ),
}));

const dashboardContext = {
  earnings: { byDepartment: {}, byShareholder: {}, byGender: {}, byEthnicity: {}, byEmploymentType: {} },
  vacation: { totals: { current: 0, previous: 0 }, byShareholder: {}, byGender: {}, byEthnicity: {}, byEmploymentType: {} },
  benefits: { byShareholder: {}, byPlan: {} },
  loadingEarnings: false,
  loadingVacation: false,
  loadingBenefits: false,
  earningsError: '',
  vacationError: '',
  benefitsError: '',
  earningsFreshness: { css: 'fresh', tooltip: 'Updated recently', label: 'Fresh' },
  vacationFreshness: { css: 'fresh', tooltip: 'Updated recently', label: 'Fresh' },
  benefitsFreshness: { css: 'fresh', tooltip: 'Updated recently', label: 'Fresh' },
  fetchEarnings: vi.fn(),
  fetchVacation: vi.fn(),
  fetchBenefits: vi.fn(),
  currentYear: 2026,
  setCurrentYear: vi.fn(),
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}{location.search}</div>;
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardContext.setCurrentYear.mockReset();
    getDepartments.mockResolvedValue(['Engineering']);
    getEarningsSummary.mockResolvedValue({
      data: { byDepartment: {}, byShareholder: {}, byGender: {}, byEthnicity: {}, byEmploymentType: {} },
      meta: { updatedAt: '2026-04-19T10:00:00.000Z' },
    });
    getVacationSummary.mockResolvedValue({
      data: { totals: { current: 0, previous: 0 }, byShareholder: {}, byGender: {}, byEthnicity: {}, byEmploymentType: {} },
      meta: { updatedAt: '2026-04-19T10:00:00.000Z' },
    });
    getBenefitsSummary.mockResolvedValue({
      data: { byPlan: { Standard: { shareholder: { average: 4000 } } } },
      meta: { updatedAt: '2026-04-19T10:00:00.000Z' },
    });
    getDrilldown.mockResolvedValue({
      data: [],
      meta: { total: 0, pages: 1 },
      summary: { count: 0, totalEarnings: 0, totalBenefits: 0, totalVacation: 0, partial: false },
    });
    exportDrilldownCsv.mockResolvedValue(new Blob(['csv']));
  });

  it('redirects legacy drilldown query params to the page route while preserving unrelated params', async () => {
    render(
      <DashboardDataContext.Provider value={dashboardContext}>
        <MemoryRouter initialEntries={['/dashboard/analytics?foo=bar&drilldown=earnings']}>
          <>
            <Routes>
              <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
              <Route path="/dashboard/analytics/drilldown" element={<div data-testid="drilldown-page">Drilldown page</div>} />
            </Routes>
            <LocationProbe />
          </>
        </MemoryRouter>
      </DashboardDataContext.Provider>,
    );

    expect(await screen.findByTestId('drilldown-page')).toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/dashboard/analytics/drilldown?foo=bar&context=earnings');
  });

  it('ignores invalid drilldown query values', async () => {
    render(
      <DashboardDataContext.Provider value={dashboardContext}>
        <MemoryRouter initialEntries={['/dashboard/analytics?drilldown=invalid']}>
          <Routes>
            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
          </Routes>
        </MemoryRouter>
      </DashboardDataContext.Provider>,
    );

    expect(screen.getByTestId('charts-section-mock')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/Scope:\s*All departments/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Company-wide view across all departments/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(getDepartments).toHaveBeenCalled();
    });
  });

  it('updates the selected reporting year from the filter bar', async () => {
    const user = userEvent.setup();

    render(
      <DashboardDataContext.Provider value={dashboardContext}>
        <MemoryRouter initialEntries={['/dashboard/analytics']}>
          <Routes>
            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
          </Routes>
        </MemoryRouter>
      </DashboardDataContext.Provider>,
    );

    await user.selectOptions(screen.getByLabelText(/reporting year/i), '2025');

    expect(dashboardContext.setCurrentYear).toHaveBeenCalledWith(2025);
  });

  it('applies the selected department scope when opening a drilldown', async () => {
    const user = userEvent.setup();

    render(
      <DashboardDataContext.Provider value={dashboardContext}>
        <MemoryRouter initialEntries={['/dashboard/analytics']}>
          <>
            <Routes>
              <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
              <Route path="/dashboard/analytics/drilldown" element={<div data-testid="drilldown-page">Drilldown page</div>} />
            </Routes>
            <LocationProbe />
          </>
        </MemoryRouter>
      </DashboardDataContext.Provider>,
    );

    await screen.findByRole('option', { name: 'Engineering' });
    getEarningsSummary.mockClear();
    getVacationSummary.mockClear();
    getBenefitsSummary.mockClear();

    await user.selectOptions(screen.getByLabelText(/analytics scope/i), 'Engineering');
    expect(screen.getByText(/Engineering scope/i)).toBeInTheDocument();
    expect(screen.queryByText(/Focused on Engineering across cards and drilldowns/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getEarningsSummary).toHaveBeenCalledWith(2026, expect.objectContaining({ department: 'Engineering' }));
      expect(getVacationSummary).toHaveBeenCalledWith(2026, expect.objectContaining({ department: 'Engineering' }));
      expect(getBenefitsSummary).toHaveBeenCalledWith(expect.objectContaining({ year: 2026, department: 'Engineering' }));
    });

    await user.click(screen.getByRole('button', { name: /open vacation drilldown/i }));

    expect(await screen.findByTestId('drilldown-page')).toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/dashboard/analytics/drilldown?context=vacation&department=Engineering');
  });
});
