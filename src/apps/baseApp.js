import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import { attachRequestContext } from "../middlewares/requestContext.js";
import { apiErrorHandler, apiNotFoundHandler } from "../middlewares/errorHandler.js";
import { CORS_ORIGINS } from "../config.js";
import { NODE_ENV } from "../config.js";
import { createServiceInfoRouter } from "../routes/serviceInfo.routes.js";

const shouldLogHttpAccess = process.env.NODE_ENV !== "test" || process.env.HTTP_LOG_LEVEL === "verbose";
const isProduction = NODE_ENV === "production";

const buildContentSecurityPolicyDirectives = () => {
  const directives = helmet.contentSecurityPolicy.getDefaultDirectives();
  directives["connect-src"] = ["'self'", ...CORS_ORIGINS];
  if (!isProduction) {
    directives["upgrade-insecure-requests"] = null;
  }
  return directives;
};

const buildTargetUrl = ({ req, target }) => {
  const url = new URL(`${req.protocol}://${req.get("host")}`);
  if (target.port) {
    url.port = String(target.port);
  }
  url.pathname = target.path || "/";
  url.search = target.search || "";
  url.hash = "";
  return url.toString();
};

const renderServiceLandingPage = ({ serviceInfo, req }) => {
  const capabilityRows = (serviceInfo.routePrefixes || [])
    .map((routePrefix) => `<li><code>${routePrefix}</code></li>`)
    .join("");
  const responsibilityRows = (serviceInfo.responsibilities || [])
    .map((responsibility) => `<li>${responsibility}</li>`)
    .join("");
  const heroFactRows = (serviceInfo.ui?.statusChips || serviceInfo.ui?.heroFacts || [])
    .map((fact) => `<span class="hero-chip">${fact}</span>`)
    .join("");
  const trustSignalRows = (serviceInfo.ui?.signals || serviceInfo.ui?.trustSignals || [])
    .map((signal) => `
      <article class="signal-card">
        <span class="signal-card__label">${signal.label}</span>
        <strong class="signal-card__value">${signal.value}</strong>
        <small>${signal.detail || ""}</small>
      </article>
    `)
    .join("");
  const proofPointRows = (serviceInfo.ui?.proofPoints || [])
    .map((point) => `<li>${point}</li>`)
    .join("");
  const demoPath = serviceInfo.ui?.demoPath || null;
  const demoStepRows = ((demoPath?.steps || serviceInfo.ui?.demoSteps || []))
    .map((step) => `<li>${step}</li>`)
    .join("");
  const heroSupportMarkup = serviceInfo.ui?.heroSupport
    ? `
      <section class="hero-note">
        <strong>${serviceInfo.ui.heroSupport.title}</strong>
        <p>${serviceInfo.ui.heroSupport.body}</p>
      </section>
    `
    : "";
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const primaryLinks = [
    { href: `${baseUrl}/api`, label: "API" },
    { href: `${baseUrl}/api/health/live`, label: "Health" },
  ];

  if ((serviceInfo.routePrefixes || []).includes("/api/contracts")) {
    primaryLinks.push({ href: `${baseUrl}/api/contracts/docs/`, label: "Docs" });
  }

  const primaryLinkMarkup = primaryLinks
    .map((link) => `<a class="service-link" href="${link.href}">${link.label}</a>`)
    .join("");
  const gridClassName = proofPointRows ? "grid grid--three" : "grid";
  const launchLinkMarkup = (serviceInfo.ui?.launchLinks || [])
    .map((target) => `
      <a class="launch-link" href="${buildTargetUrl({ req, target })}">
        <strong>${target.label}</strong>
        <span>${target.description || "Open related runtime"}</span>
      </a>
    `)
    .join("");
  const heroSideMarkup = launchLinkMarkup || demoStepRows
    ? `
      <aside class="hero-side">
        ${launchLinkMarkup ? `
        <section class="hero-panel">
          <p class="eyebrow">${serviceInfo.ui?.launchEyebrow || "Open"}</p>
          <div class="launch-links">${launchLinkMarkup}</div>
        </section>` : ""}
        ${demoStepRows ? `
        <section class="hero-panel hero-panel--muted">
          <p class="eyebrow">${demoPath?.eyebrow || "Path"}</p>
          ${demoPath?.title ? `<strong>${demoPath.title}</strong>` : ""}
          <ol class="hero-steps">${demoStepRows}</ol>
        </section>` : ""}
      </aside>
    `
    : "";

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${serviceInfo.name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        color-scheme: light;
        --bg: #eef2f3;
        --panel: #ffffff;
        --ink: #1f2937;
        --muted: #5f6d7b;
        --line: rgba(31, 41, 55, 0.12);
        --accent: #0f766e;
        --accent-soft: rgba(15, 118, 110, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI Variable", "Segoe UI", Arial, sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(15, 118, 110, 0.16), transparent 28%),
          radial-gradient(circle at top right, rgba(176, 137, 104, 0.14), transparent 20%),
          linear-gradient(180deg, #f8fbfd 0%, var(--bg) 100%);
      }
      main {
        max-width: 980px;
        margin: 0 auto;
        padding: 28px 20px 48px;
      }
      .hero,
      .grid-card {
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 24px;
        box-shadow: 0 18px 42px rgba(19, 38, 58, 0.1);
        backdrop-filter: blur(14px);
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
        gap: 18px;
        padding: 24px;
        margin-bottom: 16px;
      }
      .hero-copy {
        display: grid;
        gap: 12px;
        align-content: start;
      }
      .eyebrow {
        margin: 0 0 8px;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
      }
      h1, h2, p, ul { margin: 0; }
      h1, h2 { font-family: "Space Grotesk", "Segoe UI Variable", "Segoe UI", Arial, sans-serif; }
      h1 {
        font-size: clamp(1.9rem, 3.2vw, 2.7rem);
        line-height: 0.98;
        letter-spacing: -0.05em;
      }
      .lede {
        max-width: 54ch;
        color: var(--muted);
        line-height: 1.52;
      }
      .hero-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .hero-chip {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.74);
        border: 1px solid rgba(15, 118, 110, 0.14);
        color: #28414f;
        font-size: 0.78rem;
        font-weight: 700;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .hero-note {
        display: grid;
        gap: 8px;
        max-width: 620px;
        padding: 16px 18px;
        border-radius: 18px;
        border: 1px solid rgba(15, 118, 110, 0.12);
        background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244, 249, 249, 0.94));
      }
      .hero-note strong {
        color: #12314c;
        font-size: 0.95rem;
      }
      .hero-note p {
        color: var(--muted);
        line-height: 1.58;
      }
      .service-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(15, 118, 110, 0.16);
        background: var(--accent-soft);
        color: var(--accent);
        text-decoration: none;
        font-weight: 700;
        font-size: 0.9rem;
        transition: transform 180ms ease, box-shadow 180ms ease;
      }
      .service-link:hover,
      .launch-link:hover {
        transform: translateY(-2px);
        box-shadow: 0 18px 36px rgba(31, 41, 55, 0.1);
      }
      .hero-side {
        display: grid;
        gap: 12px;
      }
      .signal-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .signal-card {
        display: grid;
        gap: 4px;
        padding: 16px 18px;
        border-radius: 20px;
        border: 1px solid rgba(31, 41, 55, 0.08);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 12px 28px rgba(19, 38, 58, 0.07);
      }
      .signal-card__label {
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .signal-card__value {
        font-family: "Space Grotesk", "Segoe UI Variable", "Segoe UI", Arial, sans-serif;
        font-size: 1rem;
        letter-spacing: -0.03em;
      }
      .signal-card small {
        color: var(--muted);
        line-height: 1.42;
      }
      .hero-panel {
        display: grid;
        gap: 10px;
        padding: 18px;
        border-radius: 20px;
        border: 1px solid rgba(31, 41, 55, 0.08);
        background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244, 249, 248, 0.94));
      }
      .hero-panel--muted {
        background: linear-gradient(180deg, rgba(247, 250, 253, 0.98), rgba(240, 246, 250, 0.9));
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .grid--three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .grid-card {
        padding: 20px;
      }
      .grid-card h2 {
        margin-bottom: 10px;
        font-size: 1rem;
      }
      ul {
        padding-left: 18px;
        display: grid;
        gap: 8px;
        color: var(--muted);
        line-height: 1.46;
      }
      ol {
        margin: 0;
        padding-left: 18px;
        display: grid;
        gap: 8px;
        color: var(--muted);
        line-height: 1.46;
      }
      code {
        padding: 2px 6px;
        border-radius: 8px;
        background: #edf3f8;
        color: #12314c;
      }
      .launch-links {
        display: grid;
        gap: 10px;
      }
      .launch-link {
        display: grid;
        gap: 4px;
        padding: 14px;
        border-radius: 16px;
        border: 1px solid rgba(15, 118, 110, 0.12);
        background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245, 250, 249, 0.94));
        color: var(--ink);
        text-decoration: none;
        transition: transform 180ms ease, box-shadow 180ms ease;
      }
      .launch-link strong {
        color: var(--accent);
      }
      .launch-link span {
        color: var(--muted);
        font-size: 0.92rem;
        line-height: 1.38;
      }
      @media (max-width: 760px) {
        .hero,
        .signal-grid,
        .grid {
          grid-template-columns: 1fr;
        }
        .hero {
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">${serviceInfo.ui?.eyebrow || "Service"}</p>
          <h1>${serviceInfo.name}</h1>
          <p class="lede">${serviceInfo.description || "API service for the CEO Memo stack."}</p>
          ${heroFactRows ? `<div class="hero-chips">${heroFactRows}</div>` : ""}
          <div class="actions">${primaryLinkMarkup}</div>
          ${demoPath ? "" : heroSupportMarkup}
        </div>
        ${heroSideMarkup}
      </section>
      ${trustSignalRows ? `<section class="signal-grid">${trustSignalRows}</section>` : ""}
      <section class="${gridClassName}">
        <article class="grid-card">
          <h2>Owns</h2>
          <ul>${responsibilityRows || "<li>No responsibilities were registered for this service.</li>"}</ul>
        </article>
        <article class="grid-card">
          <h2>APIs</h2>
          <ul>${capabilityRows || "<li>No route prefixes were registered for this service.</li>"}</ul>
        </article>
        ${proofPointRows ? `
        <article class="grid-card">
          <h2>Notes</h2>
          <ul>${proofPointRows}</ul>
        </article>` : ""}
      </section>
    </main>
  </body>
</html>
`;
};

export const createBaseServiceApp = ({
  serviceInfo,
  registerApiRoutes,
  registerNonApiRoutes = null,
}) => {
  const app = express();
  const resolvedServiceInfo = {
    key: serviceInfo?.key || "combined",
    name: serviceInfo?.name || "SIP_CS Backend",
    description: serviceInfo?.description || "Shared backend runtime",
    responsibilities: serviceInfo?.responsibilities || [],
    routePrefixes: serviceInfo?.routePrefixes || [],
    ui: serviceInfo?.ui || null,
    authMode: serviceInfo?.authMode || "persistent",
  };

  morgan.token("request-id", (req) => req.requestId || "-");

  app.locals.serviceInfo = resolvedServiceInfo;
  app.locals.authMode = resolvedServiceInfo.authMode;
  app.set("json spaces", process.env.NODE_ENV === "development" ? 2 : 0);
  app.set("etag", false);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin '${origin}' is not allowed by CORS.`));
      },
      credentials: true,
    }),
  );
  app.use(helmet({
    contentSecurityPolicy: {
      directives: buildContentSecurityPolicyDirectives(),
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }));
  app.use(
    compression({
      filter(req, res) {
        if (req.originalUrl?.startsWith("/api/dashboard/drilldown/export")) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );
  app.use(attachRequestContext);
  if (shouldLogHttpAccess) {
    app.use(morgan(":method :url :status :response-time ms reqId=:request-id"));
  }
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });

  app.use("/api", createServiceInfoRouter(resolvedServiceInfo));

  if (typeof registerApiRoutes === "function") {
    registerApiRoutes(app);
  }

  app.use("/api", apiNotFoundHandler);

  if (typeof registerNonApiRoutes === "function") {
    registerNonApiRoutes(app);
  } else {
    app.get("/", (req, res) => {
      res.status(200).type("html").send(renderServiceLandingPage({
        serviceInfo: resolvedServiceInfo,
        req,
      }));
    });
  }

  app.use(apiErrorHandler);

  return app;
};

export default createBaseServiceApp;
