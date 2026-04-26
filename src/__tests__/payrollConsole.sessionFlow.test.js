import { revokeSharedSessionFlow } from "../../public/payroll-console/sessionFlow.js";

describe("Payroll console shared-session revoke flow", () => {
  test("restores a shared session before logout when no token is present", async () => {
    let token = "";
    const calls = [];

    const result = await revokeSharedSessionFlow({
      hasToken: () => Boolean(token),
      ensureSession: async () => {
        calls.push("restore");
        token = "token-from-refresh";
        return true;
      },
      logout: async () => {
        calls.push("logout");
        return { ok: true, status: 200 };
      },
    });

    expect(result).toEqual(expect.objectContaining({
      revoked: true,
      reason: "ok",
    }));
    expect(calls).toEqual(["restore", "logout"]);
  });

  test("retries logout after a 401 by restoring the shared session once", async () => {
    let token = "expired-token";
    let logoutCount = 0;

    const result = await revokeSharedSessionFlow({
      hasToken: () => Boolean(token),
      ensureSession: async () => {
        token = "fresh-token";
        return true;
      },
      logout: async () => {
        logoutCount += 1;
        return logoutCount === 1
          ? { ok: false, status: 401 }
          : { ok: true, status: 200 };
      },
    });

    expect(logoutCount).toBe(2);
    expect(result).toEqual(expect.objectContaining({
      revoked: true,
      reason: "ok-after-refresh",
    }));
  });

  test("exits quietly when no reusable shared session exists", async () => {
    const calls = [];

    const result = await revokeSharedSessionFlow({
      hasToken: () => false,
      ensureSession: async () => {
        calls.push("restore");
        return false;
      },
      logout: async () => {
        calls.push("logout");
        return { ok: true, status: 200 };
      },
    });

    expect(result).toEqual(expect.objectContaining({
      revoked: false,
      reason: "no-session",
    }));
    expect(calls).toEqual(["restore"]);
  });

  test("throws when the second logout attempt fails with a non-401 status", async () => {
    let token = "expired-token";
    let logoutCount = 0;

    await expect(revokeSharedSessionFlow({
      hasToken: () => Boolean(token),
      ensureSession: async () => {
        token = "fresh-token";
        return true;
      },
      logout: async () => {
        logoutCount += 1;
        return logoutCount === 1
          ? { ok: false, status: 401 }
          : { ok: false, status: 500 };
      },
    })).rejects.toThrow("Shared SA logout failed.");
  });
});
