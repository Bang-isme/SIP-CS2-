import { Router } from "express";
import {
    getAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    getTriggeredAlerts,
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

export default router;
