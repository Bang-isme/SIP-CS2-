import app from "./app.js";
import "./database.js"; // MongoDB
import { connectMySQL, initializeMySQLSchema } from "./mysqlDatabase.js"; // MySQL
import { PORT, NODE_ENV } from "./config.js";
import "./libs/initialSetup.js";
import { initSyncService } from "./services/syncService.js"; // Case Study 4: Adapter Registry
import { startIntegrationEventWorker } from "./workers/integrationEventWorker.js";

// Initialize databases and integration services
const initializeSystems = async () => {
    // 1. MySQL Connection
    const connected = await connectMySQL();
    if (!connected) {
        if (NODE_ENV === "production") {
            throw new Error("MySQL is required in production but connection failed.");
        }
        console.warn("[Startup] MySQL is unavailable. Continuing in non-production mode.");
    } else {
        await initializeMySQLSchema();
    }

    // 2. Case Study 4: Initialize Service Registry & Adapters
    await initSyncService();
    console.log("[Startup] All integration adapters initialized.");

    // 3. Case Study 4: Start Outbox Worker
    startIntegrationEventWorker();
};

initializeSystems().catch((error) => {
    console.error("[Startup] Failed to initialize systems:", error.message);
    process.exit(1);
});

app.listen(PORT);
console.log("Server on port", app.get("port"));

