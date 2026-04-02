import logger from "./logger.js";
import { buildRequestLogData, getRequestId } from "./requestTracking.js";

const DEFAULT_ERROR_MESSAGE = "Unexpected server error.";

const deriveErrorCode = (statusCode, errors = []) => {
  if (Array.isArray(errors) && errors.length > 0) {
    return "VALIDATION_ERROR";
  }

  switch (statusCode) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "RESOURCE_NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION_ERROR";
    default:
      return statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED";
  }
};

export class ApiError extends Error {
  constructor(message, {
    statusCode = 500,
    code = null,
    errors = [],
    shouldLog,
  } = {}) {
    super(message || DEFAULT_ERROR_MESSAGE);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = Array.isArray(errors) ? errors : [];
    this.code = code || deriveErrorCode(statusCode, this.errors);
    this.shouldLog = typeof shouldLog === "boolean" ? shouldLog : statusCode >= 500;
  }
}

export const createApiError = (message, options = {}) => new ApiError(message, options);

export const createBadRequestError = (message, code = "BAD_REQUEST") => createApiError(message, {
  statusCode: 400,
  code,
  shouldLog: false,
});

export const createUnauthorizedError = (message, code = "UNAUTHORIZED") => createApiError(message, {
  statusCode: 401,
  code,
  shouldLog: false,
});

export const createForbiddenError = (message, code = "FORBIDDEN") => createApiError(message, {
  statusCode: 403,
  code,
  shouldLog: false,
});

export const createNotFoundError = (message, code = "RESOURCE_NOT_FOUND") => createApiError(message, {
  statusCode: 404,
  code,
  shouldLog: false,
});

export const createConflictError = (message, code = "CONFLICT") => createApiError(message, {
  statusCode: 409,
  code,
  shouldLog: false,
});

export const createValidationError = (message = "Validation failed.", errors = [], code = "VALIDATION_ERROR") => createApiError(message, {
  statusCode: 422,
  code,
  errors,
  shouldLog: false,
});

const isContractStyleError = (error) => Number.isInteger(error?.statusCode)
  && Array.isArray(error?.errors);

export const normalizeApiError = (error, { defaultCode = null } = {}) => {
  if (error instanceof ApiError) {
    return error;
  }

  if (isContractStyleError(error)) {
    return createApiError(error.message || "Validation failed.", {
      statusCode: error.statusCode,
      code: error.code || defaultCode || deriveErrorCode(error.statusCode, error.errors),
      errors: error.errors,
      shouldLog: false,
    });
  }

  if (error?.name === "ValidationError") {
    return createApiError(error.message || "Validation failed.", {
      statusCode: 400,
      code: defaultCode || "MODEL_VALIDATION_ERROR",
      shouldLog: false,
    });
  }

  if (error?.code === 11000) {
    return createConflictError(
      error?.message || "Duplicate resource.",
      defaultCode || "DUPLICATE_RESOURCE",
    );
  }

  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  return createApiError(error?.message || DEFAULT_ERROR_MESSAGE, {
    statusCode,
    code: error?.code || defaultCode || deriveErrorCode(statusCode),
    shouldLog: statusCode >= 500,
  });
};

export const sendApiError = (res, error, { defaultCode = null } = {}) => {
  const apiError = normalizeApiError(error, { defaultCode });
  const body = {
    success: false,
    message: apiError.message || DEFAULT_ERROR_MESSAGE,
    code: apiError.code,
    ...(getRequestId({ res }) ? { requestId: getRequestId({ res }) } : {}),
  };

  if (Array.isArray(apiError.errors) && apiError.errors.length > 0) {
    body.errors = apiError.errors;
  }

  return res.status(apiError.statusCode).json(body);
};

export const respondWithApiError = ({
  req = null,
  res,
  error,
  context = "Api",
  defaultCode = null,
  extraLogData = {},
} = {}) => {
  const apiError = normalizeApiError(error, { defaultCode });

  if (apiError.shouldLog) {
    logger.error(
      context,
      apiError.message || DEFAULT_ERROR_MESSAGE,
      error instanceof Error ? error : null,
      buildRequestLogData({
        req,
        res,
        ...extraLogData,
        statusCode: apiError.statusCode,
        code: apiError.code,
      }),
    );
  }

  return sendApiError(res, apiError);
};
