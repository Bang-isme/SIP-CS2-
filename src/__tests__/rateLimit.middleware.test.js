import request from "supertest";
import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { REFRESH_SECRET } from "../config.js";

const mockFindOne = jest.fn();
const mockComparePassword = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findOne: mockFindOne,
    comparePassword: mockComparePassword,
    findById: mockFindById,
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
const { dashboardRateLimiter, resetAllRateLimiters } = await import("../middlewares/rateLimit.js");

const invokeRateLimiter = (middleware, reqOverrides = {}) => new Promise((resolve) => {
  const res = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = String(value);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      resolve({
        next: false,
        status: this.statusCode,
        body,
        headers: this.headers,
      });
      return this;
    },
  };
  const req = {
    headers: {},
    ip: "203.0.113.42",
    connection: { remoteAddress: "203.0.113.42" },
    ...reqOverrides,
  };

  middleware(req, res, () => resolve({
    next: true,
    status: res.statusCode,
    headers: res.headers,
  }));
});

describe("Rate limit middleware", () => {
  beforeEach(() => {
    resetAllRateLimiters();
    mockFindByIdAndUpdate.mockResolvedValue({});
    mockFindById.mockReset();
    mockFindOne.mockImplementation(() => ({
      populate: jest.fn(async () => ({
        _id: "507f1f77bcf86cd799439011",
        username: "admin-user",
        email: "admin@example.com",
        tokens: [],
        roles: [{ name: "admin" }],
      })),
    }));
    mockComparePassword.mockResolvedValue(false);
  });

  it("rate limits repeated sign-in attempts and returns contract-style 429 responses", async () => {
    let response = null;

    for (let attempt = 0; attempt < 11; attempt += 1) {
      response = await request(app)
        .post("/api/auth/signin")
        .send({
          identifier: "admin-user",
          password: "wrong-password",
        });
    }

    expect(response.status).toBe(429);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        code: "AUTH_RATE_LIMITED",
      }),
    );
    expect(response.body.message).toContain("Too many sign-in or sign-up attempts");
    expect(response.headers["retry-after"]).toBeDefined();
    expect(response.headers["ratelimit-limit"]).toBe("10");
    expect(response.headers["ratelimit-remaining"]).toBe("0");
  });

  it("keeps refresh restore on its own limiter after repeated sign-in failures", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const refreshToken = jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: "30d" });
    mockFindById.mockReturnValue({
      populate: jest.fn(async () => ({
        _id: userId,
        username: "admin-user",
        email: "admin@example.com",
        tokens: [{ token: refreshToken, kind: "refresh", sessionId: "session-1" }],
        roles: [{ name: "admin" }],
      })),
    });

    for (let attempt = 0; attempt < 11; attempt += 1) {
      await request(app)
        .post("/api/auth/signin")
        .send({
          identifier: "admin-user",
          password: "wrong-password",
        });
    }

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${refreshToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.headers["ratelimit-limit"]).toBe("30");
  });

  it("allows normal dashboard bootstrap and refresh request bursts for a signed-in operator", async () => {
    const results = [];

    for (let requestIndex = 0; requestIndex < 42; requestIndex += 1) {
      results.push(await invokeRateLimiter(dashboardRateLimiter, {
        userId: "admin-user-id",
      }));
    }

    expect(results.every((result) => result.next)).toBe(true);
    expect(Number(results.at(-1).headers["ratelimit-limit"])).toBeGreaterThanOrEqual(42);
    expect(Number(results.at(-1).headers["ratelimit-remaining"])).toBeGreaterThan(0);
  });
});
