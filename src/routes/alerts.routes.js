import { Router } from "express";
import {
    getAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    getTriggeredAlerts,
    getAlertEmployees,
} from "../controllers/alerts.controller.js";
import { verifyToken } from "../middlewares/authJwt.js";

const router = Router();

// All alert routes require authentication
router.use(verifyToken);

// Alert configuration CRUD
router.get("/", getAlerts);
router.post("/", createAlert);
router.put("/:id", updateAlert);
router.delete("/:id", deleteAlert);

// Get triggered alerts
router.get("/triggered", getTriggeredAlerts);

// Get paginated employees for a specific alert type
router.get("/:type/employees", getAlertEmployees);

export default router;
