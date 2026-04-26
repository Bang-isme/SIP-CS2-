import { render, screen } from '@testing-library/react';
import DashboardHeader from './DashboardHeader';

describe('DashboardHeader', () => {
  it('renders session status alongside system state for authenticated operators', () => {
    render(
      <DashboardHeader
        pageTitle="Employee Administration"
        currentYear={2026}
        globalFreshness={{ css: 'fresh', label: 'Fresh', tooltip: 'Updated recently.' }}
        freshnessReadiness={{
          summary: 'Summaries current',
          note: 'Auto 30m',
          detail: 'Core summaries are current and auto-refresh every 30 minutes.',
        }}
        lastUpdatedAt="2026-04-18T00:00:00.000Z"
        refreshing={false}
        sessionStatus={{
          label: 'Session restored',
          css: 'stable',
          tooltip: 'Your workspace session was restored successfully.',
        }}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByRole('group', { name: /Workspace status/i })).toBeInTheDocument();
    expect(screen.getByText(/Session restored/i)).toBeInTheDocument();
    expect(screen.getByText(/Live/i)).toBeInTheDocument();
    expect(screen.getByText(/Summaries current/i)).toBeInTheDocument();
  });
});
