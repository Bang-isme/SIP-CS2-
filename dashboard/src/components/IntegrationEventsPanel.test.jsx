import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import IntegrationEventsPanel from "./IntegrationEventsPanel";
import {
  getIntegrationEvents,
  getIntegrationMetrics,
  retryIntegrationEvent,
  retryDeadIntegrationEvents,
  recoverStuckIntegrationEvents,
  replayIntegrationEvents,
} from "../services/api";

vi.mock("../services/api", () => ({
  getIntegrationEvents: vi.fn(),
  getIntegrationMetrics: vi.fn(),
  retryIntegrationEvent: vi.fn(),
  retryDeadIntegrationEvents: vi.fn(),
  recoverStuckIntegrationEvents: vi.fn(),
  replayIntegrationEvents: vi.fn(),
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
    retryIntegrationEvent.mockResolvedValue({ success: true });
    retryDeadIntegrationEvents.mockResolvedValue({ success: true });
    recoverStuckIntegrationEvents.mockResolvedValue({
      success: true,
      message: "Recovered 2 stale PROCESSING events",
    });
    replayIntegrationEvents.mockResolvedValue({ success: true, message: "Replay queued" });
  });

  it("shows stuck processing warning and recover control", async () => {
    render(<IntegrationEventsPanel />);

    expect(await screen.findByText(/processing events are past the 15m recovery threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/Stuck PR 2/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PROCESSING" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recover stale processing events/i })).toBeEnabled();
  });

  it("recovers stale processing events and refreshes queue state", async () => {
    const user = userEvent.setup();
    render(<IntegrationEventsPanel />);

    const button = await screen.findByRole("button", { name: /Recover stale processing events/i });
    await user.click(button);

    await waitFor(() => {
      expect(recoverStuckIntegrationEvents).toHaveBeenCalledTimes(1);
    });
    expect(getIntegrationEvents).toHaveBeenCalledTimes(2);
    expect(getIntegrationMetrics).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/Recovered 2 stale PROCESSING events/i)).toBeInTheDocument();
  });
});
