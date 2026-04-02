import express from "express";
import request from "supertest";
import { attachRequestContext } from "../middlewares/requestContext.js";

describe("request context middleware", () => {
  test("injects requestId into success meta and send/json error responses", async () => {
    const app = express();
    app.use(express.json());
    app.use(attachRequestContext);

    app.get("/success", (req, res) => {
      res.json({
        success: true,
        data: { ok: true },
        meta: { dataset: "probe" },
      });
    });

    app.get("/error", (req, res) => {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
      });
    });

    app.get("/send-error", (req, res) => {
      res.status(403).send({
        message: "No token provided",
      });
    });

    const successRes = await request(app)
      .get("/success")
      .set("x-request-id", "trace-success-1");
    expect(successRes.status).toBe(200);
    expect(successRes.headers["x-request-id"]).toBe("trace-success-1");
    expect(successRes.body.meta).toEqual(
      expect.objectContaining({
        dataset: "probe",
        requestId: "trace-success-1",
      }),
    );

    const errorRes = await request(app).get("/error");
    expect(errorRes.status).toBe(422);
    expect(errorRes.headers["x-request-id"]).toMatch(/.+/);
    expect(errorRes.body).toEqual(
      expect.objectContaining({
        success: false,
        message: "Validation failed.",
        requestId: errorRes.headers["x-request-id"],
      }),
    );

    const sendErrorRes = await request(app)
      .get("/send-error")
      .set("x-request-id", "trace-send-error-1");
    expect(sendErrorRes.status).toBe(403);
    expect(sendErrorRes.headers["x-request-id"]).toBe("trace-send-error-1");
    expect(sendErrorRes.body).toEqual(
      expect.objectContaining({
        message: "No token provided",
        requestId: "trace-send-error-1",
      }),
    );
  });
});
