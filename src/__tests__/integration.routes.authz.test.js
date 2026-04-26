import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

const listIntegrationEvents = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getIntegrationEventAudit = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getIntegrationMetrics = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getIntegrationReconciliation = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const repairIntegrationReconciliation = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const retryIntegrationEvent = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const retryDeadIntegrationEvents = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const recoverStuckIntegrationEvents = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const replayIntegrationEvents = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));

jest.unstable_mockModule("../controllers/integration.controller.js", () => ({
  listIntegrationEvents,
  getIntegrationEventAudit,
  getIntegrationMetrics,
  getIntegrationReconciliation,
  repairIntegrationReconciliation,
  retryIntegrationEvent,
  retryDeadIntegrationEvents,
  recoverStuckIntegrationEvents,
  replayIntegrationEvents,
}));

jest.unstable_mockModule("../middlewares/authJwt.js", () => ({
  verifyToken: (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) return res.status(403).json({ message: "No token provided" });
    if (token === "admin-token") {
      req.userId = "admin-user-id";
      req.roleNames = ["admin"];
      return next();
    }
    if (token === "super-admin-token") {
      req.userId = "super-admin-user-id";
      req.roleNames = ["super_admin"];
      return next();
    }
    if (token === "user-token") {
      req.userId = "normal-user-id";
      req.roleNames = ["user"];
      return next();
    }
    return res.status(401).json({ message: "Unauthorized!" });
  },
  isAdmin: (req, res, next) => {
    const roles = req.roleNames || [];
    if (roles.includes("admin") || roles.includes("super_admin")) {
      return next();
    }
    return res.status(403).json({ message: "Require Admin Role!" });
  },
  canManageProducts: (req, res, next) => next(),
}));

const { default: integrationRoutes } = await import("../routes/integration.routes.js");

const app = express();
app.use(express.json());
app.use("/api/integrations", integrationRoutes);

describe("Integration routes authz", () => {
  beforeEach(() => {
    listIntegrationEvents.mockClear();
    getIntegrationEventAudit.mockClear();
    getIntegrationMetrics.mockClear();
    getIntegrationReconciliation.mockClear();
    repairIntegrationReconciliation.mockClear();
    retryIntegrationEvent.mockClear();
    retryDeadIntegrationEvents.mockClear();
    recoverStuckIntegrationEvents.mockClear();
    replayIntegrationEvents.mockClear();
  });

  test("should reject anonymous integration list request", async () => {
    const res = await request(app).get("/api/integrations/events");
    expect(res.status).toBe(403);
    expect(listIntegrationEvents).not.toHaveBeenCalled();
  });

  test("should allow admin integration audit request", async () => {
    const res = await request(app)
      .get("/api/integrations/events/12/audit")
      .set("x-access-token", "admin-token");
    expect(res.status).toBe(200);
    expect(getIntegrationEventAudit).toHaveBeenCalledTimes(1);
  });

  test("should reject non-admin integration metrics request", async () => {
    const res = await request(app)
      .get("/api/integrations/events/metrics")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(403);
    expect(getIntegrationMetrics).not.toHaveBeenCalled();
  });

  test("should allow admin integration metrics request", async () => {
    const res = await request(app)
      .get("/api/integrations/events/metrics")
      .set("x-access-token", "admin-token");
    expect(res.status).toBe(200);
    expect(getIntegrationMetrics).toHaveBeenCalledTimes(1);
  });

  test("should allow admin integration reconciliation request", async () => {
    const res = await request(app)
      .get("/api/integrations/events/reconciliation")
      .set("x-access-token", "admin-token");
    expect(res.status).toBe(200);
    expect(getIntegrationReconciliation).toHaveBeenCalledTimes(1);
  });

  test("should allow admin reconciliation repair request", async () => {
    const res = await request(app)
      .post("/api/integrations/events/reconciliation/repair")
      .set("x-access-token", "admin-token");
    expect(res.status).toBe(200);
    expect(repairIntegrationReconciliation).toHaveBeenCalledTimes(1);
  });

  test("should allow admin retry event request", async () => {
    const res = await request(app)
      .post("/api/integrations/events/retry/12")
      .set("x-access-token", "admin-token");
    expect(res.status).toBe(200);
    expect(retryIntegrationEvent).toHaveBeenCalledTimes(1);
  });

  test("should allow super admin replay request", async () => {
    const res = await request(app)
      .post("/api/integrations/events/replay")
      .set("x-access-token", "super-admin-token")
      .send({ status: "FAILED" });
    expect(res.status).toBe(200);
    expect(replayIntegrationEvents).toHaveBeenCalledTimes(1);
  });

  test("should reject non-admin recover-stuck request", async () => {
    const res = await request(app)
      .post("/api/integrations/events/recover-stuck")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(403);
    expect(recoverStuckIntegrationEvents).not.toHaveBeenCalled();
  });
});
