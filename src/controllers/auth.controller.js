import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  AUTH_COOKIE_SAME_SITE,
  AUTH_COOKIE_SECURE,
  REFRESH_SECRET,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_EXPIRES_IN,
  SECRET,
} from "../config.js";
import {
  AuthContractError,
  buildAuthMeta,
  normalizeSigninPayload,
  normalizeSignupPayload,
  sendAuthContractError,
} from "../utils/authContracts.js";
import {
  createApiError,
  createNotFoundError,
  createUnauthorizedError,
  respondWithApiError,
  sendApiError,
} from "../utils/apiErrors.js";
import logger from "../utils/logger.js";
import { buildRequestLogData } from "../utils/requestTracking.js";
import {
  buildPersistedSessionTokens,
  getPersistedTokenSessionKey,
  mergePersistedSessionTokens,
  prunePersistedTokens,
} from "../utils/authSessionTokens.js";

const isMongoQuotaError = (error) => {
  if (!error) return false;
  const message = `${error.message || ""} ${error?.errorResponse?.errmsg || ""}`.toLowerCase();
  return error.code === 8000 || error?.errorResponse?.code === 8000 || message.includes("space quota");
};

const allowsStatelessJwtFallback = () =>
  process.env.ALLOW_STATELESS_JWT_FALLBACK === "1"
  && ["development", "test"].includes(process.env.NODE_ENV || "development");

const parseCookieHeader = (cookieHeader = "") => {
  return String(cookieHeader)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex < 0) return acc;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (key) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {});
};

const readRefreshTokenFromRequest = (req) => {
  const cookieHeader = req.headers?.cookie;
  if (cookieHeader) {
    const cookies = parseCookieHeader(cookieHeader);
    if (cookies[REFRESH_TOKEN_COOKIE_NAME]) {
      return cookies[REFRESH_TOKEN_COOKIE_NAME];
    }
  }
  if (typeof req.body?.refreshToken === "string" && req.body.refreshToken.trim()) {
    return req.body.refreshToken.trim();
  }
  if (typeof req.headers?.["x-refresh-token"] === "string" && req.headers["x-refresh-token"].trim()) {
    return req.headers["x-refresh-token"].trim();
  }
  return null;
};

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: AUTH_COOKIE_SECURE,
  sameSite: AUTH_COOKIE_SAME_SITE,
  path: "/api/auth",
  maxAge: resolveRefreshCookieMaxAgeMs(),
});

const resolveRefreshCookieMaxAgeMs = () => {
  const value = String(REFRESH_TOKEN_EXPIRES_IN || "").trim();
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed * 1000;
  }

  const match = value.match(/^(\d+)\s*([smhd])$/i);
  if (!match) {
    return 30 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, buildRefreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    ...buildRefreshCookieOptions(),
    maxAge: undefined,
  });
};

const sendInvalidRefreshToken = (res) => {
  clearRefreshCookie(res);
  return sendApiError(
    res,
    createUnauthorizedError("Session unavailable", "AUTH_REFRESH_TOKEN_INVALID", {
      meta: {
        detail: "Refresh token is invalid or expired.",
      },
    }),
  );
};

const loadAuthUserById = async (userId) => {
  const userQuery = User.findById(userId);
  if (userQuery && typeof userQuery.populate === "function") {
    return userQuery.populate("roles");
  }
  return userQuery;
};

const resolveRefreshSession = async (refreshToken) => {
  if (!refreshToken) {
    return {
      status: "missing",
    };
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch (error) {
    if (error?.name === "TokenExpiredError" || error?.name === "JsonWebTokenError") {
      return {
        status: "invalid",
      };
    }
    throw error;
  }

  if (decoded?.type !== "refresh") {
    return {
      status: "invalid",
    };
  }

  const user = await loadAuthUserById(decoded.id);
  if (!user) {
    return {
      status: "invalid",
    };
  }

  const activeTokens = prunePersistedTokens(user.tokens || []);
  if (activeTokens.length !== (user.tokens || []).length) {
    await User.findByIdAndUpdate(user._id, { tokens: activeTokens });
  }

  const storedRefreshToken = activeTokens.find(
    (entry) => entry?.token === refreshToken && entry?.kind === "refresh",
  );

  if (!storedRefreshToken) {
    return {
      status: "invalid",
    };
  }

  return {
    status: "valid",
    user,
    activeTokens,
    storedRefreshToken,
  };
};

const buildAccessTokenPayload = (userDoc) => {
  const sanitized = sanitizeAuthUser(userDoc);
  return {
    id: sanitized._id?.toString?.() || String(sanitized._id),
    roles: normalizeRoles(sanitized.roles),
    username: sanitized.username || null,
    email: sanitized.email || null,
  };
};

const signAccessToken = (userDoc) => jwt.sign(buildAccessTokenPayload(userDoc), SECRET, {
  expiresIn: ACCESS_TOKEN_EXPIRES_IN,
});

const signRefreshToken = (userId) => jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, {
  expiresIn: REFRESH_TOKEN_EXPIRES_IN,
});

const normalizeRoles = (roles = []) => {
  return roles
    .map((role) => {
      if (!role) return null;
      if (typeof role === "string") return role.toLowerCase();
      if (typeof role === "object" && role.name) return String(role.name).toLowerCase();
      if (typeof role === "object" && role._id) return String(role._id);
      return null;
    })
    .filter(Boolean);
};

const sanitizeAuthUser = (userDoc) => {
  const source = userDoc && typeof userDoc.toObject === "function"
    ? userDoc.toObject()
    : userDoc || {};

  return {
    _id: source._id,
    username: source.username,
    email: source.email,
    roles: normalizeRoles(source.roles),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

export const signupHandler = async (req, res) => {
  try {
    const { username, email, password } = normalizeSignupPayload(req.body);

    // Creating a new User Object
    const newUser = new User({
      username,
      email,
      password,
    });

    // Security hardening: signup always gets baseline "user" role.
    const role = await Role.findOne({ name: "user" });
    if (!role) {
      return sendApiError(
        res,
        createApiError("Default role configuration is missing", {
          statusCode: 500,
          code: "AUTH_DEFAULT_ROLE_MISSING",
        }),
      );
    }
    newUser.roles = [role._id];

    const savedUser = await newUser.save();

    const createdUser = await User.findById(savedUser._id).populate("roles", "name -_id");
    return res.status(201).json({
      success: true,
      data: sanitizeAuthUser(createdUser),
      meta: buildAuthMeta({
        req,
        res,
        dataset: "authSignup",
        actorId: savedUser._id,
      }),
    });
  } catch (error) {
    if (error instanceof AuthContractError) {
      return sendAuthContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "AuthController",
      defaultCode: "AUTH_SIGNUP_FAILED",
      extraLogData: buildRequestLogData({ req, res }),
    });
  }
};

export const signinHandler = async (req, res) => {
  try {
    const { identifierType, lookup, password } = normalizeSigninPayload(req.body);
    const userFound = await User.findOne(lookup).populate(
      "roles"
    );

    if (!userFound) {
      return sendApiError(res, createUnauthorizedError(
        "Invalid credentials",
        "AUTH_INVALID_CREDENTIALS",
      ));
    }

    const matchPassword = await User.comparePassword(
      password,
      userFound.password
    );

    if (!matchPassword) {
      return sendApiError(res, createUnauthorizedError(
        "Invalid credentials",
        "AUTH_INVALID_CREDENTIALS",
      ));
    }
      
    const token = signAccessToken(userFound);
    const refreshToken = signRefreshToken(userFound._id);

    let sessionMode = "persistent";
    try {
      const activeTokens = prunePersistedTokens(userFound.tokens || []);
      await User.findByIdAndUpdate(userFound._id, {
        tokens: mergePersistedSessionTokens(
          activeTokens,
          buildPersistedSessionTokens({ accessToken: token, refreshToken }),
        ),
      });
      setRefreshCookie(res, refreshToken);
    } catch (tokenUpdateError) {
      if (!isMongoQuotaError(tokenUpdateError)) {
        throw tokenUpdateError;
      }
      if (!allowsStatelessJwtFallback()) {
        logger.warn(
          "AuthController",
          "Mongo quota reached: rejecting signin because token persistence is unavailable and stateless fallback is disabled",
          buildRequestLogData({ req, res, actorId: userFound._id }),
        );
        return sendApiError(
          res,
          createApiError("Session storage unavailable", {
            statusCode: 503,
            code: "AUTH_SESSION_STORAGE_UNAVAILABLE",
            shouldLog: false,
            meta: {
              detail: "MongoDB quota blocks persistent auth storage.",
              hint: "Free MongoDB space or enable stateless fallback for demo mode.",
            },
          }),
        );
      }
      sessionMode = "statelessFallback";
      // Keep login available in read-mostly mode when Atlas storage quota is exceeded.
      logger.warn(
        "AuthController",
        "Mongo quota reached: continuing signin in stateless fallback mode",
        buildRequestLogData({ req, res, actorId: userFound._id }),
      );
    }

    return res.json({
      success: true,
      data: sanitizeAuthUser(userFound),
      token,
      meta: buildAuthMeta({
        req,
        res,
        dataset: "authSignin",
        actorId: userFound._id,
        identifierType,
        sessionMode,
      }),
    });
  } catch (error) {
    if (error instanceof AuthContractError) {
      return sendAuthContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "AuthController",
      defaultCode: "AUTH_SIGNIN_FAILED",
      extraLogData: buildRequestLogData({ req, res }),
    });
  }
};

export const refreshHandler = async (req, res) => {
  const refreshToken = readRefreshTokenFromRequest(req);

  if (!refreshToken) {
    return sendApiError(
      res,
      createUnauthorizedError("Session unavailable", "AUTH_REFRESH_TOKEN_MISSING", {
        meta: {
          detail: "Refresh token required to restore the SA session.",
        },
      }),
    );
  }

  try {
    const refreshSession = await resolveRefreshSession(refreshToken);

    if (refreshSession.status !== "valid") {
      return sendInvalidRefreshToken(res);
    }

    const { user, activeTokens, storedRefreshToken } = refreshSession;

    const nextAccessToken = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user._id);
    const rotatedTokens = activeTokens.filter(
      (entry) => getPersistedTokenSessionKey(entry) !== getPersistedTokenSessionKey(storedRefreshToken),
    );

    await User.findByIdAndUpdate(user._id, {
      tokens: mergePersistedSessionTokens(
        rotatedTokens,
        buildPersistedSessionTokens({
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
          sessionId: storedRefreshToken.sessionId,
        }),
      ),
    });

    setRefreshCookie(res, nextRefreshToken);

    return res.json({
      success: true,
      data: sanitizeAuthUser(user),
      token: nextAccessToken,
      meta: buildAuthMeta({
        req,
        res,
        dataset: "authRefresh",
        actorId: user._id,
        sessionMode: "persistent",
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "AuthController",
      defaultCode: "AUTH_REFRESH_FAILED",
      extraLogData: buildRequestLogData({ req, res }),
    });
  }
};

export const sessionStatusHandler = async (req, res) => {
  const refreshToken = readRefreshTokenFromRequest(req);

  if (!refreshToken) {
    return res.json({
      success: true,
      data: {
        refreshAvailable: false,
      },
      meta: buildAuthMeta({
        req,
        res,
        dataset: "authSessionStatus",
        sessionMode: "signed_out",
      }),
    });
  }

  try {
    const refreshSession = await resolveRefreshSession(refreshToken);
    if (refreshSession.status !== "valid") {
      clearRefreshCookie(res);
      return res.json({
        success: true,
        data: {
          refreshAvailable: false,
        },
        meta: buildAuthMeta({
          req,
          res,
          dataset: "authSessionStatus",
          sessionMode: "session_unavailable",
          detail: "Stored refresh session is unavailable.",
        }),
      });
    }

    return res.json({
      success: true,
      data: {
        refreshAvailable: true,
      },
      meta: buildAuthMeta({
        req,
        res,
        dataset: "authSessionStatus",
        actorId: refreshSession.user?._id || null,
        sessionMode: "restorable",
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "AuthController",
      defaultCode: "AUTH_SESSION_STATUS_FAILED",
      extraLogData: buildRequestLogData({ req, res }),
    });
  }
};

export const logoutHandler = async (req, res) => {
  const token = req.headers?.["x-access-token"];
  const refreshToken = readRefreshTokenFromRequest(req);

  try {
    const user = await User.findById(req.userId, { password: 0 });
    if (!user) {
      return sendApiError(res, createNotFoundError("No user found", "AUTH_USER_NOT_FOUND"));
    }
    try {
      const activeTokens = prunePersistedTokens(user.tokens || []);
      const revokedSessionKeys = new Set(
        activeTokens
          .filter((entry) => entry?.token && (entry.token === token || entry.token === refreshToken))
          .map(getPersistedTokenSessionKey)
          .filter(Boolean),
      );
      const nextTokens = activeTokens.filter((entry) => {
        if (!entry?.token) return false;
        if (revokedSessionKeys.size > 0) {
          return !revokedSessionKeys.has(getPersistedTokenSessionKey(entry));
        }
        return entry.token !== token && entry.token !== refreshToken;
      });
      await User.findByIdAndUpdate(req.userId, { tokens: nextTokens });
    } catch (logoutError) {
      if (!isMongoQuotaError(logoutError)) {
        throw logoutError;
      }
      // Token revocation is best-effort under quota pressure.
      logger.warn(
        "AuthController",
        "Mongo quota reached: skipping token cleanup during logout",
        buildRequestLogData({ req, res, actorId: req.userId }),
      );
    }
    clearRefreshCookie(res);
    return res.json({
      success: true,
      message: "Signed out",
      meta: buildAuthMeta({
        req,
        res,
        dataset: "authLogout",
        actorId: req.userId,
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "AuthController",
      defaultCode: "AUTH_LOGOUT_FAILED",
      extraLogData: buildRequestLogData({ req, res, actorId: req.userId }),
    });
  }
};

export const meHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("roles", "name -_id");
    if (!user) {
      return sendApiError(res, createNotFoundError("No user found", "AUTH_USER_NOT_FOUND"));
    }

    return res.json({
      success: true,
      data: sanitizeAuthUser(user),
      meta: buildAuthMeta({
        req,
        res,
        dataset: "authProfile",
        actorId: user._id,
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "AuthController",
      defaultCode: "AUTH_PROFILE_LOOKUP_FAILED",
      extraLogData: buildRequestLogData({ req, res, actorId: req.userId }),
    });
  }
};

