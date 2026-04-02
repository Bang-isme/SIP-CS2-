import { Router } from "express";
import {
  getHealthSummary,
  getIntegrationHealthSummary,
  liveHandler,
  readyHandler,
} from "../controllers/health.controller.js";

const router = Router();

router.get("/", getHealthSummary);
router.get("/integrations", getIntegrationHealthSummary);
router.get("/ready", readyHandler);
router.get("/live", liveHandler);

export default router;
