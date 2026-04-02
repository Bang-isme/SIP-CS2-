import request from "supertest";
import { jest } from "@jest/globals";

const mockFindOne = jest.fn();
const mockComparePassword = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findOne: mockFindOne,
    comparePassword: mockComparePassword,
    findByIdAndUpdate: mockFindByIdAndUpdate,
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

describe("Auth Signin Response - Security Guardrails", () => {
  const originalAllowStatelessFallback = process.env.ALLOW_STATELESS_JWT_FALLBACK;
  const userDoc = {
    _id: "507f1f77bcf86cd799439011",
    username: "admin-user",
    email: "admin@example.com",
    password: 12345,
    tokens: [{ token: 1, signedAt: 1700000000 }],
    roles: [{ name: "admin" }],
    createdAt: "2026-02-16T08:00:00.000Z",
    updatedAt: "2026-02-16T08:30:00.000Z",
  };

  beforeEach(() => {
    delete process.env.ALLOW_STATELESS_JWT_FALLBACK;
    mockFindByIdAndUpdate.mockResolvedValue({});
    mockFindOne.mockImplementation(() => ({
      populate: jest.fn(async () => userDoc),
    }));
    mockComparePassword.mockResolvedValue(true);
  });

  afterEach(() => {
    if (originalAllowStatelessFallback === undefined) {
      delete process.env.ALLOW_STATELESS_JWT_FALLBACK;
    } else {
      process.env.ALLOW_STATELESS_JWT_FALLBACK = originalAllowStatelessFallback;
    }
  });

  it("should return sanitized user data on sign in", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({
        identifier: "admin-user",
        password: "admin",
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.meta).toEqual(expect.objectContaining({
      dataset: "authSignin",
      identifierType: "username",
    }));
    expect(res.body.data).toMatchObject({
      _id: "507f1f77bcf86cd799439011",
      username: "admin-user",
      email: "admin@example.com",
      roles: ["admin"],
    });
    expect(mockFindOne).toHaveBeenCalledWith({
      $or: [
        { username: "admin-user" },
        { email: "admin-user" },
      ],
    });
    expect(res.body.data).not.toHaveProperty("password");
    expect(res.body.data).not.toHaveProperty("tokens");
  });

  it("should return 401 for invalid password", async () => {
    mockComparePassword.mockResolvedValue(false);

    const res = await request(app)
      .post("/api/auth/signin")
      .send({
        email: "admin@example.com",
        password: 99999,
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message", "Invalid credentials");
    expect(res.body).not.toHaveProperty("token");
  });

  it("should return 422 when identifier is missing", async () => {
    const res = await request(app)
      .post("/api/auth/signin")
      .send({
        password: "admin",
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "identifier" }),
    ]));
  });

  it("should return 503 when token persistence is unavailable and stateless fallback is disabled", async () => {
    mockFindByIdAndUpdate.mockRejectedValue({
      code: 8000,
      message: "you are over your space quota",
    });

    const res = await request(app)
      .post("/api/auth/signin")
      .send({
        email: "admin@example.com",
        password: "admin",
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(503);
    expect(res.body).toEqual(expect.objectContaining({
      success: false,
      code: "AUTH_SESSION_STORAGE_UNAVAILABLE",
    }));
    expect(res.body.message).toContain("ALLOW_STATELESS_JWT_FALLBACK=1");
    expect(res.body).not.toHaveProperty("token");
  });

  it("should continue signin in stateless fallback mode when explicitly enabled", async () => {
    process.env.ALLOW_STATELESS_JWT_FALLBACK = "1";
    mockFindByIdAndUpdate.mockRejectedValue({
      code: 8000,
      message: "you are over your space quota",
    });

    const res = await request(app)
      .post("/api/auth/signin")
      .send({
        email: "admin@example.com",
        password: "admin",
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.meta).toEqual(expect.objectContaining({
      sessionMode: "statelessFallback",
    }));
  });
});
