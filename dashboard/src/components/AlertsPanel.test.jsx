import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AlertsPanel from './AlertsPanel';
import api, { acknowledgeAlert } from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
  acknowledgeAlert: vi.fn(),
}));

describe('AlertsPanel benefits change flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          employees: [
            {
              employeeId: 'EMP001',
              name: 'Amy Adams',
              extraData: JSON.stringify({
                p: 'Premium Health',
                pc: 1,
                a: 5400,
                c: '2026-03-18',
                e: '2026-03-22',
                i: 'scheduled_payroll_deduction',
              }),
            },
          ],
          meta: {
            total: 1,
            totalPages: 1,
          },
        },
      },
    });
    acknowledgeAlert.mockResolvedValue({
      data: {
        alertId: 'alert-benefits-1',
        acknowledgement: {
          status: 'current',
          needsReview: false,
          note: 'Payroll notified and deduction owner assigned.',
          acknowledgedAt: '2026-04-02T01:00:00.000Z',
          acknowledgedCount: 6,
          currentCount: 6,
          acknowledgedBy: {
            _id: 'moderator-1',
            username: 'opslead',
            email: 'opslead@example.com',
          },
        },
      },
    });
  });

  it('renders payroll-impact details for benefits alerts in preview and modal', async () => {
    const user = userEvent.setup();
    const onAlertAcknowledged = vi.fn();
    const note = 'Payroll owner assigned.';

    render(
      <AlertsPanel
        canManageAlerts
        onAlertAcknowledged={onAlertAcknowledged}
        alerts={[
          {
            alert: { _id: 'alert-benefits-1', type: 'benefits_change', name: 'Benefits Change Impact' },
            count: 6,
            matchingEmployees: [
              {
                employeeId: 'EMP001',
                name: 'Amy Adams',
                extraData: JSON.stringify({
                  p: 'Premium Health',
                  pc: 1,
                  a: 5400,
                  c: '2026-03-18',
                  e: '2026-03-22',
                  i: 'scheduled_payroll_deduction',
                }),
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: /Benefits Payroll Impact/i })).toBeInTheDocument();
    expect(screen.getByText(/Premium Health \| \$5,400\/yr/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /View Record \(6\)/i }));

    expect(await screen.findByRole('columnheader', { name: /Payroll Impact/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/alerts/benefits_change/employees', {
        params: { page: 1, limit: 50 },
      });
    });
    expect(await screen.findByText(/Deduction update effective Mar 22/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Acknowledgement note/i), {
      target: { value: note },
    });
    await user.click(screen.getByRole('button', { name: /Save Note/i }));

    await waitFor(() => {
      expect(acknowledgeAlert).toHaveBeenCalledWith('alert-benefits-1', {
        note,
      });
    });
    expect(await screen.findByText(/Owner note saved\./i)).toBeInTheDocument();
    expect(onAlertAcknowledged).toHaveBeenCalledWith(
      'alert-benefits-1',
      expect.objectContaining({
        note: 'Payroll notified and deduction owner assigned.',
      }),
    );
  });

  it('opens low-count cards so single-record alerts are still reviewable', async () => {
    const user = userEvent.setup();

    render(
      <AlertsPanel
        alerts={[
          {
            alert: { _id: 'alert-benefits-1', type: 'benefits_change', name: 'Benefits Change Impact' },
            count: 1,
            matchingEmployees: [
              {
                employeeId: 'EMP001',
                name: 'Chloe Davis',
                extraData: JSON.stringify({
                  p: 'Basic Health',
                  pc: 1,
                  a: 2400,
                  c: '2026-04-01',
                  e: '2026-04-08',
                  i: 'scheduled_payroll_deduction',
                }),
              },
            ],
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Open Detail/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /Payroll Impact/i })).toBeInTheDocument();
  });

  it('opens the matching alert modal when requested from the dashboard follow-up queue', async () => {
    const onRequestedAlertHandled = vi.fn();

    render(
      <AlertsPanel
        canManageAlerts
        requestedAlertOpen={{ alertId: 'alert-benefits-1', token: 1 }}
        onRequestedAlertHandled={onRequestedAlertHandled}
        alerts={[
          {
            alert: { _id: 'alert-benefits-1', type: 'benefits_change', name: 'Benefits Change Impact' },
            count: 6,
            matchingEmployees: [],
          },
        ]}
      />,
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /Payroll Impact/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(onRequestedAlertHandled).toHaveBeenCalledWith('alert-benefits-1', true);
    });
  });

  it('locks body scroll while the detail modal is open', async () => {
    const user = userEvent.setup();

    render(
      <AlertsPanel
        alerts={[
          {
            alert: { _id: 'alert-benefits-1', type: 'benefits_change', name: 'Benefits Change Impact' },
            count: 6,
            matchingEmployees: [],
          },
        ]}
      />,
    );

    expect(document.body.style.overflow).toBe('');
    await user.click(screen.getByRole('button', { name: /View Record \(6\)/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: /Close alert details/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('shows threshold context for vacation alerts in the preview rows', () => {
    render(
      <AlertsPanel
        alerts={[
          {
            alert: { _id: 'alert-vacation-1', type: 'vacation', name: 'High Vacation Balance', threshold: 20 },
            count: 3,
            matchingEmployees: [
              {
                employeeId: 'EMP101',
                name: 'Nora Adams',
                vacationDays: 26,
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText(/\+6 d over threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/26 d/i)).toBeInTheDocument();
  });
});
