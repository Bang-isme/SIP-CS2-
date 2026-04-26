import { jest } from "@jest/globals";
import { Op } from "sequelize";
import { repairExtraPayrollCoverage } from "../services/integrationReconciliationService.js";

describe("integration reconciliation repair service", () => {
  test("terminates active payroll rows that no longer exist in SA", async () => {
    const transaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    const sequelizeInstance = {
      transaction: jest.fn().mockResolvedValue(transaction),
    };
    const sourceModel = {
      find: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([
          { employeeId: "EMP001" },
          { employeeId: "EMP002" },
        ]),
      })),
    };
    const payRateModel = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 1,
          employee_id: "EMP001",
          pay_rate: "100.00",
          pay_type: "SALARY",
          is_active: true,
          effective_date: "2026-04-20",
        },
        {
          id: 2,
          employee_id: "EMP_ORPHAN_A",
          pay_rate: "55.50",
          pay_type: "HOURLY",
          is_active: true,
          effective_date: "2026-04-20",
        },
        {
          id: 3,
          employee_id: "EMP_ORPHAN_B",
          pay_rate: "80.00",
          pay_type: "SALARY",
          is_active: true,
          effective_date: "2026-04-21",
        },
      ]),
      update: jest.fn().mockResolvedValue([2]),
      bulkCreate: jest.fn().mockResolvedValue([]),
    };

    const result = await repairExtraPayrollCoverage({
      sourceModel,
      payRateModel,
      sequelizeInstance,
      maxRepairCount: 50,
      now: () => new Date("2026-04-24T12:00:00.000Z"),
      actorId: "admin-1",
      requestId: "req-repair-1",
    });

    expect(result).toEqual({
      repaired: true,
      repairedEmployeeIds: ["EMP_ORPHAN_A", "EMP_ORPHAN_B"],
      detectedExtraCount: 2,
      deactivatedCount: 2,
      terminatedRowsCreated: 2,
      remainingExtraCount: 0,
      actorId: "admin-1",
      requestId: "req-repair-1",
    });
    expect(payRateModel.update).toHaveBeenCalledWith(
      { is_active: false },
      expect.objectContaining({
        where: expect.objectContaining({
          employee_id: { [Op.in]: ["EMP_ORPHAN_A", "EMP_ORPHAN_B"] },
          is_active: true,
        }),
        transaction,
      }),
    );
    expect(payRateModel.bulkCreate).toHaveBeenCalledWith([
      {
        employee_id: "EMP_ORPHAN_A",
        pay_rate: 55.5,
        pay_type: "TERMINATED",
        effective_date: "2026-04-24",
        is_active: false,
      },
      {
        employee_id: "EMP_ORPHAN_B",
        pay_rate: 80,
        pay_type: "TERMINATED",
        effective_date: "2026-04-24",
        is_active: false,
      },
    ], { transaction });
    expect(transaction.commit).toHaveBeenCalledTimes(1);
    expect(transaction.rollback).not.toHaveBeenCalled();
  });
});
