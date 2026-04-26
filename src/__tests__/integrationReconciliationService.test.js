import { computeIntegrationReconciliationSnapshot } from "../services/integrationReconciliationService.js";

describe("integration reconciliation service", () => {
  test("computes missing, extra, duplicate, and pay-rate mismatch counts", () => {
    const snapshot = computeIntegrationReconciliationSnapshot({
      sourceEmployees: [
        { employeeId: "EMP001", payRate: 100 },
        { employeeId: "EMP002", payRate: 120 },
        { employeeId: "EMP003", payRate: 140 },
      ],
      activePayRates: [
        {
          id: 2,
          employee_id: "EMP002",
          pay_rate: "115.00",
          pay_type: "SALARY",
          is_active: true,
          effective_date: "2026-04-20",
          updatedAt: "2026-04-21T08:00:00.000Z",
        },
        {
          id: 1,
          employee_id: "EMP002",
          pay_rate: "118.00",
          pay_type: "SALARY",
          is_active: true,
          effective_date: "2026-04-10",
          updatedAt: "2026-04-10T08:00:00.000Z",
        },
        {
          id: 3,
          employee_id: "EMP001",
          pay_rate: "100.00",
          pay_type: "SALARY",
          is_active: true,
          effective_date: "2026-04-20",
          updatedAt: "2026-04-21T08:00:00.000Z",
        },
        {
          id: 4,
          employee_id: "EMP004",
          pay_rate: "90.00",
          pay_type: "SALARY",
          is_active: true,
          effective_date: "2026-04-20",
          updatedAt: "2026-04-21T08:00:00.000Z",
        },
      ],
      checkedAt: "2026-04-21T08:00:00.000Z",
      sampleLimit: 3,
    });

    expect(snapshot.status).toBe("attention");
    expect(snapshot.summary).toEqual(expect.objectContaining({
      sourceEmployeeCount: 3,
      downstreamCoveredEmployeeCount: 3,
      missingInPayrollCount: 1,
      extraInPayrollCount: 1,
      duplicateActivePayrollCount: 1,
      payRateMismatchCount: 1,
      issueCount: 4,
      parityRate: 33.3,
    }));
    expect(snapshot.samples).toEqual({
      missingInPayroll: ["EMP003"],
      extraInPayroll: ["EMP004"],
      duplicateActivePayroll: ["EMP002"],
      payRateMismatch: [
        {
          employeeId: "EMP002",
          sourcePayRate: 120,
          payrollPayRate: 115,
        },
      ],
    });
  });

  test("returns healthy status when source and active payroll are aligned", () => {
    const snapshot = computeIntegrationReconciliationSnapshot({
      sourceEmployees: [
        { employeeId: "EMP001", payRate: 100 },
        { employeeId: "EMP002", payRate: 120 },
      ],
      activePayRates: [
        { employee_id: "EMP001", pay_rate: "100.00", pay_type: "SALARY", is_active: true },
        { employee_id: "EMP002", pay_rate: "120.00", pay_type: "SALARY", is_active: true },
      ],
      checkedAt: "2026-04-21T08:00:00.000Z",
    });

    expect(snapshot.status).toBe("healthy");
    expect(snapshot.summary.issueCount).toBe(0);
    expect(snapshot.summary.parityRate).toBe(100);
    expect(snapshot.samples.missingInPayroll).toEqual([]);
    expect(snapshot.samples.extraInPayroll).toEqual([]);
    expect(snapshot.samples.duplicateActivePayroll).toEqual([]);
    expect(snapshot.samples.payRateMismatch).toEqual([]);
  });
});
