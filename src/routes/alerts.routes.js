import { Router } from "express";
import {
    getAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    acknowledgeAlert,
    getTriggeredAlerts,
    getAlertEmployees,
} from "../controllers/alerts.controller.js";
import { verifyToken, canManageAlerts } from "../middlewares/authJwt.js";
import {
  adminWriteRateLimiter,
  readApiRateLimiter,
} from "../middlewares/rateLimit.js";

const router = Router();

// All alert routes require authentication
router.use(verifyToken);
router.use(readApiRateLimiter);

// Alert configuration CRUD
router.get("/", canManageAlerts, getAlerts);
router.post("/", canManageAlerts, adminWriteRateLimiter, createAlert);
router.put("/:id", canManageAlerts, adminWriteRateLimiter, updateAlert);
router.delete("/:id", canManageAlerts, adminWriteRateLimiter, deleteAlert);
router.post("/:id/acknowledge", canManageAlerts, adminWriteRateLimiter, acknowledgeAlert);

// Get triggered alerts
router.get("/triggered", getTriggeredAlerts);

// Get paginated employees for a specific alert type
router.get("/:type/employees", getAlertEmployees);

export default router;
