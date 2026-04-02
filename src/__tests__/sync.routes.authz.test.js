import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

const getSyncOverview = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const listSyncLogs = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const retrySyncLogs = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getSyncEntityStatus = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));

jest.unstable_mockModule("../controllers/sync.controller.js", () => ({
  getSyncOverview,
  listSyncLogs,
  retrySyncLogs,
  getSyncEntityStatus,
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

const { default: syncRoutes } = await import("../routes/sync.routes.js");

const app = express();
app.use(express.json());
app.use("/api/sync", syncRoutes);

describe("sync routes authz", () => {
  beforeEach(() => {
    getSyncOverview.mockClear();
    listSyncLogs.mockClear();
    retrySyncLogs.mockClear();
    getSyncEntityStatus.mockClear();
  });

  test("should reject anonymous sync overview request", async () => {
    const res = await request(app).get("/api/sync/status");
    expect(res.status).toBe(403);
    expect(getSyncOverview).not.toHaveBeenCalled();
  });

  test("should allow authenticated sync logs request", async () => {
    const res = await request(app)
      .get("/api/sync/logs")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(200);
    expect(listSyncLogs).toHaveBeenCalledTimes(1);
  });

  test("should reject non-admin sync retry request", async () => {
    const res = await request(app)
      .post("/api/sync/retry")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(403);
    expect(retrySyncLogs).not.toHaveBeenCalled();
  });

  test("should allow admin sync retry request", async () => {
    const res = await request(app)
      .post("/api/sync/retry")
      .set("x-access-token", "admin-token");
    expect(res.status).toBe(200);
    expect(retrySyncLogs).toHaveBeenCalledTimes(1);
  });

  test("should allow authenticated entity sync status request", async () => {
    const res = await request(app)
      .get("/api/sync/entity/employee/EMP001")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(200);
    expect(getSyncEntityStatus).toHaveBeenCalledTimes(1);
  });
});
