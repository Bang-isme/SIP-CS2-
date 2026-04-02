import request from "supertest";
import { jest } from "@jest/globals";

const mockFindUsers = jest.fn();
const mockFindById = jest.fn();
const mockRoleFind = jest.fn();

class MockUser {
  static find = mockFindUsers;
  static findById = mockFindById;
  static findOne = jest.fn();

  constructor({ username, email, password, roles }) {
    this._id = "507f1f77bcf86cd7994390ba";
    this.username = username;
    this.email = email;
    this.password = password;
    this.roles = roles;
  }

  async save() {
    return {
      _id: this._id,
      username: this.username,
      email: this.email,
      roles: this.roles,
    };
  }
}

jest.unstable_mockModule("../middlewares/authJwt.js", () => ({
  verifyToken: (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }
    req.userId = "507f1f77bcf86cd7994390af";
    return next();
  },
  canManageAlerts: (req, res, next) => next(),
  canManageProducts: (req, res, next) => next(),
  isAdmin: (req, res, next) => next(),
  isSuperAdmin: (req, res, next) => next(),
  isModerator: (req, res, next) => next(),
}));

jest.unstable_mockModule("../models/User.js", () => ({
  default: MockUser,
}));

jest.unstable_mockModule("../models/Role.js", () => ({
  ROLES: ["user", "admin", "moderator", "super_admin"],
  default: {
    find: mockRoleFind,
    findOne: jest.fn(async () => ({ _id: "role-user-id", name: "user" })),
  },
}));

const { default: app } = await import("../app.js");

describe("Users contract", () => {
  beforeEach(() => {
    mockRoleFind.mockReset();
    mockFindUsers.mockReset();
    mockFindById.mockReset();
  });

  it("should reject mixed valid+invalid roles instead of silently ignoring invalid entries", async () => {
    mockRoleFind.mockResolvedValue([{ _id: "role-admin-id", name: "admin" }]);

    const res = await request(app)
      .post("/api/users")
      .set("x-access-token", "valid-admin-token")
      .send({
        username: "user-admin-mixed-role",
        email: "mixed.roles@example.com",
        password: "secret123",
        roles: ["admin", "unknown-role"],
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(422);
    expect(res.body).toEqual(expect.objectContaining({
      success: false,
      message: "Validation failed.",
    }));
  });

  it("should reject invalid Mongo user ids with 422", async () => {
    const res = await request(app)
      .get("/api/users/not-an-object-id")
      .set("x-access-token", "valid-admin-token")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "userId" }),
    ]));
  });
});
