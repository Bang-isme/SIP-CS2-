import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

const mockUserFindById = jest.fn();
const mockRoleFind = jest.fn();

jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findById: mockUserFindById,
  },
}));

jest.unstable_mockModule("../models/Role.js", () => ({
  default: {
    find: mockRoleFind,
  },
}));

const { SECRET } = await import("../config.js");
const { attachRequestContext } = await import("../middlewares/requestContext.js");
const { verifyToken, isAdmin } = await import("../middlewares/authJwt.js");

describe("auth guard contract", () => {
  let app;
  const originalAllowStatelessFallback = process.env.ALLOW_STATELESS_JWT_FALLBACK;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockUserFindById.mockReset();
    mockRoleFind.mockReset();
    delete process.env.ALLOW_STATELESS_JWT_FALLBACK;

    app = express();
    app.use(express.json());
    app.use(attachRequestContext);
    app.get("/protected", verifyToken, (_req, res) => {
      res.json({ success: true });
    });
    app.post("/mutating", verifyToken, (_req, res) => {
      res.json({ success: true });
    });
    app.get("/admin-only", verifyToken, isAdmin, (_req, res) => {
      res.json({ success: true });
    });
  });

  afterEach(() => {
    if (originalAllowStatelessFallback === undefined) {
      delete process.env.ALLOW_STATELESS_JWT_FALLBACK;
    } else {
      process.env.ALLOW_STATELESS_JWT_FALLBACK = originalAllowStatelessFallback;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("returns canonical auth error code when token is missing", async () => {
    const res = await request(app)
      .get("/protected")
      .set("x-request-id", "req-auth-guard-1");

    expect(res.status).toBe(403);
    expect(res.body).toEqual(expect.objectContaining({
      success: false,
      message: "No token provided",
      code: "AUTH_TOKEN_MISSING",
      requestId: "req-auth-guard-1",
    }));
  });

  it("returns canonical auth error code when token has been revoked", async () => {
    const token = jwt.sign({ id: "507f1f77bcf86cd799439011" }, SECRET, { expiresIn: 86400 });
    mockUserFindById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      tokens: [],
      roles: ["role-user-id"],
    });

    const res = await request(app)
      .get("/protected")
      .set("x-access-token", token);

    expect(res.status).toBe(401);
    expect(res.body).toEqual(expect.objectContaining({
      success: false,
      message: "Token is invalid or expired",
      code: "AUTH_TOKEN_REVOKED",
    }));
  });

  it("returns canonical forbidden code when role check fails", async () => {
    const token = jwt.sign({ id: "507f1f77bcf86cd799439012" }, SECRET, { expiresIn: 86400 });
    mockUserFindById.mockImplementation(async () => ({
      _id: "507f1f77bcf86cd799439012",
      tokens: [{ token }],
      roles: ["role-user-id"],
    }));
    mockRoleFind.mockResolvedValue([{ _id: "role-user-id", name: "user" }]);

    const res = await request(app)
      .get("/admin-only")
      .set("x-access-token", token);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(expect.objectContaining({
      success: false,
      message: "Require Admin Role!",
      code: "AUTH_FORBIDDEN",
    }));
    expect(mockUserFindById).toHaveBeenCalledTimes(1);
  });

  it("allows verified JWT without persisted token when stateless fallback is explicitly enabled", async () => {
    process.env.ALLOW_STATELESS_JWT_FALLBACK = "1";
    const token = jwt.sign({ id: "507f1f77bcf86cd799439099" }, SECRET, { expiresIn: 86400 });
    mockUserFindById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439099",
      tokens: [],
      roles: ["role-user-id"],
    });

    const res = await request(app)
      .get("/protected")
      .set("x-access-token", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("does not allow stateless fallback on non-read requests", async () => {
    process.env.ALLOW_STATELESS_JWT_FALLBACK = "1";
    const token = jwt.sign({ id: "507f1f77bcf86cd799439199" }, SECRET, { expiresIn: 86400 });
    mockUserFindById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439199",
      tokens: [],
      roles: ["role-user-id"],
    });

    const res = await request(app)
      .post("/mutating")
      .set("x-access-token", token);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_TOKEN_REVOKED");
  });

  it("does not allow stateless fallback in production even for read requests", async () => {
    process.env.ALLOW_STATELESS_JWT_FALLBACK = "1";
    process.env.NODE_ENV = "production";
    const token = jwt.sign({ id: "507f1f77bcf86cd799439299" }, SECRET, { expiresIn: 86400 });
    mockUserFindById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439299",
      tokens: [],
      roles: ["role-user-id"],
    });

    const res = await request(app)
      .get("/protected")
      .set("x-access-token", token);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_TOKEN_REVOKED");
  });

  it("uses stateless service auth when the app declares authMode=stateless", async () => {
    app.locals.authMode = "stateless";
    const token = jwt.sign({
      id: "507f1f77bcf86cd799439399",
      roles: ["admin"],
      username: "payroll-admin",
      email: "payroll-admin@localhost",
    }, SECRET, { expiresIn: 86400 });

    const res = await request(app)
      .get("/admin-only")
      .set("x-access-token", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockUserFindById).not.toHaveBeenCalled();
    expect(mockRoleFind).not.toHaveBeenCalled();
  });

  it("keeps stateless role checks claim-driven without querying Mongo", async () => {
    app.locals.authMode = "stateless";
    const token = jwt.sign({
      id: "507f1f77bcf86cd799439499",
      roles: ["user"],
    }, SECRET, { expiresIn: 86400 });

    const res = await request(app)
      .get("/admin-only")
      .set("x-access-token", token);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("AUTH_FORBIDDEN");
    expect(mockUserFindById).not.toHaveBeenCalled();
    expect(mockRoleFind).not.toHaveBeenCalled();
  });
});
