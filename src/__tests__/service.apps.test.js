import request from "supertest";
import { createSaApp } from "../apps/saApp.js";
import { createPayrollApp } from "../apps/payrollApp.js";
import { createDashboardApp } from "../apps/dashboardApp.js";

describe("service app boundaries", () => {
  test("SA app exposes source-system routes only and serves a service landing page", async () => {
    const app = createSaApp();

    const root = await request(app).get("/api");
    const home = await request(app).get("/");
    const favicon = await request(app).get("/favicon.ico");
    const employee = await request(app).get("/api/employee");
    const dashboard = await request(app).get("/api/dashboard/departments");

    expect(root.status).toBe(200);
    expect(root.body.service.key).toBe("sa");
    expect(home.status).toBe(200);
    expect(home.text).toContain("SA / HR Service");
    expect(home.text).toContain("Dashboard login");
    expect(home.text).toContain("Payroll console");
    expect(home.text).toContain("http://127.0.0.1:4100/?demoLogin=1");
    expect(home.text).toContain("JWT authority");
    expect(home.text).toContain("Queue owner");
    expect(home.text).toContain("Source system");
    expect(home.text).not.toContain("How to frame this page in under 15 seconds");
    expect(home.text).not.toContain("Why This Service Matters");
    expect(favicon.status).toBe(204);
    expect(home.headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(home.headers["content-security-policy"]).not.toContain("upgrade-insecure-requests");
    expect(employee.status).toBe(403);
    expect(dashboard.status).toBe(404);
  });

  test("Payroll app exposes payroll config and blocks unrelated source routes", async () => {
    const app = createPayrollApp();

    const root = await request(app).get("/api");
    const home = await request(app).get("/");
    const favicon = await request(app).get("/favicon.ico");
    const config = await request(app).get("/api/payroll/config");
    const employee = await request(app).get("/api/employee");

    expect(root.status).toBe(200);
    expect(root.body.service.key).toBe("payroll");
    expect(app.locals.authMode).toBe("stateless");
    expect(home.status).toBe(200);
    expect(home.text).toContain("Payroll console");
    expect(home.text).toContain("Payroll evidence");
    expect(home.text).toContain("Open proof");
    expect(home.text).toContain("Session");
    expect(home.text).toContain("Evidence");
    expect(home.text).not.toContain("What this page proves");
    expect(home.text).not.toContain("Recommended flow");
    expect(favicon.status).toBe(204);
    expect(config.status).toBe(200);
    expect(config.body.data.saApiBaseUrl).toBeTruthy();
    expect(config.body.data.links.saHomeUrl).toBeTruthy();
    expect(config.body.data.links.saDocsUrl).toBeTruthy();
    expect(config.body.data.links.dashboardLoginUrl).toBeTruthy();
    expect(employee.status).toBe(404);
  });

  test("Dashboard app exposes reporting routes and does not own auth routes", async () => {
    const app = createDashboardApp();

    const root = await request(app).get("/api");
    const home = await request(app).get("/");
    const dashboard = await request(app).get("/api/dashboard/departments");
    const auth = await request(app).get("/api/auth/me");
    const missingAsset = await request(app).get("/assets/missing-dashboard-chunk.css");

    expect(root.status).toBe(200);
    expect(root.body.service.key).toBe("dashboard");
    expect(app.locals.authMode).toBe("stateless");
    expect(home.status).toBe(200);
    expect(home.headers["cache-control"]).toContain("no-store");
    expect(home.headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(home.headers["content-security-policy"]).not.toContain("upgrade-insecure-requests");
    expect(dashboard.status).toBe(403);
    expect(auth.status).toBe(404);
    expect(missingAsset.status).toBe(404);
    expect(missingAsset.headers["content-type"]).toContain("text/plain");
    expect(missingAsset.text).not.toContain("<!doctype html>");
  });
});
