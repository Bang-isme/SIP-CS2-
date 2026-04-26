import { jest } from "@jest/globals";

const alertFindMock = jest.fn();
const userFindByIdMock = jest.fn();
const roleFindMock = jest.fn();
const earningsSummaryFindOneMock = jest.fn();
const vacationSummaryFindOneMock = jest.fn();
const benefitsSummaryFindOneMock = jest.fn();
const alertsSummaryFindAllMock = jest.fn();
const cacheGetMock = jest.fn();
const cacheSetMock = jest.fn();
const buildIntegrationMetricsSnapshotMock = jest.fn();

jest.unstable_mockModule("../models/Alert.js", () => ({
  default: {
    find: alertFindMock,
  },
}));

jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findById: userFindByIdMock,
  },
}));

jest.unstable_mockModule("../models/Role.js", () => ({
  default: {
    find: roleFindMock,
  },
}));

jest.unstable_mockModule("../models/sql/index.js", () => ({
  AlertsSummary: {
    findAll: alertsSummaryFindAllMock,
  },
  BenefitsSummary: {
    findOne: benefitsSummaryFindOneMock,
  },
  EarningsSummary: {
    findOne: earningsSummaryFindOneMock,
  },
  VacationSummary: {
    findOne: vacationSummaryFindOneMock,
  },
}));

jest.unstable_mockModule("../utils/cache.js", () => ({
  default: {
    get: cacheGetMock,
    set: cacheSetMock,
  },
}));

jest.unstable_mockModule("../services/integrationMetricsService.js", () => ({
  buildIntegrationMetricsSnapshot: buildIntegrationMetricsSnapshotMock,
}));

const { buildExecutiveBriefSnapshot } = await import("../services/dashboardExecutiveService.js");

const mockLeanChain = (value) => ({
  lean: jest.fn().mockResolvedValue(value),
});

describe("dashboard executive brief service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheGetMock.mockReturnValue(null);
    cacheSetMock.mockImplementation(() => {});
  });

  test("buildExecutiveBriefSnapshot assembles follow-up and queue risk for admin users", async () => {
    const now = Date.now();
    const thirtyMinutesAgo = new Date(now - 30 * 60000).toISOString();
    const fifteenMinutesAgo = new Date(now - 15 * 60000).toISOString();
    const fiveMinutesAgo = new Date(now - 5 * 60000).toISOString();
    const oneHundredMinutesAgo = new Date(now - 100 * 60000).toISOString();

    userFindByIdMock.mockReturnValue(mockLeanChain({
      _id: "user-1",
      roles: ["role-admin"],
    }));
    roleFindMock.mockReturnValue(mockLeanChain([
      { _id: "role-admin", name: "admin" },
    ]));
    earningsSummaryFindOneMock.mockResolvedValue({ computed_at: thirtyMinutesAgo });
    vacationSummaryFindOneMock.mockResolvedValue({ computed_at: fifteenMinutesAgo });
    benefitsSummaryFindOneMock.mockResolvedValue({ computed_at: fiveMinutesAgo });
    alertFindMock.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockLeanChain([
        {
          _id: "vac-1",
          type: "vacation",
          name: "Vacation Threshold",
        },
        {
          _id: "benefits-1",
          type: "benefits_change",
          name: "Benefits Change",
          acknowledgedAt: oneHundredMinutesAgo,
          acknowledgementNote: "Payroll owner assigned.",
          acknowledgedCount: 1,
          acknowledgedSummaryAt: oneHundredMinutesAgo,
          acknowledgedBy: {
            _id: "moderator-1",
            username: "opslead",
            email: "opslead@example.com",
          },
        },
      ])),
    });
    alertsSummaryFindAllMock.mockResolvedValue([
      {
        alert_type: "vacation",
        employee_count: 6,
        computed_at: fiveMinutesAgo,
      },
      {
        alert_type: "benefits_change",
        employee_count: 3,
        computed_at: fifteenMinutesAgo,
      },
    ]);
    buildIntegrationMetricsSnapshotMock.mockResolvedValue({
      actionable: 7,
      backlog: 11,
      oldestPendingAgeMinutes: 18,
      counts: {
        PENDING: 2,
        PROCESSING: 1,
        SUCCESS: 10,
        FAILED: 4,
        DEAD: 3,
      },
    });

    const snapshot = await buildExecutiveBriefSnapshot({
      userId: "user-1",
      year: 2026,
    });

    expect(snapshot.access).toEqual(expect.objectContaining({
      canAccessIntegrationQueue: true,
      effectiveRole: "admin",
    }));
    expect(snapshot.freshness.global).toEqual(expect.objectContaining({
      status: "fresh",
      label: "Fresh",
    }));
    expect(snapshot.freshness.readiness).toEqual(expect.objectContaining({
      status: "current",
      summary: "Summaries current",
      actionMode: "reload",
    }));
    expect(snapshot.alerts.stats).toEqual(expect.objectContaining({
      categories: 2,
      affected: 9,
    }));
    expect(snapshot.alerts.followUp).toEqual(expect.objectContaining({
      needsAttentionCategories: 2,
      needsAttentionEmployees: 9,
      unassignedCategories: 1,
      staleCategories: 1,
      ownedCategories: 0,
      queuePreview: expect.arrayContaining([
        expect.objectContaining({
          alertId: "vac-1",
          status: "unassigned",
          actionLabel: "Assign Owner",
        }),
      ]),
    }));
    expect(snapshot.integration).toEqual(expect.objectContaining({
      accessible: true,
      severity: "warning",
      summaryLabel: "7 actionable / 11 backlog",
    }));
    expect(snapshot.actionCenter).toEqual(expect.objectContaining({
      status: "critical",
      label: "Action Required",
      items: expect.arrayContaining([
        expect.objectContaining({
          key: "review-alert-ownership",
          title: "Alert ownership still has gaps",
        }),
        expect.objectContaining({
          key: "review-queue",
          title: "Outbox recovery needs operator review",
        }),
      ]),
    }));
    expect(cacheSetMock).toHaveBeenCalledTimes(1);
  });

  test("buildExecutiveBriefSnapshot returns cached snapshot without new queries", async () => {
    const cachedSnapshot = {
      freshness: { global: { status: "fresh" } },
    };
    cacheGetMock.mockReturnValue(cachedSnapshot);
    userFindByIdMock.mockReturnValue(mockLeanChain({
      _id: "user-1",
      roles: ["role-admin"],
    }));
    roleFindMock.mockReturnValue(mockLeanChain([
      { _id: "role-admin", name: "admin" },
    ]));

    const snapshot = await buildExecutiveBriefSnapshot({
      userId: "user-1",
      year: 2026,
    });

    expect(snapshot).toBe(cachedSnapshot);
    expect(userFindByIdMock).toHaveBeenCalledTimes(1);
    expect(alertFindMock).not.toHaveBeenCalled();
    expect(buildIntegrationMetricsSnapshotMock).not.toHaveBeenCalled();
  });

  test("buildExecutiveBriefSnapshot stays ready when active alerts already have current owners", async () => {
    const now = Date.now();
    const twentyMinutesAgo = new Date(now - 20 * 60000).toISOString();
    const tenMinutesAgo = new Date(now - 10 * 60000).toISOString();
    const fiveMinutesAgo = new Date(now - 5 * 60000).toISOString();

    userFindByIdMock.mockReturnValue(mockLeanChain({
      _id: "user-1",
      roles: ["role-admin"],
    }));
    roleFindMock.mockReturnValue(mockLeanChain([
      { _id: "role-admin", name: "admin" },
    ]));
    earningsSummaryFindOneMock.mockResolvedValue({ computed_at: twentyMinutesAgo });
    vacationSummaryFindOneMock.mockResolvedValue({ computed_at: tenMinutesAgo });
    benefitsSummaryFindOneMock.mockResolvedValue({ computed_at: fiveMinutesAgo });
    alertFindMock.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockLeanChain([
        {
          _id: "vac-1",
          type: "vacation",
          name: "Vacation Threshold",
          acknowledgedAt: fiveMinutesAgo,
          acknowledgementNote: "Queue reviewed and owned.",
          acknowledgedCount: 6,
          acknowledgedSummaryAt: fiveMinutesAgo,
          acknowledgedBy: {
            _id: "moderator-1",
            username: "opslead",
            email: "opslead@example.com",
          },
        },
        {
          _id: "benefits-1",
          type: "benefits_change",
          name: "Benefits Change",
          acknowledgedAt: tenMinutesAgo,
          acknowledgementNote: "Benefits impacts checked for the current snapshot.",
          acknowledgedCount: 3,
          acknowledgedSummaryAt: tenMinutesAgo,
          acknowledgedBy: {
            _id: "moderator-1",
            username: "opslead",
            email: "opslead@example.com",
          },
        },
      ])),
    });
    alertsSummaryFindAllMock.mockResolvedValue([
      {
        alert_type: "vacation",
        employee_count: 6,
        computed_at: fiveMinutesAgo,
      },
      {
        alert_type: "benefits_change",
        employee_count: 3,
        computed_at: tenMinutesAgo,
      },
    ]);
    buildIntegrationMetricsSnapshotMock.mockResolvedValue({
      actionable: 0,
      backlog: 0,
      oldestPendingAgeMinutes: 0,
      counts: {
        PENDING: 0,
        PROCESSING: 0,
        SUCCESS: 10,
        FAILED: 0,
        DEAD: 0,
      },
    });

    const snapshot = await buildExecutiveBriefSnapshot({
      userId: "user-1",
      year: 2026,
    });

    expect(snapshot.alerts.followUp).toEqual(expect.objectContaining({
      needsAttentionCategories: 0,
      unassignedCategories: 0,
      staleCategories: 0,
      ownedCategories: 2,
    }));
    expect(snapshot.actionCenter).toEqual(expect.objectContaining({
      status: "healthy",
      label: "Ready for Memo",
      items: [
        expect.objectContaining({
          key: "open-earnings",
          tone: "healthy",
        }),
      ],
    }));
    expect(snapshot.freshness.readiness).toEqual(expect.objectContaining({
      status: "current",
      summary: "Summaries current",
    }));
  });

  test("buildExecutiveBriefSnapshot marks stale summaries as rebuildable operator debt", async () => {
    const now = Date.now();
    const fourHoursAgo = new Date(now - 4 * 60 * 60000).toISOString();
    const tenMinutesAgo = new Date(now - 10 * 60000).toISOString();

    userFindByIdMock.mockReturnValue(mockLeanChain({
      _id: "user-1",
      roles: ["role-admin"],
    }));
    roleFindMock.mockReturnValue(mockLeanChain([
      { _id: "role-admin", name: "admin" },
    ]));
    earningsSummaryFindOneMock.mockResolvedValue({ computed_at: fourHoursAgo });
    vacationSummaryFindOneMock.mockResolvedValue({ computed_at: tenMinutesAgo });
    benefitsSummaryFindOneMock.mockResolvedValue({ computed_at: tenMinutesAgo });
    alertFindMock.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockLeanChain([])),
    });
    alertsSummaryFindAllMock.mockResolvedValue([]);
    buildIntegrationMetricsSnapshotMock.mockResolvedValue({
      actionable: 0,
      backlog: 0,
      oldestPendingAgeMinutes: 0,
      counts: {
        PENDING: 0,
        PROCESSING: 0,
        SUCCESS: 10,
        FAILED: 0,
        DEAD: 0,
      },
    });

    const snapshot = await buildExecutiveBriefSnapshot({
      userId: "user-1",
      year: 2026,
    });

    expect(snapshot.freshness.global).toEqual(expect.objectContaining({
      status: "stale",
      staleDatasetCount: 1,
    }));
    expect(snapshot.freshness.readiness).toEqual(expect.objectContaining({
      status: "refresh_lag",
      summary: "Summary refresh lag",
      actionMode: "rebuild",
      actionLabel: "Rebuild summaries",
    }));
    expect(snapshot.actionCenter.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "refresh-summary",
        title: "Summary refresh lag",
        actionLabel: "Rebuild summaries",
      }),
    ]));
  });
});
