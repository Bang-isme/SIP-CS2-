import { ROLES } from "../models/Role.js";
import { getRequestId } from "./requestTracking.js";
import { sendApiError } from "./apiErrors.js";

const USERNAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 160;
const PASSWORD_MAX_LENGTH = 128;
const USER_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export class UserContractError extends Error {
  constructor(message, { statusCode = 422, errors = [] } = {}) {
    super(message);
    this.name = "UserContractError";
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
    throw new UserContractError("Validation failed.", { errors });
  }
};

const normalizeTrimmedString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizeUsername = (value, errors) => {
  const normalized = normalizeTrimmedString(value);
  if (!normalized) {
    addError(errors, "username", "username is required.", value);
    return "";
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    addError(errors, "username", `username must be at most ${USERNAME_MAX_LENGTH} characters.`, normalized);
    return "";
  }

  return normalized;
};

const normalizeEmail = (value, errors) => {
  const normalized = normalizeTrimmedString(value).toLowerCase();
  if (!normalized) {
    addError(errors, "email", "email is required.", value);
    return "";
  }

  if (normalized.length > EMAIL_MAX_LENGTH) {
    addError(errors, "email", `email must be at most ${EMAIL_MAX_LENGTH} characters.`, normalized);
    return "";
  }

  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  if (!looksLikeEmail) {
    addError(errors, "email", "email must be a valid email address.", value);
    return "";
  }

  return normalized;
};

const normalizePassword = (value, errors) => {
  const normalized = value === undefined || value === null ? "" : String(value);
  if (!normalized.trim()) {
    addError(errors, "password", "password is required.", value);
    return "";
  }

  if (normalized.length < 6 || normalized.length > PASSWORD_MAX_LENGTH) {
    addError(errors, "password", `password must be between 6 and ${PASSWORD_MAX_LENGTH} characters.`, value);
    return "";
  }

  return normalized;
};

const normalizeRoles = (roles, errors) => {
  if (roles === undefined || roles === null) return ["user"];
  if (!Array.isArray(roles) || roles.length === 0) {
    addError(errors, "roles", "roles must be a non-empty array when provided.", roles);
    return ["user"];
  }

  const normalizedRoles = roles
    .map((role) => normalizeTrimmedString(role).toLowerCase())
    .filter(Boolean);

  const invalidRoles = normalizedRoles.filter((role) => !ROLES.includes(role));
  if (invalidRoles.length > 0) {
    addError(errors, "roles", `roles must be one of: ${ROLES.join(", ")}.`, invalidRoles);
  }

  return Array.from(new Set(normalizedRoles));
};

export const normalizeCreateUserPayload = (body = {}) => {
  const errors = [];
  const username = normalizeUsername(body.username, errors);
  const email = normalizeEmail(body.email, errors);
  const password = normalizePassword(body.password, errors);
  const roles = normalizeRoles(body.roles, errors);

  assertNoValidationErrors(errors);

  return {
    username,
    email,
    password,
    roles,
  };
};

export const normalizeUserIdParam = (value, field = "userId") => {
  const errors = [];
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    addError(errors, field, `${field} is required.`, value);
  } else if (!USER_ID_PATTERN.test(normalized)) {
    addError(errors, field, `${field} must be a valid Mongo ObjectId.`, value);
  }

  assertNoValidationErrors(errors);
  return normalized;
};

export const buildUserMeta = ({
  req = null,
  res = null,
  dataset,
  actorId = null,
  ...rest
} = {}) => ({
  dataset,
  actorId,
  requestId: getRequestId({ req, res }),
  ...rest,
});

export const sendUserContractError = (res, error) => {
  return sendApiError(res, error, { defaultCode: "VALIDATION_ERROR" });
};
