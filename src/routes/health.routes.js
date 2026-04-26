import { Router } from "express";
import { createHealthHandlers } from "../controllers/health.controller.js";

export const createHealthRouter = (options = {}) => {
  const router = Router();
  const handlers = createHealthHandlers(options);

  router.get("/", handlers.getHealthSummary);
  if (options.includeIntegrationHealth !== false) {
    router.get("/integrations", handlers.getIntegrationHealthSummary);
  }
  router.get("/ready", handlers.readyHandler);
  router.get("/live", handlers.liveHandler);

  return router;
};

export default createHealthRouter();
