import logger from "./logger.js";
import { getRequestId } from "./requestTracking.js";

const buildLogData = (req, code, details = {}) => ({
  requestId: getRequestId({ req }),
  method: req?.method,
  path: req?.originalUrl || req?.url,
  actorId: req?.userId || null,
  code,
  ...details,
});

export const sendAuthGuardError = (
  req,
  res,
  {
    statusCode,
    message,
    code,
    logLevel = "warn",
    error = null,
    details = {},
  },
) => {
  const logData = buildLogData(req, code, details);

  if (logLevel === "error") {
    logger.error("AuthGuard", message, error || new Error(message), logData);
  } else {
    logger[logLevel]?.("AuthGuard", message, logData);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    code,
    requestId: getRequestId({ req, res }),
  });
};

export default {
  sendAuthGuardError,
};
