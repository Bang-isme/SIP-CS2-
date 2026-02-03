import { Router } from "express";
import { verifyToken, isAdmin } from "../middlewares/authJwt.js";
import {
    listIntegrationEvents,
    retryIntegrationEvent,
    retryDeadIntegrationEvents,
    replayIntegrationEvents,
} from "../controllers/integration.controller.js";

const router = Router();

// All integration routes require authentication
router.use(verifyToken);

/**
 * GET /api/integrations/events
 * Query: status, limit, page
 */
router.get("/events", isAdmin, listIntegrationEvents);

/**
 * POST /api/integrations/events/retry/:id
 * Admin only
 */
router.post("/events/retry/:id", isAdmin, retryIntegrationEvent);

/**
 * POST /api/integrations/events/retry-dead
 * Admin only
 */
router.post("/events/retry-dead", isAdmin, retryDeadIntegrationEvents);

/**
 * POST /api/integrations/events/replay
 * Admin only - replay by filters (status/entity/date)
 */
router.post("/events/replay", isAdmin, replayIntegrationEvents);

export default router;
