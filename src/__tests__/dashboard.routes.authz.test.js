import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

const getExecutiveBrief = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getOperationalReadiness = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getEarningsSummary = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getVacationSummary = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getBenefitsSummary = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const refreshDashboardSummaries = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getDrilldown = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const exportDrilldownCsv = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const getDepartments = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));

jest.unstable_mockModule("../controllers/dashboard.controller.js", () => ({
  getExecutiveBrief,
  getOperationalReadiness,
  getEarningsSummary,
  getVacationSummary,
  getBenefitsSummary,
  refreshDashboardSummaries,
  getDrilldown,
  exportDrilldownCsv,
  getDepartments,
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
}));

const { default: dashboardRoutes } = await import("../routes/dashboard.routes.js");

const app = express();
app.use(express.json());
app.use("/api/dashboard", dashboardRoutes);

describe("Dashboard routes authz", () => {
  beforeEach(() => {
    getExecutiveBrief.mockClear();
    getOperationalReadiness.mockClear();
    refreshDashboardSummaries.mockClear();
  });

  test("should reject anonymous executive brief request", async () => {
    const res = await request(app).get("/api/dashboard/executive-brief");
    expect(res.status).toBe(403);
    expect(getExecutiveBrief).not.toHaveBeenCalled();
  });

  test("should allow authenticated users to read executive brief", async () => {
    const res = await request(app)
      .get("/api/dashboard/executive-brief")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(200);
    expect(getExecutiveBrief).toHaveBeenCalledTimes(1);
  });

  test("should allow authenticated users to read operational readiness", async () => {
    const res = await request(app)
      .get("/api/dashboard/operational-readiness")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(200);
    expect(getOperationalReadiness).toHaveBeenCalledTimes(1);
  });

  test("should reject non-admin summary rebuild request", async () => {
    const res = await request(app)
      .post("/api/dashboard/refresh-summaries")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(403);
    expect(refreshDashboardSummaries).not.toHaveBeenCalled();
  });

  test("should allow admin summary rebuild request", async () => {
    const res = await request(app)
      .post("/api/dashboard/refresh-summaries")
      .set("x-access-token", "admin-token");
    expect(res.status).toBe(200);
    expect(refreshDashboardSummaries).toHaveBeenCalledTimes(1);
  });
});
