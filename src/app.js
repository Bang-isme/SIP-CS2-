import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import { attachRequestContext } from "./middlewares/requestContext.js";
import { apiErrorHandler, apiNotFoundHandler } from "./middlewares/errorHandler.js";

// Routes
import indexRoutes from "./routes/index.routes.js";
import productRoutes from "./routes/products.routes.js";
import usersRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import contractsRoutes from "./routes/contracts.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import alertsRoutes from "./routes/alerts.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import healthRoutes from "./routes/health.routes.js";
import integrationRoutes from "./routes/integration.routes.js";

const app = express();
morgan.token("request-id", (req) => req.requestId || "-");
const shouldLogHttpAccess = process.env.NODE_ENV !== "test" || process.env.HTTP_LOG_LEVEL === "verbose";

// Settings
app.set("port", process.env.PORT || 4000);
app.set("json spaces", process.env.NODE_ENV === "development" ? 2 : 0);
app.set("etag", false); // Disable 304 responses for easier debugging

// Middlewares
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(helmet());
const shouldCompress = (req, res) => {
  if (req.originalUrl?.startsWith("/api/dashboard/drilldown/export")) {
    return false;
  }
  return compression.filter(req, res);
};
app.use(compression({ filter: shouldCompress }));
app.use(attachRequestContext);
if (shouldLogHttpAccess) {
  app.use(morgan(":method :url :status :response-time ms reqId=:request-id"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use("/api", indexRoutes);
app.use("/api/contracts", contractsRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/integrations", integrationRoutes);
app.use(apiNotFoundHandler);
app.use(apiErrorHandler);

export default app;
