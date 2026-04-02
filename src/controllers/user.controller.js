import User from "../models/User.js";
import Role from "../models/Role.js";
import { ADMIN_EMAIL } from "../config.js";
import {
  UserContractError,
  buildUserMeta,
  normalizeCreateUserPayload,
  normalizeUserIdParam,
  sendUserContractError,
} from "../utils/userContracts.js";
import {
  createApiError,
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
  respondWithApiError,
  sendApiError,
} from "../utils/apiErrors.js";

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

const sanitizeUserPayload = (userDoc) => {
  const safeSource = userDoc && typeof userDoc.toObject === "function"
    ? userDoc.toObject()
    : userDoc || {};

  return {
    _id: safeSource._id,
    username: safeSource.username,
    email: safeSource.email,
    roles: normalizeRoles(safeSource.roles || []),
    createdAt: safeSource.createdAt,
    updatedAt: safeSource.updatedAt,
  };
};

export const createUser = async (req, res) => {
  try {
    const { username, email, password, roles: requestedRoles } = normalizeCreateUserPayload(req.body);
    const rolesFound = await Role.find({ name: { $in: requestedRoles } });
    if (rolesFound.length !== requestedRoles.length) {
      return sendApiError(
        res,
        createApiError("Invalid roles payload", {
          statusCode: 422,
          code: "USER_INVALID_ROLE_SET",
        }),
      );
    }

    // creating a new User
    const user = new User({
      username,
      email,
      password,
      roles: rolesFound.map((role) => role._id),
    });

    // saving the new user
    const savedUser = await user.save();

    const createdUserQuery = User.findById(savedUser._id);
    const createdUser = typeof createdUserQuery?.populate === "function"
      ? await createdUserQuery.populate("roles", "name -_id")
      : await createdUserQuery;

    return res.status(201).json({
      success: true,
      data: sanitizeUserPayload(createdUser || savedUser),
      meta: buildUserMeta({
        req,
        res,
        dataset: "users",
        actorId: req.userId,
      }),
    });
  } catch (error) {
    if (error instanceof UserContractError) {
      return sendUserContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "UserController",
      defaultCode: "USER_CREATE_FAILED",
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const usersQuery = User.find();
    const users = typeof usersQuery?.populate === "function"
      ? await usersQuery.populate("roles", "name -_id")
      : await usersQuery;
    const sanitizedUsers = users.map((user) => sanitizeUserPayload(user));
    return res.json({
      success: true,
      data: sanitizedUsers,
      meta: buildUserMeta({
        req,
        res,
        dataset: "users",
        actorId: req.userId,
        total: sanitizedUsers.length,
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "UserController",
      defaultCode: "USER_LIST_FAILED",
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const userId = normalizeUserIdParam(req.params.userId);
    const userQuery = User.findById(userId);
    const user = typeof userQuery?.populate === "function"
      ? await userQuery.populate("roles", "name -_id")
      : await userQuery;
    if (!user) {
      return sendApiError(res, createNotFoundError("User not found", "USER_NOT_FOUND"));
    }
    return res.json({
      success: true,
      data: sanitizeUserPayload(user),
      meta: buildUserMeta({
        req,
        res,
        dataset: "userDetail",
        actorId: req.userId,
      }),
    });
  } catch (error) {
    if (error instanceof UserContractError) {
      return sendUserContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "UserController",
      defaultCode: "USER_DETAIL_LOOKUP_FAILED",
    });
  }
};

export const promoteUserToAdmin = async (req, res) => {
  try {
    const targetUserId = normalizeUserIdParam(req.params.id, "id");
    const adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) {
      return sendApiError(
        res,
        createApiError("Admin role configuration is missing", {
          statusCode: 500,
          code: "USER_ADMIN_ROLE_MISSING",
        }),
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      { $addToSet: { roles: adminRole._id } },
      { new: true },
    ).populate("roles", "name -_id");

    if (!updatedUser) {
      return sendApiError(res, createNotFoundError("User not found", "USER_NOT_FOUND"));
    }

    return res.status(200).json({
      success: true,
      data: sanitizeUserPayload(updatedUser),
      meta: buildUserMeta({
        req,
        res,
        dataset: "userRoleMutation",
        actorId: req.userId,
        targetUserId,
        action: "PROMOTE_ADMIN",
      }),
    });
  } catch (error) {
    if (error instanceof UserContractError) {
      return sendUserContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "UserController",
      defaultCode: "USER_PROMOTION_FAILED",
    });
  }
};

export const demoteUserFromAdmin = async (req, res) => {
  try {
    const targetUserId = normalizeUserIdParam(req.params.id, "id");
    if (req.userId === targetUserId) {
      return sendApiError(
        res,
        createBadRequestError("Self-demotion is not allowed", "USER_SELF_DEMOTION_FORBIDDEN"),
      );
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return sendApiError(res, createNotFoundError("User not found", "USER_NOT_FOUND"));
    }

    if (targetUser.email === ADMIN_EMAIL) {
      return sendApiError(
        res,
        createForbiddenError(
          "Root admin account cannot be demoted",
          "USER_ROOT_ADMIN_DEMOTION_FORBIDDEN",
        ),
      );
    }

    const adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) {
      return sendApiError(
        res,
        createApiError("Admin role configuration is missing", {
          statusCode: 500,
          code: "USER_ADMIN_ROLE_MISSING",
        }),
      );
    }

    const hasAdmin = (targetUser.roles || []).some((roleId) => String(roleId) === String(adminRole._id));
    if (!hasAdmin) {
      return sendApiError(
        res,
        createBadRequestError("Target user does not have admin role", "USER_TARGET_NOT_ADMIN"),
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      { $pull: { roles: adminRole._id } },
      { new: true },
    ).populate("roles", "name -_id");

    return res.status(200).json({
      success: true,
      data: sanitizeUserPayload(updatedUser),
      meta: buildUserMeta({
        req,
        res,
        dataset: "userRoleMutation",
        actorId: req.userId,
        targetUserId,
        action: "DEMOTE_ADMIN",
      }),
    });
  } catch (error) {
    if (error instanceof UserContractError) {
      return sendUserContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "UserController",
      defaultCode: "USER_DEMOTION_FAILED",
    });
  }
};

