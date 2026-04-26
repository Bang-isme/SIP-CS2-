import { createApiError, respondWithApiError } from "../utils/apiErrors.js";

const rateLimiterStores = new Set();
const STORE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const formatRetryAfterSeconds = (valueMs) => Math.max(1, Math.ceil(valueMs / 1000));

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
};

const getLimiterKey = (req, scope) => {
  if (req.userId) {
    return `${scope}:user:${req.userId}`;
  }
  return `${scope}:ip:${getClientIp(req)}`;
};

export const createRateLimiter = ({
  scope,
  windowMs,
  max,
  message,
  code = "RATE_LIMITED",
  shouldSkip,
} = {}) => {
  if (!scope) {
    throw new Error("createRateLimiter requires a scope");
  }

  const store = new Map();
  rateLimiterStores.add(store);
  let lastCleanupAt = 0;

  return (req, res, next) => {
    if (typeof shouldSkip === "function" && shouldSkip(req)) {
      return next();
    }

    const now = Date.now();
    if (now - lastCleanupAt >= STORE_CLEANUP_INTERVAL_MS) {
      for (const [storeKey, entry] of store.entries()) {
        if (!entry || entry.resetAt <= now) {
          store.delete(storeKey);
        }
      }
      lastCleanupAt = now;
    }

    const key = getLimiterKey(req, scope);
    const current = store.get(key);
    const resetAt = !current || current.resetAt <= now ? now + windowMs : current.resetAt;
    const count = !current || current.resetAt <= now ? 1 : current.count + 1;
    const remaining = Math.max(0, max - count);

    store.set(key, { count, resetAt });

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(formatRetryAfterSeconds(resetAt - now)));
    res.setHeader("RateLimit-Policy", `${max};w=${Math.ceil(windowMs / 1000)}`);

    if (count <= max) {
      return next();
    }

    const retryAfterSeconds = formatRetryAfterSeconds(resetAt - now);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return respondWithApiError({
      req,
      res,
      error: createApiError(
        message || "Too many requests. Please slow down and try again shortly.",
        {
          statusCode: 429,
          code,
          shouldLog: false,
        },
      ),
      context: "RateLimit",
    });
  };
};

export const resetAllRateLimiters = () => {
  rateLimiterStores.forEach((store) => store.clear());
};

export const authRateLimiter = createRateLimiter({
  scope: "auth",
  windowMs: 60_000,
  max: 10,
  message: "Too many sign-in or sign-up attempts. Please wait a minute before trying again.",
  code: "AUTH_RATE_LIMITED",
});

export const authRefreshRateLimiter = createRateLimiter({
  scope: "auth-refresh",
  windowMs: 60_000,
  max: 30,
  message: "Too many session restore attempts. Please wait a moment before trying again.",
  code: "AUTH_REFRESH_RATE_LIMITED",
});

export const dashboardRateLimiter = createRateLimiter({
  scope: "dashboard",
  windowMs: 60_000,
  max: 120,
  message: "Dashboard requests are arriving too quickly. Please wait a moment and try again.",
  code: "DASHBOARD_RATE_LIMITED",
});

export const dashboardExportRateLimiter = createRateLimiter({
  scope: "dashboard-export",
  windowMs: 60_000,
  max: 6,
  message: "CSV exports are temporarily limited. Please wait before starting another export.",
  code: "DASHBOARD_EXPORT_RATE_LIMITED",
});

export const readApiRateLimiter = createRateLimiter({
  scope: "api-read",
  windowMs: 60_000,
  max: 60,
  message: "Read requests are arriving too quickly. Please wait a moment and try again.",
  code: "READ_RATE_LIMITED",
});

export const adminWriteRateLimiter = createRateLimiter({
  scope: "admin-write",
  windowMs: 60_000,
  max: 10,
  message: "Admin write actions are temporarily limited. Please wait a moment and try again.",
  code: "ADMIN_WRITE_RATE_LIMITED",
});

export const adminOpsRateLimiter = createRateLimiter({
  scope: "admin-ops",
  windowMs: 60_000,
  max: 20,
  message: "Admin operations are arriving too quickly. Please wait a moment and try again.",
  code: "ADMIN_OPS_RATE_LIMITED",
});

export default {
  createRateLimiter,
  resetAllRateLimiters,
  authRateLimiter,
  authRefreshRateLimiter,
  dashboardRateLimiter,
  dashboardExportRateLimiter,
  readApiRateLimiter,
  adminWriteRateLimiter,
  adminOpsRateLimiter,
};
