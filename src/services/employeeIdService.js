import Counter from "../models/Counter.js";
import Employee from "../models/Employee.js";

const EMPLOYEE_COUNTER_KEY = "employee-id";
const EMPLOYEE_ID_PREFIX = "EMP";
const EMPLOYEE_ID_PAD_LENGTH = 6;

export const formatEmployeeId = (sequence) => {
  const safeSequence = Math.max(1, Number(sequence) || 1);
  return `${EMPLOYEE_ID_PREFIX}${String(safeSequence).padStart(EMPLOYEE_ID_PAD_LENGTH, "0")}`;
};

export const parseEmployeeIdSequence = (employeeId) => {
  const match = String(employeeId || "").trim().toUpperCase().match(/^EMP(\d+)$/);
  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const findHighestEmployeeSequence = async () => {
  const rows = await Employee.find({}, "employeeId").lean();
  return rows.reduce((highest, row) => {
    return Math.max(highest, parseEmployeeIdSequence(row?.employeeId));
  }, 0);
};

const ensureEmployeeCounter = async () => {
  const existing = await Counter.findOne({ key: EMPLOYEE_COUNTER_KEY }).lean();
  if (existing) {
    return existing;
  }

  const highestKnownSequence = await findHighestEmployeeSequence();

  try {
    await Counter.create({
      key: EMPLOYEE_COUNTER_KEY,
      seq: highestKnownSequence,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  const initialized = await Counter.findOne({ key: EMPLOYEE_COUNTER_KEY }).lean();
  return initialized || {
    key: EMPLOYEE_COUNTER_KEY,
    seq: highestKnownSequence,
  };
};

export const peekNextEmployeeId = async () => {
  const counter = await ensureEmployeeCounter();
  return formatEmployeeId((counter?.seq || 0) + 1);
};

export const reserveNextEmployeeId = async () => {
  await ensureEmployeeCounter();
  const counter = await Counter.findOneAndUpdate(
    { key: EMPLOYEE_COUNTER_KEY },
    { $inc: { seq: 1 } },
    {
      new: true,
    },
  ).lean();

  return formatEmployeeId(counter?.seq || 1);
};
