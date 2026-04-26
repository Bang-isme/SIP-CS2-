import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import logger from "../utils/logger.js";

const userTokenSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
    signedAt: {
      type: String,
      trim: true,
    },
    kind: {
      type: String,
      enum: ["access", "refresh"],
      default: "access",
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    tokens: [userTokenSchema],
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.statics.encryptPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

userSchema.statics.comparePassword = async (password, receivedPassword) => {
  try {
    return await bcrypt.compare(password, receivedPassword);
  } catch (error) {
    logger.error("UserModel", "Static password comparison failed", error);
    return false;
  }
};

userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  next();
});

userSchema.methods.comparePassword = async function (password) {
  if (!password) throw new Error("Password is missing, cannot compare.");
  try {
    const result = await bcrypt.compare(password, this.password);
    return result;
  } catch (error) {
    logger.error("UserModel", "Instance password comparison failed", error);
    return false;
  }
};

export default mongoose.model("User", userSchema);
