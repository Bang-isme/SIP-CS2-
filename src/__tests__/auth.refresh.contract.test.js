import request from "supertest";
import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { REFRESH_SECRET, SECRET } from "../config.js";

const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

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

describe("Auth refresh contract", () => {
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    mockFindByIdAndUpdate.mockResolvedValue({});
    mockFindById.mockReturnValue({
      populate: jest.fn(async () => ({
        _id: userId,
        username: "admin-user",
        email: "admin@example.com",
        roles: [{ name: "admin" }],
        tokens: [],
        createdAt: "2026-02-16T08:00:00.000Z",
        updatedAt: "2026-02-16T08:30:00.000Z",
      })),
    });
  });

  it("rotates refresh cookie and returns a new access token", async () => {
    const refreshToken = jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: "30d" });
    mockFindById.mockReturnValue({
      populate: jest.fn(async () => ({
        _id: userId,
        username: "admin-user",
        email: "admin@example.com",
        roles: [{ name: "admin" }],
        tokens: [{ token: refreshToken, kind: "refresh" }],
        createdAt: "2026-02-16T08:00:00.000Z",
        updatedAt: "2026-02-16T08:30:00.000Z",
      })),
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${refreshToken}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe("string");
    expect(jwt.verify(res.body.token, SECRET)).toEqual(expect.objectContaining({
      id: userId,
      roles: ["admin"],
      username: "admin-user",
      email: "admin@example.com",
    }));
    expect(res.headers["set-cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("refresh_token="),
      expect.stringContaining("HttpOnly"),
    ]));
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        tokens: expect.arrayContaining([
          expect.objectContaining({ kind: "access", sessionId: expect.any(String) }),
          expect.objectContaining({ kind: "refresh", sessionId: expect.any(String) }),
        ]),
      }),
    );
  });

  it("refresh rotates only the current session and preserves unrelated sessions", async () => {
    const refreshToken = jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: "30d" });
    mockFindById.mockReturnValue({
      populate: jest.fn(async () => ({
        _id: userId,
        username: "admin-user",
        email: "admin@example.com",
        roles: [{ name: "admin" }],
        tokens: [
          { token: "other-access-token", kind: "access", sessionId: "session-keep", signedAt: "2026-04-12T00:00:00.000Z" },
          { token: "other-refresh-token", kind: "refresh", sessionId: "session-keep", signedAt: "2026-04-12T00:00:00.000Z" },
          { token: "old-access-token", kind: "access", sessionId: "session-rotate", signedAt: "2026-04-12T00:05:00.000Z" },
          { token: refreshToken, kind: "refresh", sessionId: "session-rotate", signedAt: "2026-04-12T00:05:00.000Z" },
        ],
      })),
    });

    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${refreshToken}`)
      .expect(200);

    const persistedTokens = mockFindByIdAndUpdate.mock.calls.at(-1)[1].tokens;
    expect(persistedTokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ token: "other-access-token", sessionId: "session-keep" }),
      expect.objectContaining({ token: "other-refresh-token", sessionId: "session-keep" }),
      expect.objectContaining({ kind: "access", sessionId: "session-rotate" }),
      expect.objectContaining({ kind: "refresh", sessionId: "session-rotate" }),
    ]));
    expect(persistedTokens).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ token: refreshToken, sessionId: "session-rotate" }),
      expect.objectContaining({ token: "old-access-token", sessionId: "session-rotate" }),
    ]));
  });

  it("rejects missing refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_REFRESH_TOKEN_MISSING");
    expect(res.body.message).toBe("Session unavailable");
    expect(res.body.meta).toEqual(expect.objectContaining({
      detail: expect.stringMatching(/refresh token/i),
    }));
  });

  it("reports that no browser session can be restored when the refresh cookie is missing", async () => {
    const res = await request(app)
      .get("/api/auth/session")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      refreshAvailable: false,
    });
  });

  it("reports that browser session restore is available only when a valid persisted refresh session exists", async () => {
    const refreshToken = jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: "30d" });
    mockFindById.mockReturnValue({
      populate: jest.fn(async () => ({
        _id: userId,
        username: "admin-user",
        email: "admin@example.com",
        roles: [{ name: "admin" }],
        tokens: [{ token: refreshToken, kind: "refresh", sessionId: "session-1" }],
      })),
    });

    const res = await request(app)
      .get("/api/auth/session")
      .set("Cookie", `refresh_token=${refreshToken}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      refreshAvailable: true,
    });
    expect(res.body.meta).toEqual(expect.objectContaining({
      sessionMode: "restorable",
      actorId: userId,
    }));
  });

  it("treats revoked refresh cookies as not restorable session state", async () => {
    const refreshToken = jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: "30d" });
    mockFindById.mockReturnValue({
      populate: jest.fn(async () => ({
        _id: userId,
        username: "admin-user",
        email: "admin@example.com",
        roles: [{ name: "admin" }],
        tokens: [],
      })),
    });

    const res = await request(app)
      .get("/api/auth/session")
      .set("Cookie", `refresh_token=${refreshToken}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      refreshAvailable: false,
    });
    expect(res.body.meta).toEqual(expect.objectContaining({
      sessionMode: "session_unavailable",
    }));
    expect(res.headers["set-cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("refresh_token="),
    ]));
  });

  it("treats invalid refresh cookies as not restorable session state", async () => {
    const res = await request(app)
      .get("/api/auth/session")
      .set("Cookie", "refresh_token=not-a-real-jwt")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      refreshAvailable: false,
    });
    expect(res.body.meta).toEqual(expect.objectContaining({
      sessionMode: "session_unavailable",
    }));
    expect(res.headers["set-cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("refresh_token="),
    ]));
  });

  it("rejects revoked refresh token", async () => {
    const refreshToken = jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: "30d" });
    mockFindById.mockReturnValue({
      populate: jest.fn(async () => ({
        _id: userId,
        username: "admin-user",
        email: "admin@example.com",
        roles: [{ name: "admin" }],
        tokens: [],
      })),
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${refreshToken}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_REFRESH_TOKEN_INVALID");
    expect(res.body.message).toBe("Session unavailable");
    expect(res.headers["set-cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("refresh_token="),
    ]));
  });

  it("clears refresh cookie when the JWT itself is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refresh_token=not-a-real-jwt")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_REFRESH_TOKEN_INVALID");
    expect(res.body.message).toBe("Session unavailable");
    expect(res.headers["set-cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("refresh_token="),
    ]));
  });

  it("treats refresh sessions for missing users as invalid refresh auth", async () => {
    const refreshToken = jwt.sign({ id: userId, type: "refresh" }, REFRESH_SECRET, { expiresIn: "30d" });
    mockFindById.mockReturnValue({
      populate: jest.fn(async () => null),
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${refreshToken}`)
      .expect("Content-Type", /json/);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_REFRESH_TOKEN_INVALID");
    expect(res.body.message).toBe("Session unavailable");
    expect(res.headers["set-cookie"]).toEqual(expect.arrayContaining([
      expect.stringContaining("refresh_token="),
    ]));
  });
});
