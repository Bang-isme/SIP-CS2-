/**
 * Dashboard/Auth Guard Tests
 * Validate protected endpoints reject anonymous requests.
 */

import request from "supertest";
import app from "../app.js";

const expectMissingTokenResponse = (res) => {
  expect(res.status).toBe(403);
  expect(res.status).not.toBe(401);
  expect(res.body).toHaveProperty("success", false);
  expect(res.body).toHaveProperty("message", "No token provided");
  expect(res.body).toHaveProperty("code", "AUTH_TOKEN_MISSING");
};

describe("Dashboard Endpoints - Auth Guard", () => {
  const endpoints = [
    "/api/dashboard/executive-brief?year=2025",
    "/api/dashboard/earnings?year=2025",
    "/api/dashboard/vacation?year=2025",
    "/api/dashboard/benefits",
    "/api/dashboard/drilldown?page=1&limit=5",
    "/api/dashboard/departments",
  ];

  it.each(endpoints)("should reject anonymous request: %s", async (endpoint) => {
    const res = await request(app).get(endpoint).expect("Content-Type", /json/);

    expectMissingTokenResponse(res);
  });
});

describe("Alerts Endpoints - Auth Guard", () => {
  it("should reject anonymous request for triggered alerts", async () => {
    const res = await request(app)
      .get("/api/alerts/triggered")
      .expect("Content-Type", /json/);

    expectMissingTokenResponse(res);
  });
});

describe("Request tracing", () => {
  it("should echo inbound x-request-id on auth errors", async () => {
    const res = await request(app)
      .get("/api/dashboard/earnings?year=2025")
      .set("x-request-id", "dashboard-auth-trace-1")
      .expect("Content-Type", /json/);

    expectMissingTokenResponse(res);
    expect(res.headers["x-request-id"]).toBe("dashboard-auth-trace-1");
    expect(res.body).toHaveProperty("requestId", "dashboard-auth-trace-1");
  });

  it("should generate x-request-id when client does not provide one", async () => {
    const res = await request(app)
      .get("/api/dashboard/benefits")
      .expect("Content-Type", /json/);

    expectMissingTokenResponse(res);
    expect(res.headers["x-request-id"]).toMatch(/.+/);
    expect(res.body.requestId).toBe(res.headers["x-request-id"]);
  });
});
