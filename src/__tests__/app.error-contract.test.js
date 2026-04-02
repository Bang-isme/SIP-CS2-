import express from "express";
import request from "supertest";
import app from "../app.js";
import { apiErrorHandler, apiNotFoundHandler } from "../middlewares/errorHandler.js";
import { attachRequestContext } from "../middlewares/requestContext.js";

describe("app error contract", () => {
  test("unknown API route returns canonical 404 envelope", async () => {
    const res = await request(app)
      .get("/api/does-not-exist")
      .set("x-request-id", "req-missing-route-1")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(404);
    expect(res.body).toEqual(expect.objectContaining({
      success: false,
      message: "Route not found: /api/does-not-exist",
      code: "API_ROUTE_NOT_FOUND",
      requestId: "req-missing-route-1",
    }));
  });

  test("fallback app error handler returns canonical 500 envelope", async () => {
    const probe = express();
    probe.use(express.json());
    probe.use(attachRequestContext);
    probe.get("/boom", (_req, _res, next) => next(new Error("synthetic failure")));
    probe.use(apiNotFoundHandler);
    probe.use(apiErrorHandler);

    const res = await request(probe)
      .get("/boom")
      .set("x-request-id", "req-app-error-1")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(500);
    expect(res.body).toEqual(expect.objectContaining({
      success: false,
      message: "synthetic failure",
      code: "INTERNAL_SERVER_ERROR",
      requestId: "req-app-error-1",
    }));
  });
});
