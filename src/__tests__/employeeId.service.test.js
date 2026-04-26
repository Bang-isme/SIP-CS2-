import { jest } from "@jest/globals";

const counterFindOneMock = jest.fn();
const counterCreateMock = jest.fn();
const counterFindOneAndUpdateMock = jest.fn();
const employeeFindMock = jest.fn();

jest.unstable_mockModule("../models/Counter.js", () => ({
  default: {
    findOne: counterFindOneMock,
    create: counterCreateMock,
    findOneAndUpdate: counterFindOneAndUpdateMock,
  },
}));

jest.unstable_mockModule("../models/Employee.js", () => ({
  default: {
    find: employeeFindMock,
  },
}));

const {
  formatEmployeeId,
  parseEmployeeIdSequence,
  peekNextEmployeeId,
  reserveNextEmployeeId,
} = await import("../services/employeeIdService.js");

describe("employeeId service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("formats and parses canonical employee ids", () => {
    expect(formatEmployeeId(1)).toBe("EMP000001");
    expect(formatEmployeeId(42)).toBe("EMP000042");
    expect(parseEmployeeIdSequence("EMP000042")).toBe(42);
    expect(parseEmployeeIdSequence("emp000105")).toBe(105);
    expect(parseEmployeeIdSequence("BAD-42")).toBe(0);
  });

  test("peeks the next employee id from an existing counter", async () => {
    counterFindOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ key: "employee-id", seq: 194 }),
    });

    await expect(peekNextEmployeeId()).resolves.toBe("EMP000195");
    expect(employeeFindMock).not.toHaveBeenCalled();
  });

  test("initializes the counter from the highest stored employee id", async () => {
    counterFindOneMock
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      })
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({ key: "employee-id", seq: 194 }),
      });
    employeeFindMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { employeeId: "EMP000194" },
        { employeeId: "EMP000009" },
        { employeeId: "legacy-id" },
      ]),
    });

    await expect(peekNextEmployeeId()).resolves.toBe("EMP000195");
    expect(counterCreateMock).toHaveBeenCalledWith({
      key: "employee-id",
      seq: 194,
    });
  });

  test("reserves and returns the next employee id", async () => {
    counterFindOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ key: "employee-id", seq: 194 }),
    });
    counterFindOneAndUpdateMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ key: "employee-id", seq: 195 }),
    });

    await expect(reserveNextEmployeeId()).resolves.toBe("EMP000195");
    expect(counterFindOneAndUpdateMock).toHaveBeenCalledWith(
      { key: "employee-id" },
      { $inc: { seq: 1 } },
      expect.objectContaining({ new: true }),
    );
  });
});
