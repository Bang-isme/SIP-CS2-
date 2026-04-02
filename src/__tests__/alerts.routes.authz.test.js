import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

const getAlerts = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const createAlert = jest.fn((req, res) => res.status(201).json({ success: true, actor: req.userId }));
const updateAlert = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const deleteAlert = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const acknowledgeAlert = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));

jest.unstable_mockModule("../controllers/alerts.controller.js", () => ({
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  acknowledgeAlert,
  getTriggeredAlerts: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
  getAlertEmployees: jest.fn((req, res) => res.status(200).json({ success: true, employees: [] })),
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
    if (token === "moderator-token") {
      req.userId = "moderator-user-id";
      req.roleNames = ["moderator"];
      return next();
    }
    return res.status(401).json({ message: "Unauthorized!" });
  },
  canManageAlerts: (req, res, next) => {
    const roles = req.roleNames || [];
    if (roles.includes("moderator") || roles.includes("admin") || roles.includes("super_admin")) {
      return next();
    }
    return res.status(403).json({ message: "Require Moderator, Admin, or Super Admin Role!" });
  },
  canManageProducts: (req, res, next) => next(),
}));

const { default: alertsRoutes } = await import("../routes/alerts.routes.js");

const app = express();
app.use(express.json());
app.use("/api/alerts", alertsRoutes);

describe("Alert configuration routes authz", () => {
  beforeEach(() => {
    getAlerts.mockClear();
    createAlert.mockClear();
    updateAlert.mockClear();
    deleteAlert.mockClear();
    acknowledgeAlert.mockClear();
  });

  test("should reject anonymous alert config list request", async () => {
    const res = await request(app).get("/api/alerts");
    expect(res.status).toBe(403);
    expect(getAlerts).not.toHaveBeenCalled();
  });

  test("should reject non-manager alert config create request", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .set("x-access-token", "user-token")
      .send({ type: "vacation" });
    expect(res.status).toBe(403);
    expect(createAlert).not.toHaveBeenCalled();
  });

  test("should allow moderator alert config create request", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .set("x-access-token", "moderator-token")
      .send({ type: "vacation" });
    expect(res.status).toBe(201);
    expect(createAlert).toHaveBeenCalledTimes(1);
  });

  test("should allow admin alert config update request", async () => {
    const res = await request(app)
      .put("/api/alerts/507f1f77bcf86cd799439011")
      .set("x-access-token", "admin-token")
      .send({ threshold: 14 });
    expect(res.status).toBe(200);
    expect(updateAlert).toHaveBeenCalledTimes(1);
  });

  test("should reject non-manager acknowledgement request", async () => {
    const res = await request(app)
      .post("/api/alerts/507f1f77bcf86cd799439011/acknowledge")
      .set("x-access-token", "user-token")
      .send({ note: "Following up" });
    expect(res.status).toBe(403);
    expect(acknowledgeAlert).not.toHaveBeenCalled();
  });

  test("should allow moderator acknowledgement request", async () => {
    const res = await request(app)
      .post("/api/alerts/507f1f77bcf86cd799439011/acknowledge")
      .set("x-access-token", "moderator-token")
      .send({ note: "Owner assigned" });
    expect(res.status).toBe(200);
    expect(acknowledgeAlert).toHaveBeenCalledTimes(1);
  });

  test("should keep triggered alerts readable for authenticated non-admin users", async () => {
    const res = await request(app)
      .get("/api/alerts/triggered")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(200);
  });
});
