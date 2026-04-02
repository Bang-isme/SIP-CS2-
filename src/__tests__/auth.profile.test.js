import request from "supertest";
import { jest } from "@jest/globals";

const mockFindById = jest.fn();

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
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
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

describe("Auth Profile Endpoint - /api/auth/me", () => {
  beforeEach(() => {
    mockFindById.mockImplementation(() => ({
      populate: jest.fn(async () => ({
        _id: "507f1f77bcf86cd799439011",
        username: "admin-user",
        email: "admin@example.com",
        password: 12345,
        tokens: [{ token: 1, signedAt: 1700000000 }],
        roles: [{ name: "admin" }, { name: "user" }],
        createdAt: "2026-02-16T08:00:00.000Z",
        updatedAt: "2026-02-16T08:30:00.000Z",
      })),
    }));
  });

  it("should reject anonymous request for /api/auth/me", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "No token provided");
  });

  it("should return sanitized user profile with roles", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("x-request-id", "req-auth-me-1")
      .set("x-access-token", "valid-token")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      _id: "507f1f77bcf86cd799439011",
      username: "admin-user",
      email: "admin@example.com",
      roles: ["admin", "user"],
      createdAt: "2026-02-16T08:00:00.000Z",
      updatedAt: "2026-02-16T08:30:00.000Z",
    });
    expect(res.body.meta).toEqual(expect.objectContaining({
      dataset: "authProfile",
      requestId: "req-auth-me-1",
    }));
    expect(res.body.data).not.toHaveProperty("password");
    expect(res.body.data).not.toHaveProperty("tokens");
  });
});
