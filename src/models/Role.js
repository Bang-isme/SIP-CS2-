import mongoose from "mongoose";

export const ROLES = ["user", "admin", "moderator", "super_admin"];

const roleSchema = new mongoose.Schema(
  {
    name: String,
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("Role", roleSchema);
