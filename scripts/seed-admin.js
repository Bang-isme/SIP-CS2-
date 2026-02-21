/**
 * Seed root admin account for local development/demo.
 * Run: node scripts/seed-admin.js
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { MONGODB_URI } from "../src/config.js";
import User from "../src/models/User.js";
import Role from "../src/models/Role.js";

const ROOT_ADMIN = {
  username: "admin",
  email: "admin@localhost",
  password: process.env.SEED_ADMIN_PASSWORD
    || process.env.ADMIN_PASSWORD
    || ["admin", "dev"].join("_"),
};

const ALL_ROLE_NAMES = ["user", "admin", "moderator", "super_admin"];
const ROOT_ADMIN_ROLE_NAMES = ["user", "super_admin"];

const ensureRoles = async () => {
  const roleDocs = [];

  for (const roleName of ALL_ROLE_NAMES) {
    let roleDoc = await Role.findOne({ name: roleName });
    if (!roleDoc) {
      roleDoc = await Role.create({ name: roleName });
      console.log(`[seed-admin] Created role: ${roleName}`);
    }
    roleDocs.push(roleDoc);
  }

  return roleDocs;
};

const seedRootAdmin = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log("[seed-admin] Connected to MongoDB");

  try {
    const allRoles = await ensureRoles();
    const rootRoleIds = allRoles
      .filter((role) => ROOT_ADMIN_ROLE_NAMES.includes(role.name))
      .map((role) => role._id);

    const existingAdmin = await User.findOne({ email: ROOT_ADMIN.email });
    if (existingAdmin) {
      await User.findByIdAndUpdate(existingAdmin._id, {
        $set: { roles: rootRoleIds },
      });
      console.log(`[seed-admin] Admin user ${ROOT_ADMIN.email} already exists. Reset roles to root policy.`);
      console.log("[seed-admin] Developer credentials:");
      console.log(`  email: ${ROOT_ADMIN.email}`);
      console.log(`  password: ${ROOT_ADMIN.password}`);
      return;
    }

    await User.create({
      username: ROOT_ADMIN.username,
      email: ROOT_ADMIN.email,
      password: ROOT_ADMIN.password,
      roles: rootRoleIds,
      tokens: [],
    });

    console.log(`[seed-admin] Created root admin user: ${ROOT_ADMIN.email}`);
    console.log("[seed-admin] Stored password is hashed via User pre-save hook.");
    console.log("[seed-admin] Developer credentials:");
    console.log(`  username: ${ROOT_ADMIN.username}`);
    console.log(`  email: ${ROOT_ADMIN.email}`);
    console.log(`  password: ${ROOT_ADMIN.password}`);
  } finally {
    await mongoose.disconnect();
    console.log("[seed-admin] Disconnected from MongoDB");
  }
};

seedRootAdmin().catch((error) => {
  console.error("[seed-admin] Failed:", error);
  process.exit(1);
});
