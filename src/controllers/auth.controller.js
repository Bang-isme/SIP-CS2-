import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { SECRET } from "../config.js";

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
    const { username, email, password } = req.body;

    // Creating a new User Object
    const newUser = new User({
      username,
      email,
      password,
    });

    // Security hardening: signup always gets baseline "user" role.
    const role = await Role.findOne({ name: "user" });
    if (!role) {
      return res.status(500).json({
        success: false,
        message: "Default role configuration is missing",
      });
    }
    newUser.roles = [role._id];

    const savedUser = await newUser.save();

    // Create a token
    const token = jwt.sign({ id: savedUser._id }, SECRET, {
      expiresIn: 86400, // 24 hours
    });

    await User.findByIdAndUpdate(savedUser._id, {
      tokens: [{ token, signedAt: Date.now().toString() }],
    });

    const createdUser = await User.findById(savedUser._id).populate("roles", "name -_id");
    return res.status(200).json({
      success: true,
      data: sanitizeAuthUser(createdUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, msg: error.message });
  }
};

export const signinHandler = async (req, res) => {
  try {
    // Request body email can be an email or username
    const userFound = await User.findOne({ email: req.body.email }).populate(
      "roles"
    );

    if (!userFound) return res.status(400).json({ message: "User Not Found" });

    const matchPassword = await User.comparePassword(
      req.body.password,
      userFound.password
    );

    if (!matchPassword)
      return res.status(401).json({
        success: false,
        token: null,
        message: "Invalid Password",
      });
      
    const token = jwt.sign({ id: userFound._id }, SECRET, {
      expiresIn: 86400, // 24 hours
    });

    await User.findByIdAndUpdate(userFound._id, {
      tokens: [{ token, signedAt: Date.now().toString() }],
    });

    return res.json({ success: true, data: sanitizeAuthUser(userFound), token });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logoutHandler = async (req, res) => {
  const token = req.headers?.["x-access-token"];
  if (!token) {
    return res.status(401).json({ success: false, message: "Authorization fail!" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await User.findById(decoded.id, { password: 0 });
    if (!user) return res.status(404).json({ message: "No user found" });
    await User.findByIdAndUpdate(decoded.id, { tokens: [] });
    return res.json({ success: true, message: "Sign out successfully!" });
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized!" });
  }
};

export const meHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("roles", "name -_id");
    if (!user) {
      return res.status(404).json({ success: false, message: "No user found" });
    }

    return res.json({
      success: true,
      data: sanitizeAuthUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

