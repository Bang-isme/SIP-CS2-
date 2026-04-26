import { connectMongo } from "../database.js";
import { connectMySQL, initializeMySQLSchema } from "../mysqlDatabase.js";
import { initializeAuthSeed } from "../libs/initialSetup.js";
import { initSyncService } from "../services/syncService.js";
import { startIntegrationEventWorker, stopIntegrationEventWorker } from "../workers/integrationEventWorker.js";
import {
  startDashboardAggregationWorker,
  stopDashboardAggregationWorker,
  warmDashboardAggregationOnStartup,
} from "../workers/dashboardAggregationWorker.js";
import { NODE_ENV, SERVER_SHUTDOWN_TIMEOUT_MS } from "../config.js";

const buildServiceError = (serviceName, message) => new Error(`[${serviceName}] ${message}`);

export const createServiceRuntime = ({
  serviceKey,
  serviceName,
  port,
  createApp,
  requireMongo = true,
  requireMySQL = true,
  initAuthSeed = true,
  initializeIntegrations = false,
  startOutboxWorker = false,
  startAggregationWorker = false,
  awaitAggregationOnStart = false,
}) => {
  let server = null;
  let isShuttingDown = false;

  const app = createApp();
  app.set("port", port);

  const initializeSystems = async () => {
    if (requireMongo) {
      await connectMongo();
      if (initAuthSeed) {
        await initializeAuthSeed();
      }
    }

    let mysqlConnected = false;
    if (requireMySQL) {
      mysqlConnected = await connectMySQL();
      if (!mysqlConnected) {
        throw buildServiceError(
          serviceName,
          NODE_ENV === "production"
            ? "MySQL connection failed and is required in production."
            : "MySQL connection failed. This service requires the payroll database.",
        );
      }
      await initializeMySQLSchema();
    }

    if (initializeIntegrations) {
      await initSyncService();
      console.log(`[Startup:${serviceKey}] Integration adapters initialized.`);
    }

    if (startOutboxWorker) {
      startIntegrationEventWorker();
    }

    if (mysqlConnected && startAggregationWorker) {
      if (awaitAggregationOnStart) {
        await warmDashboardAggregationOnStartup({ reason: "startup-blocking" });
      } else {
        void warmDashboardAggregationOnStartup({ reason: "startup-background" });
      }
      startDashboardAggregationWorker();
    }
  };

  const startHttpServer = async () => await new Promise((resolve, reject) => {
    const nextServer = app.listen(port, () => {
      console.log(`[Startup:${serviceKey}] ${serviceName} listening on port ${port}`);
      resolve(nextServer);
    });
    nextServer.once("error", reject);
  });

  const stopBackgroundWorkers = async () => {
    const stopTasks = [];
    if (startAggregationWorker) {
      stopTasks.push(stopDashboardAggregationWorker());
    }
    if (startOutboxWorker) {
      stopTasks.push(stopIntegrationEventWorker());
    }
    if (stopTasks.length === 0) {
      return;
    }

    const results = await Promise.allSettled(stopTasks);
    results
      .filter((result) => result.status === "rejected")
      .forEach((result) => {
        console.error(`[Startup:${serviceKey}] Worker shutdown failed:`, result.reason?.message || result.reason);
      });
  };

  const closeHttpServer = async () => {
    if (!server) {
      return;
    }

    await new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn(`[Startup:${serviceKey}] HTTP shutdown exceeded ${SERVER_SHUTDOWN_TIMEOUT_MS}ms; closing remaining connections.`);
        server.closeAllConnections?.();
        resolve();
      }, SERVER_SHUTDOWN_TIMEOUT_MS);
      timeoutId.unref?.();

      server.close((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
      server.closeIdleConnections?.();
    });
  };

  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Startup:${serviceKey}] Received ${signal}. Shutting down.`);

    await stopBackgroundWorkers();

    try {
      await closeHttpServer();
      process.exit(0);
    } catch (error) {
      console.error(`[Startup:${serviceKey}] Shutdown failed:`, error.message);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => { void shutdown("SIGINT"); });
  process.once("SIGTERM", () => { void shutdown("SIGTERM"); });

  const bootstrap = async () => {
    await initializeSystems();
    server = await startHttpServer();
    return server;
  };

  return {
    app,
    bootstrap,
    shutdown,
  };
};

export default createServiceRuntime;
