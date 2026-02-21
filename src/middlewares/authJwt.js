import jwt from "jsonwebtoken";
import { SECRET } from "../config.js";
import User from "../models/User.js";
import Role from "../models/Role.js";

const getUserRoleNames = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return [];
  const roles = await Role.find({ _id: { $in: user.roles } });
  return roles.map((role) => String(role.name || "").toLowerCase()).filter(Boolean);
};

const authorizeAnyRole = async (req, res, next, allowedRoles, message) => {
  try {
    const roleNames = await getUserRoleNames(req.userId);
    const hasRole = roleNames.some((roleName) => allowedRoles.includes(roleName));
    if (hasRole) {
      return next();
    }
    return res.status(403).json({ message });
  } catch (error) {
    return res.status(500).send({ message: error });
  }
};

export const verifyToken = async (req, res, next) => {
  let token = req.headers["x-access-token"];

  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;

    const user = await User.findById(req.userId, { password: 0 });
    if (!user) return res.status(404).json({ message: "No user found" });

    const orgTokens = (user.tokens || []).filter(t => t.token === token);
    if (orgTokens.length === 0) {
      return res.status(401).json({ message: "Token is died" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized!" });
  }
};

export const isModerator = async (req, res, next) => {
  return authorizeAnyRole(req, res, next, ["moderator"], "Require Moderator Role!");
};

export const isAdmin = async (req, res, next) => {
  return authorizeAnyRole(req, res, next, ["admin", "super_admin"], "Require Admin Role!");
};

export const isSuperAdmin = async (req, res, next) => {
  return authorizeAnyRole(req, res, next, ["super_admin"], "Require Super Admin Role!");
};
