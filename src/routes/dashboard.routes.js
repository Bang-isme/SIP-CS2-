import { Router } from "express";
import {
    getEarningsSummary,
    getVacationSummary,
    getBenefitsSummary,
    getDrilldown,
} from "../controllers/dashboard.controller.js";
import { verifyToken } from "../middlewares/authJwt.js";

const router = Router();

// All dashboard routes require authentication
router.use(verifyToken);

// Summary endpoints
router.get("/earnings", getEarningsSummary);
router.get("/vacation", getVacationSummary);
router.get("/benefits", getBenefitsSummary);

// Drill-down endpoint
router.get("/drilldown", getDrilldown);

export default router;
