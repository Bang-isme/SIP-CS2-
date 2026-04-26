import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import AnalyticsDrilldownPage from './AnalyticsDrilldownPage';

vi.mock('../components/DrilldownModal', () => ({
  default: ({ filters, onClose, variant }) => (
    <div data-testid="drilldown-workspace">
      <span data-testid="drilldown-variant">{variant}</span>
      <span data-testid="drilldown-filters">{JSON.stringify(filters)}</span>
      <button type="button" onClick={onClose}>Back to analytics</button>
    </div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="route-probe">{location.pathname}{location.search}</div>
  );
}

describe('AnalyticsDrilldownPage', () => {
  it('renders the drilldown workspace in page mode using route query filters', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/analytics/drilldown?context=benefits&department=Engineering&benefitPlan=Standard&foo=bar']}>
        <Routes>
          <Route path="/dashboard/analytics/drilldown" element={<AnalyticsDrilldownPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelector('.dashboard-page-stack--drilldown')).toBeInTheDocument();
    expect(screen.getByTestId('drilldown-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('drilldown-variant')).toHaveTextContent('page');
    expect(screen.getByTestId('drilldown-filters')).toHaveTextContent('"context":"benefits"');
    expect(screen.getByTestId('drilldown-filters')).toHaveTextContent('"department":"Engineering"');
    expect(screen.getByTestId('drilldown-filters')).toHaveTextContent('"benefitPlan":"Standard"');
  });

  it('returns to analytics and preserves unrelated query params when closing the page workflow', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard/analytics/drilldown?foo=bar&context=earnings&department=Engineering']}>
        <>
          <Routes>
            <Route path="/dashboard/analytics" element={<div>Analytics landing</div>} />
            <Route path="/dashboard/analytics/drilldown" element={<AnalyticsDrilldownPage />} />
          </Routes>
          <LocationProbe />
        </>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /back to analytics/i }));

    expect(screen.getByText(/Analytics landing/i)).toBeInTheDocument();
    expect(screen.getByTestId('route-probe')).toHaveTextContent('/dashboard/analytics?foo=bar');
  });
});
