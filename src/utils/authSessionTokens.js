import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AUTH_MAX_PERSISTED_SESSIONS } from "../config.js";

export const getPersistedTokenSessionKey = (entry = {}) =>
  entry.sessionId || entry.signedAt || entry.token || null;

const getPersistedTokenTimestamp = (entry = {}) => {
  const signedAtMs = entry?.signedAt ? Date.parse(entry.signedAt) : NaN;
  if (Number.isFinite(signedAtMs)) return signedAtMs;
  const expiresAtMs = entry?.expiresAt ? new Date(entry.expiresAt).getTime() : NaN;
  return Number.isFinite(expiresAtMs) ? expiresAtMs : 0;
};

export const mergePersistedSessionTokens = (existingTokens = [], sessionTokens = []) => {
  const groupedTokens = new Map();

  for (const entry of [...existingTokens, ...sessionTokens]) {
    const sessionKey = getPersistedTokenSessionKey(entry);
    if (!sessionKey) continue;

    const currentGroup = groupedTokens.get(sessionKey) || [];
    currentGroup.push(entry);
    groupedTokens.set(sessionKey, currentGroup);
  }

  const orderedGroups = [...groupedTokens.entries()]
    .sort(([, leftGroup], [, rightGroup]) => {
      const leftTimestamp = Math.max(...leftGroup.map(getPersistedTokenTimestamp));
      const rightTimestamp = Math.max(...rightGroup.map(getPersistedTokenTimestamp));
      return rightTimestamp - leftTimestamp;
    })
    .slice(0, AUTH_MAX_PERSISTED_SESSIONS);

  return orderedGroups.flatMap(([, group]) =>
    [...group].sort((left, right) => getPersistedTokenTimestamp(right) - getPersistedTokenTimestamp(left)),
  );
};

export const buildPersistedSessionTokens = ({
  accessToken,
  refreshToken,
  sessionId = crypto.randomUUID(),
  issuedAt = new Date(),
}) => {
  const signedAt = issuedAt.toISOString();
  const refreshDecoded = jwt.decode(refreshToken);
  const refreshExpiresAt = refreshDecoded?.exp ? new Date(refreshDecoded.exp * 1000) : undefined;

  return [
    {
      sessionId,
      token: accessToken,
      signedAt,
      kind: "access",
    },
    {
      sessionId,
      token: refreshToken,
      signedAt,
      kind: "refresh",
      expiresAt: refreshExpiresAt,
    },
  ];
};

export const prunePersistedTokens = (tokens = [], now = Date.now()) => {
  return (tokens || []).filter((entry) => {
    if (!entry?.token || typeof entry.token !== "string") return false;
    if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= now) {
      return false;
    }
    const decoded = jwt.decode(entry.token);
    if (decoded?.exp && decoded.exp * 1000 <= now) {
      return false;
    }
    return true;
  });
};
