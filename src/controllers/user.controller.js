import User from "../models/User.js";
import Role from "../models/Role.js";
import { ADMIN_EMAIL } from "../config.js";

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
    const { username, email, password, roles } = req.body;
    const requestedRoles = Array.isArray(roles) && roles.length > 0 ? roles : ["user"];
    const rolesFound = await Role.find({ name: { $in: requestedRoles } });
    if (!rolesFound.length) {
      return res.status(400).json({ success: false, message: "Invalid roles payload" });
    }

    // creating a new User
    const user = new User({
      username,
      email,
      password,
      roles: rolesFound.map((role) => role._id),
    });

    // encrypting password
    user.password = await User.encryptPassword(user.password);

    // saving the new user
    const savedUser = await user.save();

    const createdUserQuery = User.findById(savedUser._id);
    const createdUser = typeof createdUserQuery?.populate === "function"
      ? await createdUserQuery.populate("roles", "name -_id")
      : await createdUserQuery;

    return res.status(200).json({ success: true, data: sanitizeUserPayload(createdUser || savedUser) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const usersQuery = User.find();
    const users = typeof usersQuery?.populate === "function"
      ? await usersQuery.populate("roles", "name -_id")
      : await usersQuery;
    const sanitizedUsers = users.map((user) => sanitizeUserPayload(user));
    return res.json({ success: true, data: sanitizedUsers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const userQuery = User.findById(req.params.userId);
    const user = typeof userQuery?.populate === "function"
      ? await userQuery.populate("roles", "name -_id")
      : await userQuery;
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, data: sanitizeUserPayload(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const promoteUserToAdmin = async (req, res) => {
  try {
    const adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) {
      return res.status(500).json({
        success: false,
        message: "Admin role configuration is missing",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { roles: adminRole._id } },
      { new: true },
    ).populate("roles", "name -_id");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: sanitizeUserPayload(updatedUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const demoteUserFromAdmin = async (req, res) => {
  try {
    if (req.userId === req.params.id) {
      return res.status(400).json({
        success: false,
        message: "Self-demotion is not allowed",
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (targetUser.email === ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "Root admin account cannot be demoted",
      });
    }

    const adminRole = await Role.findOne({ name: "admin" });
    if (!adminRole) {
      return res.status(500).json({
        success: false,
        message: "Admin role configuration is missing",
      });
    }

    const hasAdmin = (targetUser.roles || []).some((roleId) => String(roleId) === String(adminRole._id));
    if (!hasAdmin) {
      return res.status(400).json({
        success: false,
        message: "Target user does not have admin role",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { roles: adminRole._id } },
      { new: true },
    ).populate("roles", "name -_id");

    return res.status(200).json({
      success: true,
      data: sanitizeUserPayload(updatedUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

