export const revokeSharedSessionFlow = async ({
  hasToken,
  ensureSession,
  logout,
}) => {
  if (!hasToken()) {
    await ensureSession();
  }

  if (!hasToken()) {
    return { revoked: false, reason: "no-session" };
  }

  let response = await logout();

  if (response.status !== 401) {
    return { revoked: response.ok, reason: response.ok ? "ok" : "non-401-response", response };
  }

  await ensureSession();

  if (!hasToken()) {
    return { revoked: false, reason: "expired-after-restore" };
  }

  response = await logout();

  if (!response.ok && response.status !== 401) {
    throw new Error("Shared SA logout failed.");
  }

  return {
    revoked: response.ok,
    reason: response.ok ? "ok-after-refresh" : "still-unauthorized",
    response,
  };
};
