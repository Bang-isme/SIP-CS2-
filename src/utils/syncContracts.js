import { sendApiError } from "./apiErrors.js";

const SYNC_STATUSES = Object.freeze([
  "PENDING",
  "SUCCESS",
  "FAILED",
]);

const SYNC_ACTIONS = Object.freeze([
  "CREATE",
  "UPDATE",
  "DELETE",
]);

const ENTITY_TYPE_MAX_LENGTH = 50;
const ENTITY_ID_MAX_LENGTH = 100;
const CORRELATION_ID_MAX_LENGTH = 120;

export class SyncContractError extends Error {
  constructor(message, { statusCode = 422, errors = [] } = {}) {
    super(message);
    this.name = "SyncContractError";
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
    throw new SyncContractError("Validation failed.", { errors });
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

const normalizeBoundedString = (value, {
  field,
  maxLength,
  errors,
  uppercase = false,
} = {}) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    addError(errors, field, `${field} must be at most ${maxLength} characters.`, normalized);
    return undefined;
  }
  return uppercase ? normalized.toUpperCase() : normalized;
};

const normalizeAllowlistedValue = (value, {
  field,
  allowedValues,
  allowAll = false,
  errors,
} = {}) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return undefined;
  }

  const normalized = String(value).trim().toUpperCase();
  if (allowAll && normalized === "ALL") {
    return undefined;
  }

  if (!allowedValues.includes(normalized)) {
    addError(
      errors,
      field,
      `${field} must be one of: ${[...(allowAll ? ["ALL"] : []), ...allowedValues].join(", ")}.`,
      value,
    );
    return undefined;
  }

  return normalized;
};

export const normalizeSyncLogsQuery = (query = {}) => {
  const errors = [];
  const status = normalizeAllowlistedValue(query.status, {
    field: "status",
    allowedValues: SYNC_STATUSES,
    allowAll: true,
    errors,
  });
  const action = normalizeAllowlistedValue(query.action, {
    field: "action",
    allowedValues: SYNC_ACTIONS,
    allowAll: true,
    errors,
  });
  const entityType = normalizeBoundedString(query.entityType, {
    field: "entityType",
    maxLength: ENTITY_TYPE_MAX_LENGTH,
    errors,
  });
  const entityId = normalizeBoundedString(query.entityId, {
    field: "entityId",
    maxLength: ENTITY_ID_MAX_LENGTH,
    errors,
  });
  const correlationId = normalizeBoundedString(query.correlationId, {
    field: "correlationId",
    maxLength: CORRELATION_ID_MAX_LENGTH,
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
    action,
    entityType,
    entityId,
    correlationId,
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const normalizeSyncEntityParams = (params = {}) => {
  const errors = [];
  const entityType = normalizeBoundedString(params.type, {
    field: "type",
    maxLength: ENTITY_TYPE_MAX_LENGTH,
    errors,
  });
  const entityId = normalizeBoundedString(params.id, {
    field: "id",
    maxLength: ENTITY_ID_MAX_LENGTH,
    errors,
  });

  if (!entityType) {
    addError(errors, "type", `type must be a non-empty string up to ${ENTITY_TYPE_MAX_LENGTH} characters.`, params.type);
  }
  if (!entityId) {
    addError(errors, "id", `id must be a non-empty string up to ${ENTITY_ID_MAX_LENGTH} characters.`, params.id);
  }

  assertNoValidationErrors(errors);

  return {
    entityType,
    entityId,
  };
};

export const buildSyncMeta = ({
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

export const sendSyncContractError = (res, error) => {
  return sendApiError(res, error, { defaultCode: "VALIDATION_ERROR" });
};

export {
  SYNC_ACTIONS,
  SYNC_STATUSES,
};
