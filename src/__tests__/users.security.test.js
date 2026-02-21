import request from "supertest";
import { jest } from "@jest/globals";

const mockFindUsers = jest.fn();

jest.unstable_mockModule("../middlewares/authJwt.js", () => ({
  verifyToken: (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }
    req.userId = "mock-user-id";
    return next();
  },
  isAdmin: (req, res, next) => {
    if (req.headers["x-user-role"] === "admin") {
      return next();
    }
    return res.status(403).json({ message: "Require Admin Role!" });
  },
  isSuperAdmin: (req, res, next) => {
    if (req.headers["x-user-role"] === "super_admin") {
      return next();
    }
    return res.status(403).json({ message: "Require Super Admin Role!" });
  },
  isModerator: (req, res, next) => next(),
}));

jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    find: mockFindUsers,
    findById: jest.fn(),
    encryptPassword: jest.fn(async (value) => value),
  },
}));

jest.unstable_mockModule("../models/Role.js", () => ({
  ROLES: ["user", "admin", "moderator", "super_admin"],
  default: {
    find: jest.fn(async () => []),
  },
}));

const { default: app } = await import("../app.js");

describe("Users Endpoint - Security Guardrails", () => {
  beforeEach(() => {
    mockFindUsers.mockResolvedValue([
      {
        _id: "507f1f77bcf86cd799439011",
        username: "admin-user",
        email: "admin@example.com",
        password: 12345,
        tokens: [{ token: 1, signedAt: 1700000000 }],
        roles: ["admin-role-id"],
        createdAt: "2026-02-15T08:00:00.000Z",
        updatedAt: "2026-02-16T08:00:00.000Z",
      },
    ]);
  });

  it("should reject anonymous requests to GET /api/users", async () => {
    const res = await request(app)
      .get("/api/users")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "No token provided");
  });

  it("should reject non-admin requests to GET /api/users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("x-access-token", "valid-user-token")
      .set("x-user-role", "user")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "Require Admin Role!");
  });

  it("should return redacted users for admin requests", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("x-access-token", "valid-admin-token")
      .set("x-user-role", "admin")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      _id: "507f1f77bcf86cd799439011",
      username: "admin-user",
      email: "admin@example.com",
      roles: ["admin-role-id"],
      createdAt: "2026-02-15T08:00:00.000Z",
      updatedAt: "2026-02-16T08:00:00.000Z",
    });
    expect(res.body.data[0]).not.toHaveProperty("password");
    expect(res.body.data[0]).not.toHaveProperty("tokens");
  });
});
