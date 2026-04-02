import User from "../models/User.js";
import { ROLES } from "../models/Role.js";
import { getRequestId } from "../utils/requestTracking.js";
import {
  createApiError,
  createConflictError,
  respondWithApiError,
  sendApiError,
} from "../utils/apiErrors.js";

export const checkExistingUser = async (req, res, next) => {
  try {
    const username = req.body?.username ? String(req.body.username).trim() : "";
    const emailValue = req.body?.email ? String(req.body.email).trim().toLowerCase() : "";

    const userFound = username ? await User.findOne({ username }) : null;
    if (userFound)
      return sendApiError(
        res,
        createConflictError("The user already exists", "AUTH_USERNAME_ALREADY_EXISTS"),
      );

    const email = emailValue ? await User.findOne({ email: emailValue }) : null;
    if (email)
      return sendApiError(
        res,
        createConflictError("The email already exists", "AUTH_EMAIL_ALREADY_EXISTS"),
      );

    next();
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "VerifySignup",
      defaultCode: "AUTH_SIGNUP_PRECHECK_FAILED",
    });
  }
};

export const checkExistingRole = (req, res, next) => {
  // Roles are optional on signup; default "user" role is assigned in controller
  if (!req.body.roles) return next();

  if (!Array.isArray(req.body.roles)) {
    return sendApiError(
      res,
      createApiError("Roles must be an array", {
        statusCode: 422,
        code: "AUTH_ROLES_ARRAY_REQUIRED",
      }),
    );
  }

  for (let i = 0; i < req.body.roles.length; i++) {
    if (!ROLES.includes(req.body.roles[i])) {
      return res.status(422).json({
        success: false,
        message: `Role ${req.body.roles[i]} does not exist`,
        code: "AUTH_ROLE_UNKNOWN",
        requestId: getRequestId({ req, res }),
      });
    }
  }

  next();
};
