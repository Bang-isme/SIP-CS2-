import { jest } from "@jest/globals";
import { prepareDashboardDemo } from "../services/dashboardDemoPreparationService.js";

describe("dashboard demo preparation service", () => {
  test("provisions missing benefits-change evidence before alert acknowledgement", async () => {
    const fetchActiveAlerts = jest.fn().mockResolvedValue([
      { type: "benefits_change", isActive: true, threshold: 7 },
    ]);
    const getTriggeredAlertTypes = jest.fn()
      .mockResolvedValueOnce(new Set())
      .mockResolvedValueOnce(new Set(["benefits_change"]));
    const provisionAlertEvidence = jest.fn().mockResolvedValue("EMP-DEMO-42");
    const refreshAlertAggregates = jest.fn().mockResolvedValue(undefined);
    const fetchTriggeredAlerts = jest.fn().mockResolvedValue([
      {
        count: 1,
        alert: {
          _id: "alert-benefits-1",
          type: "benefits_change",
          acknowledgement: { needsReview: true },
        },
      },
    ]);
    const acknowledgeAlert = jest.fn().mockResolvedValue(undefined);
    const fetchExecutiveBrief = jest.fn().mockResolvedValue({
      data: {
        freshness: { global: { status: "fresh" } },
        actionCenter: { status: "healthy" },
        alerts: { followUp: { needsAttentionCategories: 0 } },
      },
    });

    const report = await prepareDashboardDemo({
      fetchActiveAlerts,
      getTriggeredAlertTypes,
      provisionAlertEvidence,
      refreshAlertAggregates,
      fetchTriggeredAlerts,
      acknowledgeAlert,
      fetchExecutiveBrief,
      note: "demo-note",
    });

    expect(fetchActiveAlerts).toHaveBeenCalledTimes(1);
    expect(getTriggeredAlertTypes).toHaveBeenCalledTimes(2);
    expect(provisionAlertEvidence).toHaveBeenCalledWith("benefits_change", 7);
    expect(refreshAlertAggregates).toHaveBeenCalledTimes(1);
    expect(fetchTriggeredAlerts).toHaveBeenCalledTimes(1);
    expect(acknowledgeAlert).toHaveBeenCalledWith("alert-benefits-1", "demo-note");
    expect(fetchExecutiveBrief).toHaveBeenCalledTimes(1);
    expect(report).toEqual(expect.objectContaining({
      status: "ok",
      activeAlertTypes: ["benefits_change"],
      missingTriggeredTypes: ["benefits_change"],
      visibleAlertTypes: ["benefits_change"],
      provisionedAlerts: [{ type: "benefits_change", employeeId: "EMP-DEMO-42" }],
      provisionedBenefitDemoEmployeeId: "EMP-DEMO-42",
      preparedAlerts: [{
        alertId: "alert-benefits-1",
        type: "benefits_change",
        count: 1,
      }],
      executiveBrief: {
        freshness: "fresh",
        actionCenter: "healthy",
        needsAttentionCategories: 0,
      },
    }));
  });
});
