import Role from "../models/Role.js";
import User from "../models/User.js";
import { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } from "../config.js";

const ALL_ROLE_NAMES = ["user", "moderator", "admin", "super_admin"];
const ROOT_ADMIN_ROLE_NAMES = ["user", "super_admin"];

export const createRoles = async () => {
  try {
    for (const roleName of ALL_ROLE_NAMES) {
      const existingRole = await Role.findOne({ name: roleName });
      if (!existingRole) {
        await new Role({ name: roleName }).save();
      }
    }
  } catch (error) {
    console.error(error);
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

  console.log(`new user created: ${newUser.email}`);
};

export const initializeAuthSeed = async () => {
  await createRoles();
  await createAdmin();
};

initializeAuthSeed().catch((error) => {
  console.error("initialSetup failed:", error.message);
});
