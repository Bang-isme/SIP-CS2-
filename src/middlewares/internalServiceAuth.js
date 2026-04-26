import { timingSafeEqual } from "crypto";
import { INTERNAL_SERVICE_SECRET } from "../config.js";
import { createForbiddenError, createUnauthorizedError, sendApiError } from "../utils/apiErrors.js";

export const INTERNAL_SERVICE_SECRET_HEADER = "x-internal-service-secret";
export const INTERNAL_SERVICE_NAME_HEADER = "x-internal-service-name";

const matchesSecret = (receivedSecret, expectedSecret) => {
  if (!receivedSecret || !expectedSecret) return false;

  const receivedBuffer = Buffer.from(String(receivedSecret));
  const expectedBuffer = Buffer.from(String(expectedSecret));
  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
};

export const verifyInternalServiceRequest = (req, res, next) => {
  if (!INTERNAL_SERVICE_SECRET) {
    return sendApiError(res, createForbiddenError(
      "Internal service secret is not configured.",
      "INTERNAL_SERVICE_SECRET_MISSING",
    ));
  }

  const receivedSecret = req.headers[INTERNAL_SERVICE_SECRET_HEADER];
  if (!receivedSecret) {
    return sendApiError(res, createUnauthorizedError(
      "Missing internal service secret.",
      "INTERNAL_SERVICE_SECRET_REQUIRED",
    ));
  }

  if (!matchesSecret(receivedSecret, INTERNAL_SERVICE_SECRET)) {
    return sendApiError(res, createForbiddenError(
      "Invalid internal service secret.",
      "INTERNAL_SERVICE_SECRET_INVALID",
    ));
  }

  req.internalService = {
    name: String(req.headers[INTERNAL_SERVICE_NAME_HEADER] || "unknown"),
  };
  return next();
};

export default verifyInternalServiceRequest;
