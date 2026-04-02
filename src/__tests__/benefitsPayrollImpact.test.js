import { buildBenefitsChangeMatchesFromRows } from "../utils/benefitsPayrollImpact.js";

describe("benefits payroll impact summarizer", () => {
  test("classifies payroll-impacting benefit changes with structured metadata", () => {
    const rows = [
      {
        employee_id: "EMP001",
        amount_paid: "5400.00",
        effective_date: "2026-03-22",
        last_change_date: "2026-03-18",
        plan: { name: "Premium Health" },
      },
      {
        employee_id: "EMP002",
        amount_paid: "600.00",
        effective_date: "2026-03-10",
        last_change_date: "2026-03-17",
        plan: { name: "Dental Gold" },
      },
      {
        employee_id: "EMP002",
        amount_paid: "360.00",
        effective_date: "2026-03-20",
        last_change_date: "2026-03-18",
        plan: { name: "Vision Plus" },
      },
      {
        employee_id: "EMP003",
        amount_paid: "0.00",
        effective_date: "2026-03-12",
        last_change_date: "2026-03-16",
        plan: { name: "401k Standard" },
      },
    ];

    const matches = buildBenefitsChangeMatchesFromRows(rows, { now: new Date("2026-03-19T09:00:00.000Z") });
    const matchMap = new Map(matches.map((item) => [item.employeeId, item]));

    const emp1 = JSON.parse(matchMap.get("EMP001").extraData);
    expect(emp1).toMatchObject({
      p: "Premium Health",
      pc: 1,
      a: 5400,
      c: "2026-03-18",
      e: "2026-03-22",
      i: "scheduled_payroll_deduction",
    });
    expect(matchMap.get("EMP001").sortDays).toBe(1);

    const emp2 = JSON.parse(matchMap.get("EMP002").extraData);
    expect(emp2).toMatchObject({
      pc: 2,
      a: 960,
      c: "2026-03-18",
      e: "2026-03-20",
      i: "multi_plan_payroll_update",
    });

    const emp3 = JSON.parse(matchMap.get("EMP003").extraData);
    expect(emp3).toMatchObject({
      p: "401k Standard",
      pc: 1,
      a: 0,
      i: "benefit_enrollment_update",
    });
  });
});
