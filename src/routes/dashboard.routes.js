import { Router } from "express";
import {
    getEarningsSummary,
    getVacationSummary,
    getBenefitsSummary,
    getDrilldown,
    getDepartments,
} from "../controllers/dashboard.controller.js";
import { verifyToken, isAdmin, } from "../middlewares/authJwt.js";

const router = Router();

// All dashboard routes require authentication
router.use(verifyToken);

// Summary endpoints
router.get("/earnings", getEarningsSummary);
router.get("/vacation", getVacationSummary);
router.get("/benefits", getBenefitsSummary);

// Drill-down endpoint
router.get("/drilldown", getDrilldown);
router.get("/departments", getDepartments);

export default router;
