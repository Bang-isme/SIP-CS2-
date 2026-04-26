import pkg from "../../package.json" with { type: "json" };
import mongoose from "mongoose";
import sequelize, {
  ACTIVE_SQL_MIGRATION_IDS,
  getMissingRequiredTables,
  listAppliedMigrations,
} from "../mysqlDatabase.js";
import { MYSQL_REQUIRE_MIGRATIONS } from "../config.js";
import { checkIntegrationHealth } from "../services/syncService.js";
import { getRequestId } from "../utils/requestTracking.js";

const MONGO_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

export const buildMongoHealth = () => {
  const mongoState = mongoose.connection.readyState;
  return {
    status: mongoState === 1 ? "connected" : "disconnected",
    state: MONGO_STATES[mongoState] || "unknown",
    ready: mongoState === 1,
  };
};

export const buildMySqlHealth = async () => {
  try {
    await sequelize.authenticate();

    const appliedMigrations = await listAppliedMigrations();
    const missingTables = await getMissingRequiredTables();
    const appliedIds = new Set(appliedMigrations.map((row) => row.id));
    const missingMigrations = MYSQL_REQUIRE_MIGRATIONS
      ? ACTIVE_SQL_MIGRATION_IDS.filter((id) => !appliedIds.has(id))
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

const DEPENDENCY_BUILDERS = {
  mongodb: async () => buildMongoHealth(),
  mysql: async () => buildMySqlHealth(),
};

const buildSelectedDependencyHealth = async (dependencies = ["mongodb", "mysql"]) => {
  const uniqueDependencies = [...new Set(dependencies)];
  const entries = await Promise.all(
    uniqueDependencies.map(async (dependency) => {
      const builder = DEPENDENCY_BUILDERS[dependency];
      if (!builder) {
        return [dependency, { status: "unknown", ready: false, message: "Unsupported dependency" }];
      }
      return [dependency, await builder()];
    }),
  );
  return Object.fromEntries(entries);
};

export const createHealthHandlers = ({
  serviceKey = "combined",
  serviceName = "SIP_CS Backend",
  dependencies = ["mongodb", "mysql"],
  includeIntegrationHealth = true,
} = {}) => {
  const dependencyList = [...new Set(dependencies)];

  const getHealthSummary = async (req, res) => {
    const services = await buildSelectedDependencyHealth(dependencyList);
    const allHealthy = Object.values(services).every((service) => service.ready);

    return res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: pkg.version,
      requestId: getRequestId({ req, res }),
      service: {
        key: serviceKey,
        name: serviceName,
        dependencies: dependencyList,
      },
      services,
    });
  };

  const getIntegrationHealthSummary = async (req, res) => {
    if (!includeIntegrationHealth) {
      return res.status(404).json({
        status: "not_available",
        message: "Integration health is only exposed by the SA service.",
        requestId: getRequestId({ req, res }),
      });
    }

    try {
      const integrationHealth = await checkIntegrationHealth();
      const allHealthy = integrationHealth.every((integration) => integration.healthy);

      return res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        requestId: getRequestId({ req, res }),
        service: {
          key: serviceKey,
          name: serviceName,
        },
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

  const readyHandler = async (req, res) => {
    const details = await buildSelectedDependencyHealth(dependencyList);
    const ready = Object.values(details).every((service) => service.ready);

    return res.status(ready ? 200 : 503).json({
      ready,
      requestId: getRequestId({ req, res }),
      service: {
        key: serviceKey,
        name: serviceName,
      },
      details,
    });
  };

  const liveHandler = (req, res) => {
    return res.json({
      alive: true,
      uptime: process.uptime(),
      version: pkg.version,
      timestamp: new Date().toISOString(),
      requestId: getRequestId({ req, res }),
      service: {
        key: serviceKey,
        name: serviceName,
      },
    });
  };

  return {
    getHealthSummary,
    getIntegrationHealthSummary,
    readyHandler,
    liveHandler,
  };
};

const defaultHealthHandlers = createHealthHandlers();
export const getHealthSummary = defaultHealthHandlers.getHealthSummary;
export const getIntegrationHealthSummary = defaultHealthHandlers.getIntegrationHealthSummary;
export const readyHandler = defaultHealthHandlers.readyHandler;
export const liveHandler = defaultHealthHandlers.liveHandler;

export default {
  getHealthSummary,
  getIntegrationHealthSummary,
  readyHandler,
  liveHandler,
};
