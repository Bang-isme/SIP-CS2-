import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import OperationalReadinessPanel from './OperationalReadinessPanel';

describe('OperationalReadinessPanel', () => {
  it('renders readiness cards and routes card actions through the callback', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onAction = vi.fn();

    render(
      <OperationalReadinessPanel
        operationalReadiness={{
          checkedAt: '2026-04-22T09:15:00.000Z',
          overall: {
            status: 'warning',
            label: 'Monitor',
            summary: '1 check needs review.',
          },
          cards: [
            {
              key: 'services',
              label: 'Services',
              status: 'healthy',
              metric: '3/3',
              headline: 'All runtimes reachable',
              detail: 'Dashboard, SA, and Payroll health checks are responding.',
            },
            {
              key: 'parity',
              label: 'Parity',
              status: 'critical',
              metric: '99.2%',
              headline: 'Parity drift detected',
              detail: 'Missing 3 / Drift 4 / Extra 1',
              actionKey: 'open-ops',
              actionLabel: 'Open ops',
            },
          ],
        }}
        operationalReadinessError=""
        loadingOperationalReadiness={false}
        onRefresh={onRefresh}
        onAction={onAction}
      />,
    );

    expect(screen.getByRole('heading', { name: /Operational readiness/i })).toBeInTheDocument();
    expect(screen.getByText(/1 check needs review/i)).toBeInTheDocument();
    expect(screen.getByText(/All runtimes reachable/i)).toBeInTheDocument();
    expect(screen.getByText(/Parity drift detected/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open ops/i }));
    expect(onAction).toHaveBeenCalledWith('open-ops');

    await user.click(screen.getByRole('button', { name: /Refresh readiness/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows the loading copy without mojibake', () => {
    render(
      <OperationalReadinessPanel
        operationalReadiness={null}
        operationalReadinessError=""
        loadingOperationalReadiness
        onRefresh={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText('Loading readiness checks...')).toBeInTheDocument();
  });
});
