import jwt from "jsonwebtoken";
import { SECRET } from "../config.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import logger from "../utils/logger.js";
import { sendAuthGuardError } from "../utils/authGuardResponses.js";
import { prunePersistedTokens } from "../utils/authSessionTokens.js";

const allowsStatelessJwtFallback = () =>
  process.env.ALLOW_STATELESS_JWT_FALLBACK === "1"
  && ["development", "test"].includes(process.env.NODE_ENV || "development");
const SAFE_FALLBACK_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const STATELESS_AUTH_MODES = new Set(["stateless", "jwt_stateless"]);

const isMongoQuotaError = (error) => {
  if (!error) return false;
  const message = `${error.message || ""} ${error?.errorResponse?.errmsg || ""}`.toLowerCase();
  return error.code === 8000 || error?.errorResponse?.code === 8000 || message.includes("space quota");
};

const getUserRoleNames = async (roleRefs = []) => {
  if (!Array.isArray(roleRefs) || roleRefs.length === 0) return [];
  const roles = await Role.find({ _id: { $in: roleRefs } });
  return roles.map((role) => String(role.name || "").toLowerCase()).filter(Boolean);
};

const canUseReadOnlyStatelessFallback = (req) =>
  allowsStatelessJwtFallback() && SAFE_FALLBACK_METHODS.has(req.method || "GET");

const normalizeRoleClaims = (claims = []) => {
  if (!Array.isArray(claims)) return [];
  return claims
    .map((role) => String(role || "").trim().toLowerCase())
    .filter(Boolean);
};

const shouldUseServiceStatelessAuth = (req) =>
  STATELESS_AUTH_MODES.has(String(req.app?.locals?.authMode || "").trim().toLowerCase());

const attachStatelessAuthContext = (req, decoded) => {
  req.userId = decoded.id;
  req.roleNames = normalizeRoleClaims(decoded.roles);
  req.authUser = {
    _id: decoded.id,
    username: decoded.username || null,
    email: decoded.email || null,
    roles: req.roleNames,
  };
};

const authorizeAnyRole = async (req, res, next, allowedRoles, message) => {
  try {
    const roleNames = req.roleNames || await getUserRoleNames(req.authUser?.roles || []);
    req.roleNames = roleNames;
    const hasRole = roleNames.some((roleName) => allowedRoles.includes(roleName));
    if (hasRole) {
      return next();
    }
    return sendAuthGuardError(req, res, {
      statusCode: 403,
      message,
      code: "AUTH_FORBIDDEN",
      details: {
        allowedRoles,
        roleNames,
      },
    });
  } catch (error) {
    return sendAuthGuardError(req, res, {
      statusCode: 500,
      message: "Authorization check failed",
      code: "AUTH_ROLE_RESOLUTION_FAILED",
      logLevel: "error",
      error,
    });
  }
};

export const verifyToken = async (req, res, next) => {
  let token = req.headers["x-access-token"];

  if (!token) {
    return sendAuthGuardError(req, res, {
      statusCode: 403,
      message: "No token provided",
      code: "AUTH_TOKEN_MISSING",
      logLevel: "debug",
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    if (!decoded?.id) {
      return sendAuthGuardError(req, res, {
        statusCode: 401,
        message: "Unauthorized!",
        code: "AUTH_UNAUTHORIZED",
        details: { tokenPresent: Boolean(token) },
      });
    }

    if (shouldUseServiceStatelessAuth(req)) {
      attachStatelessAuthContext(req, decoded);
      return next();
    }

    req.userId = decoded.id;

    const user = await User.findById(req.userId, { password: 0 });
    if (!user) {
      return sendAuthGuardError(req, res, {
        statusCode: 404,
        message: "No user found",
        code: "AUTH_USER_NOT_FOUND",
        details: { actorId: req.userId },
      });
    }

    req.authUser = user;

    const activeTokens = prunePersistedTokens(user.tokens || []);
    if (activeTokens.length !== (user.tokens || []).length) {
      void User.findByIdAndUpdate(req.userId, { tokens: activeTokens }).catch(() => {});
    }

    const orgTokens = activeTokens.filter((entry) => {
      if (!entry?.token || entry.token !== token) return false;
      return entry.kind !== "refresh";
    });
    if (orgTokens.length === 0) {
      if (canUseReadOnlyStatelessFallback(req)) {
        logger.warn("AuthGuard", "Allowing stateless JWT fallback because token is not present in persistent token storage", {
          requestId: req.requestId || res.locals.requestId,
          path: req.originalUrl,
          actorId: req.userId,
        });
        return next();
      }
      return sendAuthGuardError(req, res, {
        statusCode: 401,
        message: "Token is invalid or expired",
        code: "AUTH_TOKEN_REVOKED",
        details: { actorId: req.userId },
      });
    }

    next();
  } catch (error) {
    if (canUseReadOnlyStatelessFallback(req) && isMongoQuotaError(error)) {
      // Read-only degrade mode: permit verified JWT when persistence checks fail due storage quota.
      logger.warn("AuthGuard", "Allowing stateless JWT fallback because token persistence lookup hit Mongo quota", {
        requestId: req.requestId || res.locals.requestId,
        path: req.originalUrl,
      });
      return next();
    }
    return sendAuthGuardError(req, res, {
      statusCode: 401,
      message: "Unauthorized!",
      code: "AUTH_UNAUTHORIZED",
      details: { tokenPresent: Boolean(token) },
    });
  }
};

export const isModerator = async (req, res, next) => {
  return authorizeAnyRole(req, res, next, ["moderator"], "Require Moderator Role!");
};

export const canManageProducts = async (req, res, next) => {
  return authorizeAnyRole(
    req,
    res,
    next,
    ["moderator", "admin", "super_admin"],
    "Require Moderator, Admin, or Super Admin Role!",
  );
};

export const canManageAlerts = async (req, res, next) => {
  return authorizeAnyRole(
    req,
    res,
    next,
    ["moderator", "admin", "super_admin"],
    "Require Moderator, Admin, or Super Admin Role!"
  );
};

export const isAdmin = async (req, res, next) => {
  return authorizeAnyRole(req, res, next, ["admin", "super_admin"], "Require Admin Role!");
};

export const isSuperAdmin = async (req, res, next) => {
  return authorizeAnyRole(req, res, next, ["super_admin"], "Require Super Admin Role!");
};
