import { Router } from "express";
import { verifyToken, isAdmin } from "../middlewares/authJwt.js";
import {
    getSyncEntityStatus,
    getSyncOverview,
    listSyncLogs,
    retrySyncLogs,
} from "../controllers/sync.controller.js";
import {
  adminWriteRateLimiter,
  readApiRateLimiter,
} from "../middlewares/rateLimit.js";

const router = Router();

// All sync routes require authentication
router.use(verifyToken);

/**
 * GET /api/sync/status
 * Get overall sync health status
 */
router.get("/status", readApiRateLimiter, getSyncOverview);

/**
 * GET /api/sync/logs
 * Get recent sync logs
 */
router.get("/logs", readApiRateLimiter, listSyncLogs);

/**
 * POST /api/sync/retry
 * Manually retry failed syncs (Admin only)
 */
router.post("/retry", isAdmin, adminWriteRateLimiter, retrySyncLogs);

/**
 * GET /api/sync/entity/:type/:id
 * Get sync status for a specific entity
 */
router.get("/entity/:type/:id", readApiRateLimiter, getSyncEntityStatus);

export default router;
