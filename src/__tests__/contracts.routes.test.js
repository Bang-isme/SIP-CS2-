import request from "supertest";
import app from "../app.js";

describe("contracts routes", () => {
  test("GET /api/contracts/openapi.json returns backend-owned OpenAPI spec", async () => {
    const res = await request(app)
      .get("/api/contracts/openapi.json")
      .set("x-request-id", "req-openapi-1");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    expect(res.body.info).toEqual(expect.objectContaining({
      title: "SIP_CS Backend Contract",
    }));
    expect(res.body.paths["/dashboard/executive-brief"]).toBeTruthy();
    expect(res.body.paths["/auth/logout"]).toBeTruthy();
    expect(res.body.paths["/users"]).toBeTruthy();
    expect(res.body.paths["/health"]).toBeTruthy();
    expect(res.body.paths["/products"]).toBeTruthy();
    expect(res.body.paths["/integrations/events"]).toBeTruthy();
    expect(res.body.paths["/sync/logs"]).toBeTruthy();
    expect(res.body.paths["/contracts/openapi.json"]).toBeTruthy();
    expect(res.body.components.securitySchemes.XAccessToken).toEqual(expect.objectContaining({
      type: "apiKey",
      in: "header",
      name: "x-access-token",
    }));
  });

  test("sync log path in OpenAPI spec exposes correlation filter and validation response", async () => {
    const res = await request(app).get("/api/contracts/openapi.json");

    const syncLogsGet = res.body.paths["/sync/logs"].get;
    expect(syncLogsGet.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "correlationId", in: "query" }),
    ]));
    expect(syncLogsGet.responses["422"]).toBeTruthy();
  });

  test("auth signin schema documents identifier-or-email-or-username contract", async () => {
    const res = await request(app).get("/api/contracts/openapi.json");

    const signinSchema = res.body.components.schemas.AuthSigninRequest;
    expect(signinSchema.required).toEqual(["password"]);
    expect(signinSchema.anyOf).toEqual(expect.arrayContaining([
      expect.objectContaining({ required: ["identifier"] }),
      expect.objectContaining({ required: ["email"] }),
      expect.objectContaining({ required: ["username"] }),
    ]));
  });

  test("generic error envelope exposes machine-readable code field", async () => {
    const res = await request(app).get("/api/contracts/openapi.json");

    expect(res.body.components.schemas.ErrorEnvelope.properties).toEqual(
      expect.objectContaining({
        code: expect.objectContaining({ type: "string" }),
      }),
    );
  });

  test("products paths are documented in the backend-owned OpenAPI bundle", async () => {
    const res = await request(app).get("/api/contracts/openapi.json");

    expect(res.body.paths["/products"]).toBeTruthy();
    expect(res.body.paths["/products/search/{productName}"]).toBeTruthy();
    expect(res.body.paths["/products/{productId}"]).toBeTruthy();
    expect(res.body.components.schemas.ProductResponse).toBeTruthy();
  });

  test("GET /api/contracts/docs redirects to the trailing-slash Swagger UI route", async () => {
    const res = await request(app)
      .get("/api/contracts/docs")
      .set("x-request-id", "req-contract-docs-redirect-1");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/api/contracts/docs/");
  });

  test("GET /api/contracts/docs/ returns local Swagger UI HTML bound to backend OpenAPI", async () => {
    const res = await request(app)
      .get("/api/contracts/docs/")
      .set("x-request-id", "req-contract-docs-html-1")
      .expect("Content-Type", /html/);

    expect(res.status).toBe(200);
    expect(res.text).toContain("SIP_CS Backend Contract Docs");
    expect(res.text).toContain("/api/contracts/docs/assets/swagger-ui.css");
    expect(res.text).toContain("/api/contracts/openapi.json");
    expect(res.text).toContain('data-openapi-url="/api/contracts/openapi.json"');
    expect(res.text).toContain("./swagger-initializer.js");
  });

  test("GET /api/contracts/docs/swagger-initializer.js bootstraps Swagger UI against local OpenAPI JSON", async () => {
    const res = await request(app)
      .get("/api/contracts/docs/swagger-initializer.js")
      .set("x-request-id", "req-contract-docs-init-1")
      .expect("Content-Type", /javascript/);

    expect(res.status).toBe(200);
    expect(res.text).toContain("SwaggerUIBundle");
    expect(res.text).toContain('specUrl = (container && container.dataset && container.dataset.openapiUrl) || "/api/contracts/openapi.json"');
    expect(res.text).toContain('layout: "StandaloneLayout"');
  });
});
