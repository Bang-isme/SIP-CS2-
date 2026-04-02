import { sendApiError } from "./apiErrors.js";

const INTEGRATION_STATUSES = Object.freeze([
  "PENDING",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "DEAD",
]);

const REPLAYABLE_STATUSES = Object.freeze([
  "FAILED",
  "DEAD",
]);

const ENTITY_TYPE_MAX_LENGTH = 50;
const ENTITY_ID_MAX_LENGTH = 100;

export class IntegrationContractError extends Error {
  constructor(message, { statusCode = 422, errors = [] } = {}) {
    super(message);
    this.name = "IntegrationContractError";
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
    throw new IntegrationContractError("Validation failed.", { errors });
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

const normalizeBoundedString = (value, { field, maxLength, errors }) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    addError(errors, field, `${field} must be at most ${maxLength} characters.`, normalized);
    return undefined;
  }
  return normalized;
};

export const normalizeIntegrationStatus = (value, {
  field = "status",
  allowAll = false,
  allowEmpty = true,
  allowedValues = INTEGRATION_STATUSES,
  errors,
} = {}) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return allowEmpty ? undefined : null;
  }

  const normalized = String(value).trim().toUpperCase();
  if (allowAll && normalized === "ALL") return undefined;

  if (!allowedValues.includes(normalized)) {
    addError(errors, field, `${field} must be one of: ${[...(allowAll ? ["ALL"] : []), ...allowedValues].join(", ")}.`, value);
    return undefined;
  }

  return normalized;
};

export const normalizeIntegrationListQuery = (query = {}) => {
  const errors = [];
  const status = normalizeIntegrationStatus(query.status, {
    field: "status",
    allowAll: true,
    errors,
  });
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
    max: 500,
    errors,
  });

  assertNoValidationErrors(errors);

  return {
    status,
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const normalizeIntegrationAuditQuery = (query = {}) => {
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
    defaultValue: 20,
    max: 100,
    errors,
  });

  assertNoValidationErrors(errors);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const normalizeIntegrationEventIdParam = (value, field = "id") => {
  const errors = [];
  const raw = value === undefined || value === null ? "" : String(value).trim();

  if (!/^\d+$/.test(raw)) {
    addError(errors, field, `${field} must be a positive integer event id.`, value);
  }

  assertNoValidationErrors(errors);
  return Number.parseInt(raw, 10);
};

export const normalizeReplayPayload = (payload = {}) => {
  const errors = [];
  const status = normalizeIntegrationStatus(payload.status, {
    field: "status",
    allowAll: false,
    allowedValues: REPLAYABLE_STATUSES,
    errors,
  });
  const entityType = normalizeBoundedString(payload.entityType, {
    field: "entityType",
    maxLength: ENTITY_TYPE_MAX_LENGTH,
    errors,
  });
  const entityId = normalizeBoundedString(payload.entityId, {
    field: "entityId",
    maxLength: ENTITY_ID_MAX_LENGTH,
    errors,
  });

  const hasFromDate = payload.fromDate !== undefined && payload.fromDate !== null && String(payload.fromDate).trim() !== "";
  const hasFromDays = payload.fromDays !== undefined && payload.fromDays !== null && String(payload.fromDays).trim() !== "";

  if (hasFromDate && hasFromDays) {
    addError(errors, "body", "Provide either fromDate or fromDays, not both.");
  }

  let fromDate;
  if (hasFromDate) {
    const parsed = new Date(payload.fromDate);
    if (Number.isNaN(parsed.getTime())) {
      addError(errors, "fromDate", "fromDate must be a valid ISO date string.", payload.fromDate);
    } else {
      fromDate = parsed;
    }
  }

  let fromDays;
  if (hasFromDays) {
    const raw = String(payload.fromDays).trim();
    if (!/^\d+$/.test(raw)) {
      addError(errors, "fromDays", "fromDays must be an integer between 0 and 365.", payload.fromDays);
    } else {
      const parsed = Number.parseInt(raw, 10);
      if (parsed < 0 || parsed > 365) {
        addError(errors, "fromDays", "fromDays must be an integer between 0 and 365.", payload.fromDays);
      } else {
        fromDays = parsed;
      }
    }
  }

  assertNoValidationErrors(errors);

  return {
    status,
    entityType,
    entityId,
    fromDate,
    fromDays,
  };
};

export const buildIntegrationMeta = ({
  dataset,
  actorId = null,
  filters = {},
  ...rest
}) => ({
  dataset,
  actorId,
  filters,
  ...rest,
});

export const sendIntegrationContractError = (res, error) => {
  return sendApiError(res, error, { defaultCode: "VALIDATION_ERROR" });
};

export {
  INTEGRATION_STATUSES,
  REPLAYABLE_STATUSES,
};
