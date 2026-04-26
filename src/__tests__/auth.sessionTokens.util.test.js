import jwt from "jsonwebtoken";
import { AUTH_MAX_PERSISTED_SESSIONS } from "../config.js";
import {
  buildPersistedSessionTokens,
  mergePersistedSessionTokens,
  prunePersistedTokens,
} from "../utils/authSessionTokens.js";

describe("auth session token helpers", () => {
  test("buildPersistedSessionTokens keeps access and refresh tokens under the same session", () => {
    const refreshToken = jwt.sign(
      { id: "507f1f77bcf86cd799439011", type: "refresh" },
      "refresh-secret",
      { expiresIn: "1h" },
    );

    const [accessEntry, refreshEntry] = buildPersistedSessionTokens({
      accessToken: "access-token",
      refreshToken,
      sessionId: "session-1",
      issuedAt: new Date("2026-04-12T10:00:00.000Z"),
    });

    expect(accessEntry).toEqual(expect.objectContaining({
      sessionId: "session-1",
      token: "access-token",
      kind: "access",
      signedAt: "2026-04-12T10:00:00.000Z",
    }));
    expect(refreshEntry).toEqual(expect.objectContaining({
      sessionId: "session-1",
      token: refreshToken,
      kind: "refresh",
      signedAt: "2026-04-12T10:00:00.000Z",
      expiresAt: expect.any(Date),
    }));
  });

  test("prunePersistedTokens removes malformed and expired entries", () => {
    const now = Date.UTC(2026, 3, 12, 10, 0, 0);
    const validToken = jwt.sign(
      { id: "user-1", exp: Math.floor((now + 60 * 60 * 1000) / 1000) },
      "access-secret",
      { noTimestamp: true },
    );
    const expiredToken = jwt.sign(
      { id: "user-1", exp: Math.floor((now - 1000) / 1000) },
      "access-secret",
      { noTimestamp: true },
    );

    expect(prunePersistedTokens([
      null,
      { token: 123 },
      { token: expiredToken, kind: "access" },
      { token: validToken, kind: "access" },
      { token: "opaque", kind: "refresh", expiresAt: new Date(now - 1) },
    ], now)).toEqual([
      { token: validToken, kind: "access" },
    ]);
  });

  test("mergePersistedSessionTokens keeps the most recent configured session groups", () => {
    const sessionCount = AUTH_MAX_PERSISTED_SESSIONS + 1;
    const sessions = Array.from({ length: sessionCount }, (_, index) => ({
      sessionId: `session-${index + 1}`,
      token: `token-${index + 1}`,
      signedAt: `2026-04-12T${String(index).padStart(2, "0")}:00:00.000Z`,
      kind: "access",
    }));

    const merged = mergePersistedSessionTokens(sessions, [{
      sessionId: `session-${sessionCount + 1}`,
      token: `token-${sessionCount + 1}`,
      signedAt: "2026-04-12T23:00:00.000Z",
      kind: "access",
    }]);

    expect(merged).toHaveLength(AUTH_MAX_PERSISTED_SESSIONS);
    expect(merged[0]).toEqual(expect.objectContaining({
      sessionId: `session-${sessionCount + 1}`,
      token: `token-${sessionCount + 1}`,
    }));
    expect(merged.at(-1)).toEqual(expect.objectContaining({
      sessionId: `session-${sessionCount - AUTH_MAX_PERSISTED_SESSIONS + 2}`,
    }));
  });
});
