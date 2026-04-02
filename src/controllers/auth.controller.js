import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { SECRET } from "../config.js";
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

const isMongoQuotaError = (error) => {
  if (!error) return false;
  const message = `${error.message || ""} ${error?.errorResponse?.errmsg || ""}`.toLowerCase();
  return error.code === 8000 || error?.errorResponse?.code === 8000 || message.includes("space quota");
};

const allowsStatelessJwtFallback = () => process.env.ALLOW_STATELESS_JWT_FALLBACK === "1";

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

    // Create a token
    const token = jwt.sign({ id: savedUser._id }, SECRET, {
      expiresIn: 86400, // 24 hours
    });

    try {
      await User.findByIdAndUpdate(savedUser._id, {
        tokens: [{ token, signedAt: Date.now().toString() }],
      });
    } catch (tokenUpdateError) {
      if (!isMongoQuotaError(tokenUpdateError)) {
        throw tokenUpdateError;
      }
      // Allow signup response even when Mongo storage quota blocks non-critical token persistence.
      logger.warn(
        "AuthController",
        "Mongo quota reached: skipping token persistence during signup",
        buildRequestLogData({ req, res, actorId: savedUser._id }),
      );
    }

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
      
    const token = jwt.sign({ id: userFound._id }, SECRET, {
      expiresIn: 86400, // 24 hours
    });

    let sessionMode = "persistent";
    try {
      await User.findByIdAndUpdate(userFound._id, {
        tokens: [{ token, signedAt: Date.now().toString() }],
      });
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
          createApiError(
            "Sign in is temporarily unavailable because auth token storage is over quota. Free MongoDB space or enable ALLOW_STATELESS_JWT_FALLBACK=1 for read-only demo mode.",
            {
              statusCode: 503,
              code: "AUTH_SESSION_STORAGE_UNAVAILABLE",
              shouldLog: false,
            },
          ),
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

export const logoutHandler = async (req, res) => {
  const token = req.headers?.["x-access-token"];

  try {
    const user = await User.findById(req.userId, { password: 0 });
    if (!user) {
      return sendApiError(res, createNotFoundError("No user found", "AUTH_USER_NOT_FOUND"));
    }
    try {
      const nextTokens = (user.tokens || []).filter((entry) => entry?.token && entry.token !== token);
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
    return res.json({
      success: true,
      message: "Sign out successfully!",
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

