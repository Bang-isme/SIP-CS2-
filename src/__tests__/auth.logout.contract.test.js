import request from "supertest";
import { jest } from "@jest/globals";

const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.unstable_mockModule("../middlewares/authJwt.js", () => ({
  verifyToken: (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }
    req.userId = "507f1f77bcf86cd799439011";
    return next();
  },
  canManageAlerts: (req, res, next) => next(),
  canManageProducts: (req, res, next) => next(),
  isAdmin: (req, res, next) => next(),
  isSuperAdmin: (req, res, next) => next(),
  isModerator: (req, res, next) => next(),
}));

jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findById: mockFindById,
    findByIdAndUpdate: mockFindByIdAndUpdate,
    findOne: jest.fn(),
    comparePassword: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/Role.js", () => ({
  ROLES: ["user", "admin", "moderator", "super_admin"],
  default: {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => ({ _id: "role-user-id" })),
  },
}));

const { default: app } = await import("../app.js");

describe("Auth logout contract", () => {
  beforeEach(() => {
    mockFindById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      tokens: [
        { token: "active-token" },
        { token: "other-token" },
      ],
    });
    mockFindByIdAndUpdate.mockResolvedValue({});
  });

  it("should revoke current token via canonical POST /api/auth/logout", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("x-request-id", "req-auth-logout-1")
      .set("x-access-token", "active-token")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Sign out successfully!");
    expect(res.body.meta).toEqual(expect.objectContaining({
      dataset: "authLogout",
      requestId: "req-auth-logout-1",
    }));
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      { tokens: [{ token: "other-token" }] },
    );
  });

  it("should keep deprecated GET /api/auth/logout alias working", async () => {
    const res = await request(app)
      .get("/api/auth/logout")
      .set("x-access-token", "active-token")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers["deprecation"]).toBe("true");
    expect(res.headers["sunset"]).toBe("Wed, 01 Jul 2026 00:00:00 GMT");
    expect(res.headers["link"]).toContain("/api/contracts/openapi.json");
  });
});
