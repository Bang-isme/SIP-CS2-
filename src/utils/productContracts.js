import mongoose from "mongoose";
import { getRequestId } from "./requestTracking.js";
import { sendApiError } from "./apiErrors.js";

const PRODUCT_NAME_MAX_LENGTH = 120;
const PRODUCT_CATEGORY_MAX_LENGTH = 80;
const PRODUCT_IMAGE_URL_MAX_LENGTH = 500;
const PRODUCT_SEARCH_MAX_LENGTH = 80;
const PRODUCT_PRICE_MAX = 1000000000;

export class ProductContractError extends Error {
  constructor(message, { statusCode = 422, errors = [] } = {}) {
    super(message);
    this.name = "ProductContractError";
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
    throw new ProductContractError("Validation failed.", { errors });
  }
};

const normalizeTrimmedString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizeName = (value, errors, { required = true } = {}) => {
  const normalized = normalizeTrimmedString(value);
  if (!normalized) {
    if (required) addError(errors, "name", "name is required.", value);
    return "";
  }
  if (normalized.length > PRODUCT_NAME_MAX_LENGTH) {
    addError(errors, "name", `name must be at most ${PRODUCT_NAME_MAX_LENGTH} characters.`, normalized);
    return "";
  }
  return normalized;
};

const normalizeCategory = (value, errors, { required = false } = {}) => {
  const normalized = normalizeTrimmedString(value);
  if (!normalized) {
    if (required) addError(errors, "category", "category is required.", value);
    return "";
  }
  if (normalized.length > PRODUCT_CATEGORY_MAX_LENGTH) {
    addError(
      errors,
      "category",
      `category must be at most ${PRODUCT_CATEGORY_MAX_LENGTH} characters.`,
      normalized,
    );
    return "";
  }
  return normalized;
};

const normalizePrice = (value, errors, { required = false } = {}) => {
  if (value === undefined || value === null || String(value).trim?.() === "") {
    if (required) addError(errors, "price", "price is required.", value);
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > PRODUCT_PRICE_MAX) {
    addError(errors, "price", `price must be a number between 0 and ${PRODUCT_PRICE_MAX}.`, value);
    return undefined;
  }
  return parsed;
};

const normalizeImageUrl = (value, errors) => {
  const normalized = normalizeTrimmedString(value);
  if (!normalized) return "";
  if (normalized.length > PRODUCT_IMAGE_URL_MAX_LENGTH) {
    addError(
      errors,
      "imgURL",
      `imgURL must be at most ${PRODUCT_IMAGE_URL_MAX_LENGTH} characters.`,
      normalized,
    );
    return "";
  }
  return normalized;
};

export const normalizeProductPayload = (body = {}, { partial = false } = {}) => {
  const errors = [];
  const hasOwn = (field) => Object.prototype.hasOwnProperty.call(body, field);

  const payload = {};

  if (!partial || hasOwn("name")) {
    payload.name = normalizeName(body.name, errors, { required: !partial });
  }

  if (hasOwn("category")) {
    payload.category = normalizeCategory(body.category, errors);
  } else if (!partial) {
    payload.category = "";
  }

  if (!partial || hasOwn("price")) {
    const price = normalizePrice(body.price, errors, { required: false });
    if (price !== undefined) payload.price = price;
    if (!partial && price === undefined) payload.price = 0;
  }

  if (hasOwn("imgURL")) {
    payload.imgURL = normalizeImageUrl(body.imgURL, errors);
  } else if (!partial) {
    payload.imgURL = "";
  }

  if (partial && Object.keys(payload).length === 0) {
    addError(errors, "body", "Provide at least one product field to update.", body);
  }

  assertNoValidationErrors(errors);

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

export const normalizeProductIdParam = (value, field = "productId") => {
  const errors = [];
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    addError(errors, field, `${field} is required.`, value);
  } else if (!mongoose.Types.ObjectId.isValid(normalized)) {
    addError(errors, field, `${field} must be a valid Mongo ObjectId.`, value);
  }

  assertNoValidationErrors(errors);
  return normalized;
};

export const normalizeProductSearchParam = (value, field = "productName") => {
  const errors = [];
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    addError(errors, field, `${field} is required.`, value);
  } else if (normalized.length > PRODUCT_SEARCH_MAX_LENGTH) {
    addError(
      errors,
      field,
      `${field} must be at most ${PRODUCT_SEARCH_MAX_LENGTH} characters.`,
      value,
    );
  }

  assertNoValidationErrors(errors);
  return normalized;
};

export const buildProductMeta = ({
  req = null,
  res = null,
  dataset,
  actorId = null,
  filters = {},
  ...rest
} = {}) => ({
  dataset,
  actorId,
  requestId: getRequestId({ req, res }),
  filters,
  ...rest,
});

export const sendProductContractError = (res, error) => (
  sendApiError(res, error, { defaultCode: "VALIDATION_ERROR" })
);
