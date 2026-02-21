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
const router = Router();

router.post("/", [verifyToken, isAdmin, checkExistingUser], createUser);
router.get("/", [verifyToken, isAdmin], getUsers);
router.get("/:userId", [verifyToken, isAdmin], getUser);
router.put("/:id/promote-admin", [verifyToken, isSuperAdmin], promoteUserToAdmin);
router.put("/:id/demote-admin", [verifyToken, isSuperAdmin], demoteUserFromAdmin);

export default router;
