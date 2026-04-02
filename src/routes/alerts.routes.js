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

const router = Router();

// All alert routes require authentication
router.use(verifyToken);

// Alert configuration CRUD
router.get("/", canManageAlerts, getAlerts);
router.post("/", canManageAlerts, createAlert);
router.put("/:id", canManageAlerts, updateAlert);
router.delete("/:id", canManageAlerts, deleteAlert);
router.post("/:id/acknowledge", canManageAlerts, acknowledgeAlert);

// Get triggered alerts
router.get("/triggered", getTriggeredAlerts);

// Get paginated employees for a specific alert type
router.get("/:type/employees", getAlertEmployees);

export default router;
