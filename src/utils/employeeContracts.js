import mongoose from "mongoose";
import { sendApiError } from "./apiErrors.js";

const EMPLOYEE_ID_MAX_LENGTH = 100;

export class EmployeeContractError extends Error {
  constructor(message, { statusCode = 422, errors = [] } = {}) {
    super(message);
    this.name = "EmployeeContractError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const addError = (errors, field, message, value) => {
  errors.push({
    field,
    message,
    ...(value !== undefined ? { value } : {}),
  });
};

const assertNoValidationErrors = (errors) => {
  if (errors.length > 0) {
    throw new EmployeeContractError("Validation failed.", { errors });
  }
};

const normalizePositiveInteger = ({
  value,
  field,
  defaultValue,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
  errors,
}) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }

  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    addError(errors, field, `${field} must be an integer between ${min} and ${max}.`, value);
    return defaultValue;
  }

  const parsed = Number.parseInt(raw, 10);
  if (parsed < min || parsed > max) {
    addError(errors, field, `${field} must be an integer between ${min} and ${max}.`, value);
    return defaultValue;
  }

  return parsed;
};

export const normalizeEmployeeListQuery = (query = {}) => {
  const errors = [];
  const page = normalizePositiveInteger({
    value: query.page,
    field: "page",
    defaultValue: 1,
    max: 100000,
    errors,
  });
  const limit = normalizePositiveInteger({
    value: query.limit,
    field: "limit",
    defaultValue: 50,
    max: 200,
    errors,
  });

  assertNoValidationErrors(errors);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const normalizeEmployeeLookupParam = (value, field = "employeeId") => {
  const errors = [];
  const normalized = value === undefined || value === null
    ? ""
    : String(value).trim();

  if (!normalized) {
    addError(errors, field, `${field} must be a non-empty string.`, value);
  } else if (normalized.length > EMPLOYEE_ID_MAX_LENGTH) {
    addError(
      errors,
      field,
      `${field} must be at most ${EMPLOYEE_ID_MAX_LENGTH} characters.`,
      normalized,
    );
  }

  assertNoValidationErrors(errors);

  return normalized;
};

export const buildEmployeeMeta = ({
  dataset,
  filters = {},
  ...rest
}) => ({
  dataset,
  filters,
  ...rest,
});

export const sendEmployeeContractError = (res, error) => {
  return sendApiError(res, error, { defaultCode: "VALIDATION_ERROR" });
};

export const isMongoObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
