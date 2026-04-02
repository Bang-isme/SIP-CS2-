import { Router } from "express";
import { verifyToken, isAdmin } from "../middlewares/authJwt.js";
import {
    getSyncEntityStatus,
    getSyncOverview,
    listSyncLogs,
    retrySyncLogs,
} from "../controllers/sync.controller.js";

const router = Router();

// All sync routes require authentication
router.use(verifyToken);

/**
 * GET /api/sync/status
 * Get overall sync health status
 */
router.get("/status", getSyncOverview);

/**
 * GET /api/sync/logs
 * Get recent sync logs
 */
router.get("/logs", listSyncLogs);

/**
 * POST /api/sync/retry
 * Manually retry failed syncs (Admin only)
 */
router.post("/retry", isAdmin, retrySyncLogs);

/**
 * GET /api/sync/entity/:type/:id
 * Get sync status for a specific entity
 */
router.get("/entity/:type/:id", getSyncEntityStatus);

export default router;
