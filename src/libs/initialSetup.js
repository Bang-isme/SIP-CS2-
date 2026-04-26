import Role from "../models/Role.js";
import User from "../models/User.js";
import { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD, IS_DEFAULT_DEV_ADMIN_PASSWORD } from "../config.js";
import logger from "../utils/logger.js";

const ALL_ROLE_NAMES = ["user", "moderator", "admin", "super_admin"];
const ROOT_ADMIN_ROLE_NAMES = ["user", "super_admin"];
const SHOULD_SKIP_AUTH_SEED = process.env.SKIP_AUTH_SEED === "1";

const isMongoQuotaError = (error) => {
  if (!error) return false;
  const message = `${error.message || ""} ${error?.errorResponse?.errmsg || ""}`.toLowerCase();
  return error.code === 8000 || error?.errorResponse?.code === 8000 || message.includes("space quota");
};

export const createRoles = async () => {
  for (const roleName of ALL_ROLE_NAMES) {
    const existingRole = await Role.findOne({ name: roleName });
    if (!existingRole) {
      await new Role({ name: roleName }).save();
    }
  }
};

export const createAdmin = async () => {
  // check for an existing admin user
  const userFound = await User.findOne({ email: ADMIN_EMAIL });

  // root admin should only have baseline + super_admin role
  const rootRoles = await Role.find({ name: { $in: ROOT_ADMIN_ROLE_NAMES } });
  const roleIds = rootRoles.map((role) => role._id);
  if (roleIds.length !== ROOT_ADMIN_ROLE_NAMES.length) {
    throw new Error("Root admin roles are missing. Ensure createRoles runs first.");
  }

  if (userFound) {
    await User.findByIdAndUpdate(userFound._id, {
      $set: { roles: roleIds },
    });
    return;
  }

  // create a new admin user
  const newUser = await User.create({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    roles: roleIds,
  });

  logger.info("InitialSetup", "Created root admin user", {
    email: newUser.email,
  });
};

export const initializeAuthSeed = async () => {
  if (SHOULD_SKIP_AUTH_SEED) {
    logger.info("InitialSetup", "SKIP_AUTH_SEED=1 -> auth seed skipped.");
    return;
  }

  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is required when auth seed is enabled outside development/test.");
  }

  if (IS_DEFAULT_DEV_ADMIN_PASSWORD) {
    logger.warn(
      "InitialSetup",
      "Using default development admin password. Override ADMIN_PASSWORD before sharing this environment."
    );
  }

  try {
    await createRoles();
    await createAdmin();
  } catch (error) {
    if (isMongoQuotaError(error)) {
      logger.warn("InitialSetup", "Mongo space quota reached. Running without auth seed updates.");
      return;
    }
    throw error;
  }
};
