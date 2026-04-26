import { Router } from "express";
import {
  createEmployee,
  getEmployees,
  getEmployee,
  getEmployeeSyncEvidence,
  updateEmployee,
  deleteEmployee,
  getEmployeeOptions,
} from "../controllers/employee.controller.js";
import { isSuperAdmin, verifyToken } from "../middlewares/authJwt.js";
import {
  adminWriteRateLimiter,
  readApiRateLimiter,
} from "../middlewares/rateLimit.js";

const router = Router();

// Read endpoints require authentication
router.get("/", [verifyToken, readApiRateLimiter], getEmployees);
router.get("/options", [verifyToken, isSuperAdmin, readApiRateLimiter], getEmployeeOptions);
router.get("/:employeeId/sync-evidence", [verifyToken, isSuperAdmin, readApiRateLimiter], getEmployeeSyncEvidence);
router.get("/:employeeId", [verifyToken, readApiRateLimiter], getEmployee);

// Mutation endpoints are super-admin only
router.post("/", [verifyToken, isSuperAdmin, adminWriteRateLimiter], createEmployee);
router.put("/:id", [verifyToken, isSuperAdmin, adminWriteRateLimiter], updateEmployee);
router.delete("/:id", [verifyToken, isSuperAdmin, adminWriteRateLimiter], deleteEmployee);

export default router;
