import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import IntegrationEventsPanel from "./IntegrationEventsPanel";
import PageChromeContext from "../contexts/PageChromeContext";
import {
  getIntegrationEvents,
  getIntegrationMetrics,
  getIntegrationEventAudit,
  getIntegrationReconciliation,
  retryIntegrationEvent,
  retryDeadIntegrationEvents,
  recoverStuckIntegrationEvents,
  replayIntegrationEvents,
  repairIntegrationReconciliation,
} from "../services/api";

vi.mock("../services/api", () => ({
  getIntegrationEvents: vi.fn(),
  getIntegrationMetrics: vi.fn(),
  getIntegrationEventAudit: vi.fn(),
  getIntegrationReconciliation: vi.fn(),
  retryIntegrationEvent: vi.fn(),
  retryDeadIntegrationEvents: vi.fn(),
  recoverStuckIntegrationEvents: vi.fn(),
  replayIntegrationEvents: vi.fn(),
  repairIntegrationReconciliation: vi.fn(),
}));

describe("IntegrationEventsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIntegrationEvents.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pages: 1 },
    });
    getIntegrationMetrics.mockResolvedValue({
      data: {
        counts: {
          PENDING: 1,
          PROCESSING: 3,
          FAILED: 2,
          DEAD: 1,
          SUCCESS: 10,
        },
        backlog: 6,
        actionable: 5,
        stuckProcessingCount: 2,
        healthyProcessingCount: 1,
        processingTimeoutMinutes: 15,
        oldestPendingAgeMinutes: 12,
      },
    });
    getIntegrationEventAudit.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pages: 1, limit: 6 },
    });
    getIntegrationReconciliation.mockResolvedValue({
      data: {
        status: "attention",
        checkedAt: "2026-04-21T08:00:00.000Z",
        summary: {
          sourceEmployeeCount: 500006,
          downstreamCoveredEmployeeCount: 500001,
          missingInPayrollCount: 3,
          extraInPayrollCount: 2,
          duplicateActivePayrollCount: 1,
          payRateMismatchCount: 4,
          issueCount: 10,
          parityRate: 99.2,
        },
        samples: {
          missingInPayroll: ["EMP500004", "EMP500005"],
          extraInPayroll: ["EMP900001"],
          duplicateActivePayroll: ["EMP123456"],
          payRateMismatch: [
            { employeeId: "EMP100001", sourcePayRate: 120000, payrollPayRate: 118000 },
          ],
        },
      },
    });
    retryIntegrationEvent.mockResolvedValue({ success: true });
    retryDeadIntegrationEvents.mockResolvedValue({ success: true });
    recoverStuckIntegrationEvents.mockResolvedValue({
      success: true,
      message: "Recovered 2 stale PROCESSING events",
    });
    replayIntegrationEvents.mockResolvedValue({ success: true, message: "Replay queued" });
    repairIntegrationReconciliation.mockResolvedValue({
      success: true,
      message: "Payroll extras repaired",
      data: {
        repairedEmployeeIds: ["EMP900001"],
        deactivatedCount: 1,
        remainingExtraCount: 0,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows stuck processing warning and recover control", async () => {
    render(<IntegrationEventsPanel />);

    expect(await screen.findByText(/Queue watch/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Parity snapshot/i })).toBeInTheDocument();
    expect(screen.getByText(/Recovery controls/i)).toBeInTheDocument();
    expect(await screen.findByText(/processing items exceeded the 15m recovery threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/Stuck 2/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PROCESSING" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recover stale processing events/i })).toBeEnabled();
  });

  it("shows reconciliation status and issue samples for operators", async () => {
    render(<IntegrationEventsPanel />);

    expect(await screen.findByRole('heading', { name: /Parity snapshot/i })).toBeInTheDocument();
    expect(screen.getByText(/Needs attention/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing in payroll/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/EMP500004/i)).toBeInTheDocument();
    expect(screen.getByText(/EMP100001/i)).toBeInTheDocument();
    expect(screen.getByText(/\$120,000/i)).toBeInTheDocument();
    expect(screen.getByText(/\$118,000/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Repair payroll extras/i })).toBeInTheDocument();
  });

  it("does not mark parity aligned before the parity snapshot resolves", async () => {
    getIntegrationReconciliation.mockReturnValue(new Promise(() => {}));

    render(<IntegrationEventsPanel />);

    expect(await screen.findByRole('heading', { name: /Parity snapshot/i })).toBeInTheDocument();
    expect(screen.getByText(/Checking parity/i)).toBeInTheDocument();
    expect(screen.getByText(/Loading parity snapshot/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Aligned$/i)).not.toBeInTheDocument();
  });

  it("repairs extra active payroll rows from the parity snapshot", async () => {
    const user = userEvent.setup();
    render(<IntegrationEventsPanel />);

    await user.click(await screen.findByRole("button", { name: /Repair payroll extras/i }));

    expect(await screen.findByText(/Confirm payroll repair/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Confirm Repair/i }));

    await waitFor(() => {
      expect(repairIntegrationReconciliation).toHaveBeenCalledTimes(1);
    });
    expect(getIntegrationReconciliation).toHaveBeenCalledTimes(2);
    expect(getIntegrationReconciliation).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(await screen.findByText(/Payroll extras repaired/i)).toBeInTheDocument();
  });

  it('registers a queue-scoped header refresh action', async () => {
    const setPageRefreshConfig = vi.fn();

    render(
      <PageChromeContext.Provider value={{ setPageRefreshConfig }}>
        <IntegrationEventsPanel />
      </PageChromeContext.Provider>,
    );

    await screen.findByText(/Queue watch/i);

    expect(setPageRefreshConfig).toHaveBeenCalledWith(expect.objectContaining({
      label: 'Refresh operations',
      refreshing: expect.any(Boolean),
      onRefresh: expect.any(Function),
    }));
  });

  it("recovers stale processing events and refreshes queue state", async () => {
    const user = userEvent.setup();
    render(<IntegrationEventsPanel />);

    const button = await screen.findByRole("button", { name: /Recover stale processing events/i });
    await user.click(button);

    expect(await screen.findByText(/Confirm recovery/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Confirm Recover/i }));

    await waitFor(() => {
      expect(recoverStuckIntegrationEvents).toHaveBeenCalledTimes(1);
    });
    expect(getIntegrationEvents).toHaveBeenCalledTimes(2);
    expect(getIntegrationMetrics).toHaveBeenCalledTimes(2);
    expect(getIntegrationReconciliation).toHaveBeenCalledTimes(2);
    expect(getIntegrationReconciliation).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(await screen.findByText(/Recovered 2 stale PROCESSING events/i)).toBeInTheDocument();
  });

  it('shows guided empty-state actions when the queue is empty', async () => {
    render(<IntegrationEventsPanel />);

    expect(await screen.findByText(/No failed items right now\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /See all statuses/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh queue/i })).toBeInTheDocument();
  });

  it("auto-refreshes the queue while the page remains visible", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<IntegrationEventsPanel />);

    expect(await screen.findByText(/No failed items right now\./i)).toBeInTheDocument();
    expect(getIntegrationEvents).toHaveBeenCalledTimes(1);
    expect(getIntegrationMetrics).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    await waitFor(() => {
      expect(getIntegrationEvents).toHaveBeenCalledTimes(2);
      expect(getIntegrationMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('requires confirmation before retrying a failed event', async () => {
    const user = userEvent.setup();
    getIntegrationEvents.mockResolvedValueOnce({
      data: [
        {
          id: 17,
          entity_type: 'employee',
          entity_id: 'EMP1001',
          action: 'UPDATE',
          status: 'FAILED',
          attempts: 2,
          updatedAt: '2026-04-18T10:00:00.000Z',
        },
      ],
      meta: { total: 1, page: 1, pages: 1 },
    });

    render(<IntegrationEventsPanel />);

    const retryButton = await screen.findByRole('button', { name: /Retry event 17/i });
    await user.click(retryButton);

    expect(await screen.findByText(/Confirm retry for event #17/i)).toBeInTheDocument();
    expect(retryIntegrationEvent).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Confirm Retry/i }));

    await waitFor(() => {
      expect(retryIntegrationEvent).toHaveBeenCalledWith(17);
    });
    expect(getIntegrationReconciliation).toHaveBeenCalledTimes(2);
    expect(getIntegrationReconciliation).toHaveBeenLastCalledWith({ forceRefresh: true });
  });

  it('loads operator audit history for a selected event', async () => {
    const user = userEvent.setup();
    getIntegrationEvents.mockResolvedValueOnce({
      data: [
        {
          id: 17,
          entity_type: 'employee',
          entity_id: 'EMP1001',
          action: 'UPDATE',
          status: 'FAILED',
          attempts: 2,
          updatedAt: '2026-04-18T10:00:00.000Z',
        },
      ],
      meta: { total: 1, page: 1, pages: 1 },
    });
    getIntegrationEventAudit.mockResolvedValueOnce({
      data: [
        {
          id: 91,
          operator_action: 'retry-event',
          operator_actor_id: 'admin-1',
          operator_request_id: 'req-123',
          source_status: 'FAILED',
          target_status: 'PENDING',
          createdAt: '2026-04-18T10:02:00.000Z',
          details: {
            scope: 'single-event',
            entityType: 'employee',
            entityId: 'EMP1001',
            eventAction: 'UPDATE',
          },
        },
      ],
      meta: { total: 1, page: 1, pages: 1, limit: 6 },
    });

    render(<IntegrationEventsPanel />);

    await user.click(await screen.findByRole('button', { name: /View audit for event 17/i }));

    expect(getIntegrationEventAudit).toHaveBeenCalledWith(17, { limit: 6 });
    expect(await screen.findByText(/Audit trail/i)).toBeInTheDocument();
    expect(screen.getByText(/Event #17 • employee:EMP1001/i)).toBeInTheDocument();
    expect(screen.getByText(/Retry event/i)).toBeInTheDocument();
    expect(screen.getByText(/FAILED -> PENDING/i)).toBeInTheDocument();
    expect(screen.getByText(/Actor admin-1/i)).toBeInTheDocument();
    expect(screen.getByText(/req-123/i)).toBeInTheDocument();
    expect(screen.getByText(/Scope single-event/i)).toBeInTheDocument();
    expect(screen.getByText(/Action UPDATE/i)).toBeInTheDocument();
  });

  it('shows an inline error when audit history lookup fails', async () => {
    const user = userEvent.setup();
    getIntegrationEvents.mockResolvedValueOnce({
      data: [
        {
          id: 17,
          entity_type: 'employee',
          entity_id: 'EMP1001',
          action: 'UPDATE',
          status: 'FAILED',
          attempts: 2,
          updatedAt: '2026-04-18T10:00:00.000Z',
        },
      ],
      meta: { total: 1, page: 1, pages: 1 },
    });
    getIntegrationEventAudit.mockRejectedValueOnce(new Error('Audit history failed'));

    render(<IntegrationEventsPanel />);

    await user.click(await screen.findByRole('button', { name: /View audit for event 17/i }));

    expect(await screen.findByText(/Audit trail unavailable\./i)).toBeInTheDocument();
    expect(screen.getByText(/Audit history failed/i)).toBeInTheDocument();
  });

  it('refreshes parity after replaying failed or dead items', async () => {
    const user = userEvent.setup();
    render(<IntegrationEventsPanel />);

    await user.click(await screen.findByRole('button', { name: /Show replay filters/i }));
    await user.click(screen.getByRole('button', { name: /Replay filtered failed or dead events/i }));
    expect(await screen.findByText(/Confirm replay request/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirm Replay/i }));

    await waitFor(() => {
      expect(replayIntegrationEvents).toHaveBeenCalledTimes(1);
    });
    expect(getIntegrationReconciliation).toHaveBeenCalledTimes(2);
    expect(getIntegrationReconciliation).toHaveBeenLastCalledWith({ forceRefresh: true });
  });
});
