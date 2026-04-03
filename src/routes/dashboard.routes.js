import { Router } from "express";
import {
    getExecutiveBrief,
    getEarningsSummary,
    getVacationSummary,
    getBenefitsSummary,
    getDrilldown,
    exportDrilldownCsv,
    getDepartments,
} from "../controllers/dashboard.controller.js";
import { verifyToken } from "../middlewares/authJwt.js";

const router = Router();

// All dashboard routes require authentication
router.use(verifyToken);

// Summary endpoints
router.get("/executive-brief", getExecutiveBrief);
router.get("/earnings", getEarningsSummary);
router.get("/vacation", getVacationSummary);
router.get("/benefits", getBenefitsSummary);

// Drill-down endpoint
router.get("/drilldown", getDrilldown);
router.get("/drilldown/export", exportDrilldownCsv);
router.get("/departments", getDepartments);

export default router;
