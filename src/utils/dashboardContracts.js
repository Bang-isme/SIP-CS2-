import { sendApiError } from "./apiErrors.js";

const ALERT_TYPES = Object.freeze([
  "anniversary",
  "vacation",
  "benefits_change",
  "birthday",
]);

const DASHBOARD_CONTEXTS = Object.freeze([
  "earnings",
  "vacation",
  "benefits",
]);

const DRILLDOWN_SUMMARY_MODES = Object.freeze([
  "fast",
  "full",
]);

const ALERT_DEFAULTS = Object.freeze({
  anniversary: { threshold: 30, supportsThreshold: true },
  vacation: { threshold: 20, supportsThreshold: true },
  benefits_change: { threshold: 7, supportsThreshold: true },
  birthday: { threshold: 0, supportsThreshold: false },
});

const SEARCH_MAX_LENGTH = 80;
const FILTER_MAX_LENGTH = 120;
const ALERT_NAME_MAX_LENGTH = 80;
const ALERT_DESCRIPTION_MAX_LENGTH = 280;
const YEAR_MIN = 2000;
const YEAR_MAX = 2200;

export class DashboardContractError extends Error {
  constructor(message, { statusCode = 422, errors = [] } = {}) {
    super(message);
    this.name = "DashboardContractError";
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

const strictParseInteger = (value) => {
  const raw = String(value).trim();
  if (!/^-?\d+$/.test(raw)) return null;
  return Number.parseInt(raw, 10);
};

const strictParseNumber = (value) => {
  const raw = String(value).trim();
  if (raw.length === 0) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const normalizeBoundedString = (value, { field, maxLength = FILTER_MAX_LENGTH, errors }) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  if (trimmed.length > maxLength) {
    addError(errors, field, `${field} must be at most ${maxLength} characters.`, trimmed);
    return undefined;
  }
  return trimmed;
};

const normalizeSearch = (value, errors) => {
  if (value === undefined || value === null) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (trimmed.length > SEARCH_MAX_LENGTH) {
    addError(errors, "search", `search must be at most ${SEARCH_MAX_LENGTH} characters.`, trimmed);
    return "";
  }
  return trimmed;
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

  const parsed = strictParseInteger(value);
  if (parsed === null || parsed < min || parsed > max) {
    addError(errors, field, `${field} must be an integer between ${min} and ${max}.`, value);
    return defaultValue;
  }
  return parsed;
};

const normalizeYear = (value, errors) => {
  const fallbackYear = new Date().getFullYear();
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallbackYear;
  }

  const parsed = strictParseInteger(value);
  if (parsed === null || parsed < YEAR_MIN || parsed > YEAR_MAX) {
    addError(errors, "year", `year must be an integer between ${YEAR_MIN} and ${YEAR_MAX}.`, value);
    return fallbackYear;
  }
  return parsed;
};

const normalizeBooleanString = (value, field, errors) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return undefined;
  }
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  addError(errors, field, `${field} must be either "true" or "false".`, value);
  return undefined;
};

const normalizeEnum = (value, allowedValues, field, errors, fallback) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  const normalized = String(value).trim();
  if (!allowedValues.includes(normalized)) {
    addError(errors, field, `${field} must be one of: ${allowedValues.join(", ")}.`, normalized);
    return fallback;
  }
  return normalized;
};

const normalizeThreshold = (value, alertType, errors, { required }) => {
  const config = ALERT_DEFAULTS[alertType];
  if (!config) return undefined;

  if (!config.supportsThreshold) {
    return 0;
  }

  if (value === undefined || value === null || String(value).trim() === "") {
    if (required) {
      return config.threshold;
    }
    return undefined;
  }

  const parsed = strictParseInteger(value);
  if (parsed === null || parsed < 0 || parsed > 365) {
    addError(errors, "threshold", "threshold must be an integer between 0 and 365.", value);
    return config.threshold;
  }
  return parsed;
};

const assertNoValidationErrors = (errors) => {
  if (errors.length > 0) {
    throw new DashboardContractError("Validation failed.", { errors });
  }
};

export const escapeRegexLiteral = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const escapeLikePattern = (value = "") => String(value).replace(/[\\%_]/g, "\\$&");

export const normalizeSummaryQuery = (query = {}) => {
  const errors = [];
  const year = normalizeYear(query.year, errors);
  const department = normalizeBoundedString(query.department, {
    field: "department",
    errors,
  });
  assertNoValidationErrors(errors);
  return {
    year,
    previousYear: year - 1,
    department,
  };
};

export const normalizeDrilldownQuery = (query = {}) => {
  const errors = [];
  const year = normalizeYear(query.year, errors);
  const pageNum = normalizePositiveInteger({
    value: query.page,
    field: "page",
    defaultValue: 1,
    max: 100000,
    errors,
  });
  const limitNum = normalizePositiveInteger({
    value: query.limit,
    field: "limit",
    defaultValue: 20,
    max: 10000,
    errors,
  });
  const context = normalizeEnum(query.context, DASHBOARD_CONTEXTS, "context", errors, "earnings");
  const isShareholder = normalizeBooleanString(query.isShareholder, "isShareholder", errors);
  const search = normalizeSearch(query.search, errors);
  const department = normalizeBoundedString(query.department, {
    field: "department",
    errors,
  });
  const gender = normalizeBoundedString(query.gender, {
    field: "gender",
    maxLength: 40,
    errors,
  });
  const ethnicity = normalizeBoundedString(query.ethnicity, {
    field: "ethnicity",
    maxLength: 60,
    errors,
  });
  const employmentType = normalizeBoundedString(query.employmentType, {
    field: "employmentType",
    maxLength: 40,
    errors,
  });
  const benefitPlanName = normalizeBoundedString(query.benefitPlan, {
    field: "benefitPlan",
    errors,
  });
  const minEarnings = query.minEarnings === undefined || query.minEarnings === null || String(query.minEarnings).trim() === ""
    ? undefined
    : strictParseNumber(query.minEarnings);

  if (minEarnings !== undefined && (minEarnings === null || minEarnings < 0)) {
    addError(errors, "minEarnings", "minEarnings must be a non-negative number.", query.minEarnings);
  }

  const bulkMode = query.bulk === "1" || limitNum >= 1000;
  const requestedSummaryMode = normalizeEnum(
    query.summary,
    DRILLDOWN_SUMMARY_MODES,
    "summary",
    errors,
    bulkMode ? "fast" : "full",
  );

  assertNoValidationErrors(errors);

  return {
    year,
    currentYear: new Date().getFullYear(),
    pageNum,
    limitNum,
    context,
    isShareholder,
    search,
    department,
    gender,
    ethnicity,
    employmentType,
    benefitPlanName,
    minEarnings,
    hasMinEarnings: Number.isFinite(minEarnings) && minEarnings > 0,
    bulkMode,
    requestedSummaryMode,
  };
};

export const normalizeAlertEmployeesQuery = (params = {}, query = {}) => {
  const errors = [];
  const type = normalizeEnum(params.type, ALERT_TYPES, "type", errors);
  const pageNum = normalizePositiveInteger({
    value: query.page,
    field: "page",
    defaultValue: 1,
    max: 100000,
    errors,
  });
  const limitNum = normalizePositiveInteger({
    value: query.limit,
    field: "limit",
    defaultValue: 100,
    max: 10000,
    errors,
  });
  const search = normalizeSearch(query.search, errors);

  assertNoValidationErrors(errors);

  return {
    type,
    pageNum,
    limitNum,
    search,
    offset: (pageNum - 1) * limitNum,
  };
};

export const normalizeMongoIdParam = (value, field = "id") => {
  const errors = [];
  const normalized = value === undefined || value === null ? "" : String(value).trim();

  if (!/^[0-9a-fA-F]{24}$/.test(normalized)) {
    addError(errors, field, `${field} must be a valid Mongo ObjectId.`, value);
  }

  assertNoValidationErrors(errors);
  return normalized;
};

export const normalizeAlertConfigPayload = (payload = {}, { partial = false } = {}) => {
  const errors = [];
  const normalized = {};
  const hasOwn = (field) => Object.prototype.hasOwnProperty.call(payload, field);

  const type = hasOwn("type")
    ? normalizeEnum(payload.type, ALERT_TYPES, "type", errors)
    : undefined;
  const effectiveType = type || payload.type;

  if (hasOwn("name")) {
    const name = normalizeBoundedString(payload.name, {
      field: "name",
      maxLength: ALERT_NAME_MAX_LENGTH,
      errors,
    });
    if (!name) {
      addError(errors, "name", "name is required.", payload.name);
    } else {
      normalized.name = name;
    }
  } else if (!partial) {
    addError(errors, "name", "name is required.");
  }

  if (type) {
    normalized.type = type;
  } else if (!partial) {
    addError(errors, "type", `type must be one of: ${ALERT_TYPES.join(", ")}.`);
  }

  if (hasOwn("description")) {
    const description = payload.description === undefined || payload.description === null
      ? ""
      : String(payload.description).trim();
    if (description.length > ALERT_DESCRIPTION_MAX_LENGTH) {
      addError(
        errors,
        "description",
        `description must be at most ${ALERT_DESCRIPTION_MAX_LENGTH} characters.`,
        description,
      );
    } else {
      normalized.description = description;
    }
  } else if (!partial) {
    normalized.description = "";
  }

  if (hasOwn("isActive")) {
    if (typeof payload.isActive !== "boolean") {
      addError(errors, "isActive", "isActive must be a boolean.", payload.isActive);
    } else {
      normalized.isActive = payload.isActive;
    }
  } else if (!partial) {
    normalized.isActive = true;
  }

  if (!partial || hasOwn("threshold") || hasOwn("type")) {
    const threshold = normalizeThreshold(payload.threshold, effectiveType, errors, { required: !partial });
    if (threshold !== undefined) {
      normalized.threshold = threshold;
    }
  }

  if (partial && Object.keys(normalized).length === 0) {
    addError(errors, "body", "At least one updatable field is required.");
  }

  assertNoValidationErrors(errors);
  return normalized;
};

export const buildDashboardMeta = ({
  dataset,
  updatedAt = null,
  filters = {},
  ...rest
}) => ({
  dataset,
  updatedAt,
  filters,
  ...rest,
});

export const buildDrilldownEmptyResponse = ({
  pageNum,
  limitNum,
  summaryMode,
  context,
  filters,
}) => ({
  success: true,
  data: [],
  meta: {
    total: 0,
    page: pageNum,
    limit: limitNum,
    pages: 0,
    totalPages: 0,
    dataset: context,
    filters,
    minEarningsApplied: filters.minEarnings ?? null,
  },
  summary: {
    totalEarnings: 0,
    totalBenefits: 0,
    totalVacation: 0,
    count: 0,
    calculated: true,
    source: "realtime",
    partial: false,
    mode: summaryMode,
  },
});

export const buildAlertEmployeesResponse = ({
  alertType,
  employees,
  page,
  limit,
  total,
  search,
  fullTotal = undefined,
  message,
}) => {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  const meta = {
    alertType,
    total,
    page,
    limit,
    totalPages,
    filters: {
      search: search || null,
    },
    ...(fullTotal !== undefined ? { fullTotal } : {}),
  };

  return {
    success: true,
    data: {
      employees,
      meta,
    },
    employees,
    total,
    page,
    limit,
    totalPages,
    ...(fullTotal !== undefined ? { fullTotal } : {}),
    ...(message ? { message } : {}),
    meta,
  };
};

export const sendContractError = (res, error) => {
  return sendApiError(res, error, { defaultCode: "VALIDATION_ERROR" });
};

export {
  ALERT_TYPES,
  DASHBOARD_CONTEXTS,
  DRILLDOWN_SUMMARY_MODES,
};
