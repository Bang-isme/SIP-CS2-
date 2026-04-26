import { Router } from "express";
import { verifyToken, isAdmin } from "../middlewares/authJwt.js";
import {
    listIntegrationEvents,
    getIntegrationEventAudit,
    getIntegrationMetrics,
    getIntegrationReconciliation,
    repairIntegrationReconciliation,
    retryIntegrationEvent,
    retryDeadIntegrationEvents,
    recoverStuckIntegrationEvents,
    replayIntegrationEvents,
} from "../controllers/integration.controller.js";
import {
  adminOpsRateLimiter,
  adminWriteRateLimiter,
} from "../middlewares/rateLimit.js";

const router = Router();

// All integration routes require authentication
router.use(verifyToken);

/**
 * GET /api/integrations/events
 * Query: status, limit, page
 */
router.get("/events", isAdmin, adminOpsRateLimiter, listIntegrationEvents);
router.get("/events/:id/audit", isAdmin, adminOpsRateLimiter, getIntegrationEventAudit);

/**
 * GET /api/integrations/events/metrics
 * Admin only
 */
router.get("/events/metrics", isAdmin, adminOpsRateLimiter, getIntegrationMetrics);
router.get("/events/reconciliation", isAdmin, adminOpsRateLimiter, getIntegrationReconciliation);
router.post(
    "/events/reconciliation/repair",
    isAdmin,
    adminWriteRateLimiter,
    repairIntegrationReconciliation,
);

/**
 * POST /api/integrations/events/retry/:id
 * Admin only
 */
router.post("/events/retry/:id", isAdmin, adminWriteRateLimiter, retryIntegrationEvent);

/**
 * POST /api/integrations/events/retry-dead
 * Admin only
 */
router.post("/events/retry-dead", isAdmin, adminWriteRateLimiter, retryDeadIntegrationEvents);

/**
 * POST /api/integrations/events/recover-stuck
 * Admin only
 */
router.post("/events/recover-stuck", isAdmin, adminWriteRateLimiter, recoverStuckIntegrationEvents);

/**
 * POST /api/integrations/events/replay
 * Admin only - replay by filters (status/entity/date)
 */
router.post("/events/replay", isAdmin, adminWriteRateLimiter, replayIntegrationEvents);

export default router;
