import { jest } from "@jest/globals";
import { buildDashboardOperationalReadinessSnapshot } from "../services/dashboardOperationalReadinessService.js";

const createFetchResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? "OK" : "ERROR",
  text: async () => JSON.stringify(body),
});

describe("dashboard operational readiness service", () => {
  test("returns a healthy readiness surface when services, parity, and queue are aligned", async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes("/integrations")) {
        return createFetchResponse({
          status: "healthy",
          integrations: [{ healthy: true, message: "Payroll internal API reachable" }],
        });
      }
      return createFetchResponse({
        status: "healthy",
        services: {
          mongodb: { ready: true },
          mysql: { ready: true },
        },
      });
    });

    const executiveBriefBuilder = jest.fn().mockResolvedValue({
      access: { canAccessIntegrationQueue: true },
      freshness: {
        readiness: {
          status: "current",
          label: "Current",
          note: "Auto 30m",
          summary: "Summaries current",
          detail: "Core summaries are within the freshness window.",
          actionLabel: "Refresh data",
        },
      },
      integration: {
        accessible: true,
        severity: "healthy",
        metrics: {
          actionable: 0,
          backlog: 0,
          oldestPendingAgeMinutes: 0,
        },
      },
    });
    const reconciliationBuilder = jest.fn().mockResolvedValue({
      status: "healthy",
      checkedAt: "2026-04-22T09:00:00.000Z",
      summary: {
        sourceEmployeeCount: 500006,
        downstreamCoveredEmployeeCount: 500006,
        missingInPayrollCount: 0,
        extraInPayrollCount: 0,
        duplicateActivePayrollCount: 0,
        payRateMismatchCount: 0,
        issueCount: 0,
        parityRate: 100,
      },
    });

    const snapshot = await buildDashboardOperationalReadinessSnapshot({
      userId: "admin-user-id",
      year: 2026,
      fetchImpl,
      executiveBriefBuilder,
      reconciliationBuilder,
      serviceEndpoints: {
        dashboard: { key: "dashboard", label: "Dashboard", url: "http://dashboard.test/api/health" },
        sa: { key: "sa", label: "SA", url: "http://sa.test/api/health" },
        payroll: { key: "payroll", label: "Payroll", url: "http://payroll.test/api/health" },
      },
      integrationHealthUrl: "http://sa.test/api/health/integrations",
    });

    expect(snapshot.overall).toEqual(expect.objectContaining({
      status: "healthy",
      label: "Ready",
    }));
    expect(snapshot.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "services",
        status: "healthy",
        metric: "3/3",
      }),
      expect.objectContaining({
        key: "parity",
        status: "healthy",
        metric: "100.0%",
      }),
      expect.objectContaining({
        key: "queue",
        status: "healthy",
        metric: "0",
      }),
    ]));
  });

  test("escalates readiness when service health or parity drift fails the trust loop", async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (String(url).includes("payroll.test")) {
        throw new Error("connect ECONNREFUSED 127.0.0.1:4100");
      }
      if (String(url).includes("/integrations")) {
        return createFetchResponse({
          status: "degraded",
          integrations: [{ healthy: false, message: "Payroll internal API timeout" }],
        }, 503);
      }
      return createFetchResponse({
        status: "healthy",
        services: {
          mongodb: { ready: true },
        },
      });
    });

    const snapshot = await buildDashboardOperationalReadinessSnapshot({
      userId: "admin-user-id",
      year: 2026,
      fetchImpl,
      executiveBriefBuilder: async () => ({
        access: { canAccessIntegrationQueue: true },
        freshness: {
          readiness: {
            status: "refresh_lag",
            label: "Refresh lag",
            note: "Auto 30m",
            summary: "Summary refresh lag",
            detail: "One or more summary datasets are stale.",
            actionLabel: "Rebuild summaries",
          },
        },
        integration: {
          accessible: true,
          severity: "warning",
          metrics: {
            actionable: 6,
            backlog: 9,
            oldestPendingAgeMinutes: 14,
          },
        },
      }),
      reconciliationBuilder: async () => ({
        status: "attention",
        checkedAt: "2026-04-22T09:00:00.000Z",
        summary: {
          sourceEmployeeCount: 500006,
          downstreamCoveredEmployeeCount: 500001,
          missingInPayrollCount: 3,
          extraInPayrollCount: 1,
          duplicateActivePayrollCount: 0,
          payRateMismatchCount: 4,
          issueCount: 8,
          parityRate: 99.2,
        },
      }),
      serviceEndpoints: {
        dashboard: { key: "dashboard", label: "Dashboard", url: "http://dashboard.test/api/health" },
        sa: { key: "sa", label: "SA", url: "http://sa.test/api/health" },
        payroll: { key: "payroll", label: "Payroll", url: "http://payroll.test/api/health" },
      },
      integrationHealthUrl: "http://sa.test/api/health/integrations",
    });

    expect(snapshot.overall).toEqual(expect.objectContaining({
      status: "critical",
      label: "Action needed",
    }));
    expect(snapshot.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "services",
        status: "critical",
      }),
      expect.objectContaining({
        key: "summaries",
        status: "warning",
      }),
      expect.objectContaining({
        key: "parity",
        status: "critical",
      }),
      expect.objectContaining({
        key: "queue",
        status: "critical",
      }),
    ]));
  });
});
