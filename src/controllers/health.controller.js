import pkg from "../../package.json" with { type: "json" };
import mongoose from "mongoose";
import sequelize, {
  REQUIRED_MIGRATION_IDS,
  getMissingRequiredTables,
  listAppliedMigrations,
} from "../mysqlDatabase.js";
import { MYSQL_REQUIRE_MIGRATIONS } from "../config.js";
import { checkIntegrationHealth } from "../services/syncService.js";
import { getRequestId } from "../utils/requestTracking.js";

const MONGO_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

const buildMongoHealth = () => {
  const mongoState = mongoose.connection.readyState;
  return {
    status: mongoState === 1 ? "connected" : "disconnected",
    state: MONGO_STATES[mongoState] || "unknown",
    ready: mongoState === 1,
  };
};

const buildMySqlHealth = async () => {
  try {
    await sequelize.authenticate();

    const appliedMigrations = await listAppliedMigrations();
    const missingTables = await getMissingRequiredTables();
    const appliedIds = new Set(appliedMigrations.map((row) => row.id));
    const missingMigrations = MYSQL_REQUIRE_MIGRATIONS
      ? REQUIRED_MIGRATION_IDS.filter((id) => !appliedIds.has(id))
      : [];
    const ready = missingTables.length === 0 && missingMigrations.length === 0;

    return {
      status: ready ? "connected" : "degraded",
      ready,
      migrationRequired: MYSQL_REQUIRE_MIGRATIONS,
      appliedMigrationCount: appliedMigrations.length,
      missingMigrations,
      missingTables,
    };
  } catch (error) {
    return {
      status: "error",
      ready: false,
      migrationRequired: MYSQL_REQUIRE_MIGRATIONS,
      message: error.message,
    };
  }
};

export const getHealthSummary = async (req, res) => {
  const services = {
    mongodb: buildMongoHealth(),
    mysql: await buildMySqlHealth(),
  };

  const allHealthy = Object.values(services).every((service) => service.ready);

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: pkg.version,
    requestId: getRequestId({ req, res }),
    services,
  });
};

export const getIntegrationHealthSummary = async (req, res) => {
  try {
    const integrationHealth = await checkIntegrationHealth();
    const allHealthy = integrationHealth.every((integration) => integration.healthy);

    return res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      requestId: getRequestId({ req, res }),
      integrations: integrationHealth,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
      requestId: getRequestId({ req, res }),
    });
  }
};

export const readyHandler = async (req, res) => {
  const mongo = buildMongoHealth();
  const mysql = await buildMySqlHealth();
  const ready = mongo.ready && mysql.ready;

  return res.status(ready ? 200 : 503).json({
    ready,
    requestId: getRequestId({ req, res }),
    details: {
      mongodb: mongo,
      mysql,
    },
  });
};

export const liveHandler = (req, res) => {
  return res.json({
    alive: true,
    uptime: process.uptime(),
    version: pkg.version,
    timestamp: new Date().toISOString(),
    requestId: getRequestId({ req, res }),
  });
};

export default {
  getHealthSummary,
  getIntegrationHealthSummary,
  readyHandler,
  liveHandler,
};
