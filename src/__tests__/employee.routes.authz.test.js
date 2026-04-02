import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

const createEmployee = jest.fn((req, res) => {
  return res.status(201).json({ success: true, actor: req.userId });
});

const updateEmployee = jest.fn((req, res) => {
  return res.status(200).json({ success: true, actor: req.userId });
});

jest.unstable_mockModule("../controllers/employee.controller.js", () => ({
  createEmployee,
  updateEmployee,
  deleteEmployee: jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId })),
  getEmployee: jest.fn((req, res) => res.status(200).json({ success: true })),
  getEmployees: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
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

const { default: employeeRoutes } = await import("../routes/employee.routes.js");

const app = express();
app.use(express.json());
app.use("/api/employee", employeeRoutes);

describe("Employee routes authz hardening", () => {
  beforeEach(() => {
    createEmployee.mockClear();
    updateEmployee.mockClear();
  });

  test("should reject anonymous create request", async () => {
    const res = await request(app).post("/api/employee").send({ employeeId: "EMP0001" });
    expect(res.status).toBe(403);
  });

  test("should reject non-admin create request", async () => {
    const res = await request(app)
      .post("/api/employee")
      .set("x-access-token", "user-token")
      .send({ employeeId: "EMP0002" });
    expect(res.status).toBe(403);
    expect(createEmployee).not.toHaveBeenCalled();
  });

  test("should allow admin create request", async () => {
    const res = await request(app)
      .post("/api/employee")
      .set("x-access-token", "admin-token")
      .send({ employeeId: "EMP0003" });
    expect(res.status).toBe(201);
    expect(createEmployee).toHaveBeenCalledTimes(1);
  });

  test("should reject non-admin update request", async () => {
    const res = await request(app)
      .put("/api/employee/507f1f77bcf86cd799439011")
      .set("x-access-token", "user-token")
      .send({ payRate: 42 });
    expect(res.status).toBe(403);
    expect(updateEmployee).not.toHaveBeenCalled();
  });

  test("should allow super admin update request", async () => {
    const res = await request(app)
      .put("/api/employee/507f1f77bcf86cd799439011")
      .set("x-access-token", "super-admin-token")
      .send({ payRate: 48 });
    expect(res.status).toBe(200);
    expect(updateEmployee).toHaveBeenCalledTimes(1);
  });
});
