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
    mockFindByIdAndUpdate.mockResolvedValue({});
    mockFindOne.mockImplementation(() => ({
      populate: jest.fn(async () => userDoc),
    }));
    mockComparePassword.mockResolvedValue(true);
  });

  it("should return sanitized user data on sign in", async () => {
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
    expect(res.body.data).toMatchObject({
      _id: "507f1f77bcf86cd799439011",
      username: "admin-user",
      email: "admin@example.com",
      roles: ["admin"],
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
    expect(res.body).toHaveProperty("message", "Invalid Password");
    expect(res.body).toHaveProperty("token", null);
  });
});
