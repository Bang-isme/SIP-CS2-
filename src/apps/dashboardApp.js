import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dashboardRoutes from "../routes/dashboard.routes.js";
import alertsRoutes from "../routes/alerts.routes.js";
import { createHealthRouter } from "../routes/health.routes.js";
import { createBaseServiceApp } from "./baseApp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardDistDir = path.resolve(__dirname, "../../dashboard/dist");
const dashboardIndexPath = path.join(dashboardDistDir, "index.html");

const setDashboardStaticHeaders = (res, filePath) => {
  const relativePath = path.relative(dashboardDistDir, filePath);
  if (relativePath.startsWith(`assets${path.sep}`)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
};

const renderDashboardBuildHint = () => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Dashboard Service</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f3f5f8; color: #18212f; padding: 40px; }
      main { max-width: 760px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 20px 60px rgba(24,33,47,0.12); }
      code { background: #eef2f6; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Dashboard service is running.</h1>
      <p>The reporting APIs are live on this port, but the React build is missing.</p>
      <p>Run <code>npm --prefix dashboard run build</code> to let this service host the dashboard UI from <code>/</code>.</p>
      <p>For development, you can still run <code>npm --prefix dashboard run dev</code> separately.</p>
    </main>
  </body>
</html>
`;

export const createDashboardApp = () => createBaseServiceApp({
  serviceInfo: {
    key: "dashboard",
    name: "Dashboard Service",
    description: "Reporting and alerting service for Case Study 2 with its own API surface.",
    responsibilities: [
      "Serve executive dashboard reporting APIs",
      "Serve alert review and drilldown APIs",
      "Optionally host the built React dashboard bundle",
    ],
    routePrefixes: [
      "/api/dashboard",
      "/api/alerts",
      "/api/health",
    ],
    authMode: "stateless",
    ui: {
      rootPath: "/",
      kind: "react_build_if_present",
    },
  },
  registerApiRoutes(app) {
    app.use("/api/dashboard", dashboardRoutes);
    app.use("/api/alerts", alertsRoutes);
    app.use("/api/health", createHealthRouter({
      serviceKey: "dashboard",
      serviceName: "Dashboard Service",
      dependencies: ["mongodb", "mysql"],
      includeIntegrationHealth: false,
    }));
  },
  registerNonApiRoutes(app) {
    if (!fs.existsSync(dashboardDistDir)) {
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) {
          next();
          return;
        }
        res.status(200).type("html").send(renderDashboardBuildHint());
      });
      return;
    }

    app.use(express.static(dashboardDistDir, {
      index: false,
      setHeaders: setDashboardStaticHeaders,
    }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      if (req.path.startsWith("/assets/") || path.extname(req.path)) {
        res.status(404).type("text/plain").send("Dashboard asset not found.");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.sendFile(dashboardIndexPath);
    });
  },
});

export default createDashboardApp;
