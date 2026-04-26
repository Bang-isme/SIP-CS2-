import { Router } from "express";
import {
  getPayrollConsoleConfig,
  getPayrollInternalHealth,
  getPayrollPayRateByEmployeeId,
  getPayrollSyncLogByEmployeeId,
  listPayrollPayRates,
  listPayrollSyncLog,
  syncPayrollInternalMutation,
} from "../controllers/payroll.controller.js";
import { verifyToken } from "../middlewares/authJwt.js";
import { verifyInternalServiceRequest } from "../middlewares/internalServiceAuth.js";
import { readApiRateLimiter } from "../middlewares/rateLimit.js";

export const createPayrollRouter = ({ healthHandler } = {}) => {
  const router = Router();

  router.get("/config", getPayrollConsoleConfig);
  if (typeof healthHandler === "function") {
    router.get("/health", healthHandler);
  }
  router.get("/internal/health", verifyInternalServiceRequest, getPayrollInternalHealth);
  router.post("/internal/sync", verifyInternalServiceRequest, syncPayrollInternalMutation);

  router.use(verifyToken);
  router.use(readApiRateLimiter);

  router.get("/pay-rates", listPayrollPayRates);
  router.get("/pay-rates/:employeeId", getPayrollPayRateByEmployeeId);
  router.get("/sync-log", listPayrollSyncLog);
  router.get("/sync-log/:employeeId", getPayrollSyncLogByEmployeeId);

  return router;
};
