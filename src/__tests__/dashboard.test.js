/**
 * Dashboard/Auth Guard Tests
 * Validate protected endpoints reject anonymous requests.
 */

import request from "supertest";
import app from "../app.js";

const expectMissingTokenResponse = (res) => {
  expect(res.status).toBe(403);
  expect(res.status).not.toBe(401);
  expect(res.body).toHaveProperty("message", "No token provided");
};

describe("Dashboard Endpoints - Auth Guard", () => {
  const endpoints = [
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
