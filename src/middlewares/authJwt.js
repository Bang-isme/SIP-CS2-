import jwt from "jsonwebtoken";
import { SECRET } from "../config.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import logger from "../utils/logger.js";
import { sendAuthGuardError } from "../utils/authGuardResponses.js";

const allowsStatelessJwtFallback = () => process.env.ALLOW_STATELESS_JWT_FALLBACK === "1";

const isMongoQuotaError = (error) => {
  if (!error) return false;
  const message = `${error.message || ""} ${error?.errorResponse?.errmsg || ""}`.toLowerCase();
  return error.code === 8000 || error?.errorResponse?.code === 8000 || message.includes("space quota");
};

const getUserRoleNames = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return [];
  const roles = await Role.find({ _id: { $in: user.roles } });
  return roles.map((role) => String(role.name || "").toLowerCase()).filter(Boolean);
};

const authorizeAnyRole = async (req, res, next, allowedRoles, message) => {
  try {
    const roleNames = await getUserRoleNames(req.userId);
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

    const orgTokens = (user.tokens || []).filter(t => t.token === token);
    if (orgTokens.length === 0) {
      if (allowsStatelessJwtFallback()) {
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
    if (allowsStatelessJwtFallback() && isMongoQuotaError(error)) {
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
