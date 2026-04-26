import { Router } from "express";
import {
    getExecutiveBrief,
    getOperationalReadiness,
    getEarningsSummary,
    getVacationSummary,
    getBenefitsSummary,
    refreshDashboardSummaries,
    getDrilldown,
    exportDrilldownCsv,
    getDepartments,
} from "../controllers/dashboard.controller.js";
import { isAdmin, verifyToken } from "../middlewares/authJwt.js";
import {
  adminWriteRateLimiter,
  dashboardExportRateLimiter,
  dashboardRateLimiter,
} from "../middlewares/rateLimit.js";

const router = Router();

// All dashboard routes require authentication
router.use(verifyToken);
router.use(dashboardRateLimiter);

// Summary endpoints
router.get("/executive-brief", getExecutiveBrief);
router.get("/operational-readiness", getOperationalReadiness);
router.get("/earnings", getEarningsSummary);
router.get("/vacation", getVacationSummary);
router.get("/benefits", getBenefitsSummary);
router.post("/refresh-summaries", isAdmin, adminWriteRateLimiter, refreshDashboardSummaries);

// Drill-down endpoint
router.get("/drilldown", getDrilldown);
router.get("/drilldown/export", dashboardExportRateLimiter, exportDrilldownCsv);
router.get("/departments", getDepartments);

export default router;
