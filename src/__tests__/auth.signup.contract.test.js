import request from "supertest";
import { jest } from "@jest/globals";

const mockFindOne = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockRoleFind = jest.fn();
const mockRoleFindOne = jest.fn();

class MockUser {
  static findOne = mockFindOne;
  static findByIdAndUpdate = mockFindByIdAndUpdate;
  static findById = jest.fn((id) => ({
    populate: jest.fn(async () => ({
      _id: id,
      username: "signup-user",
      email: "signup.user@example.com",
      roles: [{ name: "user" }],
      createdAt: "2026-02-19T01:00:00.000Z",
      updatedAt: "2026-02-19T01:00:00.000Z",
    })),
  }));

  constructor({ username, email, password }) {
    this.username = username;
    this.email = email;
    this.password = password;
    this.roles = [];
    this._id = "507f1f77bcf86cd799439012";
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

jest.unstable_mockModule("../models/User.js", () => ({
  default: MockUser,
}));

jest.unstable_mockModule("../models/Role.js", () => ({
  ROLES: ["user", "admin", "moderator", "super_admin"],
  default: {
    find: mockRoleFind,
    findOne: mockRoleFindOne,
  },
}));

const { default: app } = await import("../app.js");
const SIGNUP_TEST_PASSWORD = ["secret", "123"].join("");

describe("Auth signup contract", () => {
  beforeEach(() => {
    mockRoleFind.mockReset();
    mockFindOne.mockResolvedValue(null);
    mockFindByIdAndUpdate.mockResolvedValue({});
    mockRoleFindOne.mockResolvedValue({ _id: "role-user-id", name: "user" });
  });

  it("should accept signup payload and assign default user role", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .set("x-request-id", "req-auth-signup-1")
      .send({
        username: "signup-user",
        email: "signup.user@example.com",
        password: SIGNUP_TEST_PASSWORD,
        roles: ["user"],
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roles).toEqual(["user"]);
    expect(res.body.meta).toEqual(expect.objectContaining({
      dataset: "authSignup",
      requestId: "req-auth-signup-1",
    }));
    expect(mockRoleFindOne).toHaveBeenCalledWith({ name: "user" });
    expect(mockRoleFind).not.toHaveBeenCalled();
  });

  it("should ignore roles=[admin] from request and still assign user role", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        username: "signup-user-admin-attempt",
        email: "signup.user.admin.attempt@example.com",
        password: SIGNUP_TEST_PASSWORD,
        roles: ["admin"],
      })
      .expect("Content-Type", /json/);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roles).toEqual(["user"]);
    expect(mockRoleFindOne).toHaveBeenCalledWith({ name: "user" });
    expect(mockRoleFind).not.toHaveBeenCalled();
  });
});
