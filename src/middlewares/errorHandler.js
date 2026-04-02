import { createNotFoundError, respondWithApiError } from "../utils/apiErrors.js";

export const apiNotFoundHandler = (req, res) => respondWithApiError({
  req,
  res,
  error: createNotFoundError(`Route not found: ${req.originalUrl}`, "API_ROUTE_NOT_FOUND"),
  context: "App",
});

export const apiErrorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  return respondWithApiError({
    req,
    res,
    error,
    context: "App",
  });
};

export default {
  apiNotFoundHandler,
  apiErrorHandler,
};
