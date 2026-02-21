import request from "supertest";
import { jest } from "@jest/globals";

const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockRoleFindOne = jest.fn();

jest.unstable_mockModule("../middlewares/authJwt.js", () => ({
  verifyToken: (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }
    req.userId = req.headers["x-user-id"] || "mock-super-admin-id";
    return next();
  },
  isAdmin: (req, res, next) => {
    if (req.headers["x-user-role"] === "admin" || req.headers["x-user-role"] === "super_admin") {
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
    findByIdAndUpdate: mockFindByIdAndUpdate,
    findById: mockFindById,
    find: jest.fn(),
    encryptPassword: jest.fn(async (value) => value),
  },
}));

jest.unstable_mockModule("../models/Role.js", () => ({
  ROLES: ["user", "admin", "moderator", "super_admin"],
  default: {
    findOne: mockRoleFindOne,
    find: jest.fn(async () => []),
  },
}));

const { default: app } = await import("../app.js");

describe("Admin role management endpoints", () => {
  beforeEach(() => {
    mockFindById.mockReset();
    mockFindByIdAndUpdate.mockReset();
    mockRoleFindOne.mockReset();

    mockRoleFindOne.mockResolvedValue({ _id: "admin-role-id", name: "admin" });

    const userRoleId = "user-role-id";
    const adminRoleId = "admin-role-id";

    mockFindById.mockImplementation(async (id) => {
      if (id === "root-user-id") {
        return {
          _id: id,
          username: "admin",
          email: "admin@localhost",
          roles: [userRoleId, adminRoleId],
        };
      }

      if (id === "target-non-admin-id") {
        return {
          _id: id,
          username: "target-user",
          email: "target@example.com",
          roles: [userRoleId],
        };
      }

      if (id === "target-admin-id") {
        return {
          _id: id,
          username: "target-admin",
          email: "target.admin@example.com",
          roles: [userRoleId, adminRoleId],
        };
      }

      return null;
    });

    mockFindByIdAndUpdate.mockImplementation((id, update) => ({
      populate: jest.fn(async () => ({
        _id: id,
        username: id === "target-admin-id" ? "target-admin" : "target-user",
        email: id === "root-user-id" ? "admin@localhost" : "target@example.com",
        roles: update?.$pull
          ? [{ name: "user" }]
          : [{ name: "user" }, { name: "admin" }],
      })),
    }));
  });

  it("should add admin role when called by super admin token", async () => {
    const targetUserId = "target-non-admin-id";
    const res = await request(app)
      .put(`/api/users/${targetUserId}/promote-admin`)
      .set("x-access-token", "valid-super-admin-token")
      .set("x-user-role", "super_admin")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(targetUserId);
    expect(res.body.data.roles).toEqual(expect.arrayContaining(["user", "admin"]));
    expect(mockRoleFindOne).toHaveBeenCalledWith({ name: "admin" });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      targetUserId,
      { $addToSet: { roles: "admin-role-id" } },
      { new: true },
    );
  });

  it("should reject promote request without token", async () => {
    const res = await request(app)
      .put("/api/users/target-non-admin-id/promote-admin")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "No token provided");
  });

  it("should reject promote request from non-super-admin token", async () => {
    const res = await request(app)
      .put("/api/users/target-non-admin-id/promote-admin")
      .set("x-access-token", "valid-user-token")
      .set("x-user-role", "admin")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "Require Super Admin Role!");
  });

  it("should demote admin role when called by super admin token", async () => {
    const targetUserId = "target-admin-id";
    const res = await request(app)
      .put(`/api/users/${targetUserId}/demote-admin`)
      .set("x-access-token", "valid-super-admin-token")
      .set("x-user-role", "super_admin")
      .set("x-user-id", "mock-super-admin-id")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roles).toEqual(["user"]);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      targetUserId,
      { $pull: { roles: "admin-role-id" } },
      { new: true },
    );
  });

  it("should reject demoting root admin account", async () => {
    const res = await request(app)
      .put("/api/users/root-user-id/demote-admin")
      .set("x-access-token", "valid-super-admin-token")
      .set("x-user-role", "super_admin")
      .set("x-user-id", "mock-super-admin-id")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "Root admin account cannot be demoted");
  });

  it("should reject self-demotion", async () => {
    const res = await request(app)
      .put("/api/users/mock-super-admin-id/demote-admin")
      .set("x-access-token", "valid-super-admin-token")
      .set("x-user-role", "super_admin")
      .set("x-user-id", "mock-super-admin-id")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Self-demotion is not allowed");
  });

  it("should reject demote when target user is not admin", async () => {
    const res = await request(app)
      .put("/api/users/target-non-admin-id/demote-admin")
      .set("x-access-token", "valid-super-admin-token")
      .set("x-user-role", "super_admin")
      .set("x-user-id", "mock-super-admin-id")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Target user does not have admin role");
  });
});
