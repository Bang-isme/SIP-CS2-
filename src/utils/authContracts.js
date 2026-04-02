import { getRequestId } from "./requestTracking.js";
import { sendApiError } from "./apiErrors.js";

const USERNAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 160;
const PASSWORD_MAX_LENGTH = 128;
const ROLE_MAX_LENGTH = 40;

export class AuthContractError extends Error {
  constructor(message, { statusCode = 422, errors = [] } = {}) {
    super(message);
    this.name = "AuthContractError";
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
    throw new AuthContractError("Validation failed.", { errors });
  }
};

const normalizeTrimmedString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizeUsername = (value, errors, { field = "username", required = true } = {}) => {
  const normalized = normalizeTrimmedString(value);
  if (!normalized) {
    if (required) {
      addError(errors, field, `${field} is required.`, value);
    }
    return "";
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    addError(errors, field, `${field} must be at most ${USERNAME_MAX_LENGTH} characters.`, normalized);
    return "";
  }

  return normalized;
};

const normalizeEmail = (value, errors, { field = "email", required = true } = {}) => {
  const normalized = normalizeTrimmedString(value).toLowerCase();
  if (!normalized) {
    if (required) {
      addError(errors, field, `${field} is required.`, value);
    }
    return "";
  }

  if (normalized.length > EMAIL_MAX_LENGTH) {
    addError(errors, field, `${field} must be at most ${EMAIL_MAX_LENGTH} characters.`, normalized);
    return "";
  }

  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  if (!looksLikeEmail) {
    addError(errors, field, `${field} must be a valid email address.`, value);
    return "";
  }

  return normalized;
};

const normalizePassword = (value, errors, { field = "password", required = true, minLength = 1 } = {}) => {
  const normalized = value === undefined || value === null ? "" : String(value);
  if (!normalized.trim()) {
    if (required) {
      addError(errors, field, `${field} is required.`, value);
    }
    return "";
  }

  if (normalized.length < minLength || normalized.length > PASSWORD_MAX_LENGTH) {
    addError(
      errors,
      field,
      `${field} must be between ${minLength} and ${PASSWORD_MAX_LENGTH} characters.`,
      value,
    );
    return "";
  }

  return normalized;
};

const normalizeOptionalRoles = (roles, errors) => {
  if (roles === undefined || roles === null) return [];
  if (!Array.isArray(roles)) {
    addError(errors, "roles", "roles must be an array when provided.", roles);
    return [];
  }

  const normalizedRoles = roles
    .map((role) => normalizeTrimmedString(role).toLowerCase())
    .filter(Boolean);

  const invalidRole = normalizedRoles.find((role) => role.length > ROLE_MAX_LENGTH);
  if (invalidRole) {
    addError(errors, "roles", `role names must be at most ${ROLE_MAX_LENGTH} characters.`, invalidRole);
  }

  return Array.from(new Set(normalizedRoles));
};

export const normalizeSigninPayload = (body = {}) => {
  const errors = [];
  const identifier = normalizeTrimmedString(body.identifier || body.email || body.username);
  const password = normalizePassword(body.password, errors, { minLength: 1 });

  if (!identifier) {
    addError(
      errors,
      "identifier",
      "Provide one of: identifier, email, or username.",
      body.identifier ?? body.email ?? body.username,
    );
  } else if (identifier.length > EMAIL_MAX_LENGTH) {
    addError(errors, "identifier", `identifier must be at most ${EMAIL_MAX_LENGTH} characters.`, identifier);
  }

  assertNoValidationErrors(errors);

  const looksLikeEmail = identifier.includes("@");
  return {
    identifier,
    password,
    identifierType: looksLikeEmail ? "email" : "username",
    lookup: looksLikeEmail
      ? { $or: [{ email: identifier.toLowerCase() }, { username: identifier }] }
      : { $or: [{ username: identifier }, { email: identifier.toLowerCase() }] },
  };
};

export const normalizeSignupPayload = (body = {}) => {
  const errors = [];
  const username = normalizeUsername(body.username, errors);
  const email = normalizeEmail(body.email, errors);
  const password = normalizePassword(body.password, errors, { minLength: 6 });
  const roles = normalizeOptionalRoles(body.roles, errors);

  assertNoValidationErrors(errors);

  return {
    username,
    email,
    password,
    roles,
  };
};

export const buildAuthMeta = ({
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

export const sendAuthContractError = (res, error) => {
  return sendApiError(res, error, { defaultCode: "VALIDATION_ERROR" });
};
