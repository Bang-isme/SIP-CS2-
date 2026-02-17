import User from "../models/User.js";
import Role from "../models/Role.js";

const sanitizeUserPayload = (userDoc) => {
  const safeSource = userDoc && typeof userDoc.toObject === "function"
    ? userDoc.toObject()
    : userDoc || {};

  return {
    _id: safeSource._id,
    username: safeSource.username,
    email: safeSource.email,
    roles: safeSource.roles || [],
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

    return res.status(200).json({ success: true, data: sanitizeUserPayload(savedUser) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    const sanitizedUsers = users.map((user) => sanitizeUserPayload(user));
    return res.json({ success: true, data: sanitizedUsers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, data: sanitizeUserPayload(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
