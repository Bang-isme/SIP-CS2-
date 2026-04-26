import { Router } from "express";
import {
  createUser,
  demoteUserFromAdmin,
  getUsers,
  getUser,
  promoteUserToAdmin,
} from "../controllers/user.controller.js";
import { isAdmin, isSuperAdmin, verifyToken } from "../middlewares/authJwt.js";
import { checkExistingUser } from "../middlewares/verifySignup.js";
import {
  adminWriteRateLimiter,
  readApiRateLimiter,
} from "../middlewares/rateLimit.js";
const router = Router();

router.post("/", [verifyToken, isAdmin, adminWriteRateLimiter, checkExistingUser], createUser);
router.get("/", [verifyToken, isAdmin, readApiRateLimiter], getUsers);
router.get("/:userId", [verifyToken, isAdmin, readApiRateLimiter], getUser);
router.put("/:id/promote-admin", [verifyToken, isSuperAdmin, adminWriteRateLimiter], promoteUserToAdmin);
router.put("/:id/demote-admin", [verifyToken, isSuperAdmin, adminWriteRateLimiter], demoteUserFromAdmin);

export default router;
