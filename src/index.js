import app from "./app.js";
import "./database.js"; // MongoDB
import { connectMySQL, syncDatabase } from "./mysqlDatabase.js"; // MySQL
import { PORT } from "./config.js";
import "./libs/initialSetup.js";
import { initSyncService } from "./services/syncService.js"; // Case Study 4: Adapter Registry

// Initialize databases and integration services
const initializeSystems = async () => {
    // 1. MySQL Connection
    const connected = await connectMySQL();
    if (connected) {
        await syncDatabase(); // Creates tables if they don't exist
    }

    // 2. Case Study 4: Initialize Service Registry & Adapters
    await initSyncService();
    console.log("[Startup] All integration adapters initialized.");
};

initializeSystems();

app.listen(PORT);
console.log("Server on port", app.get("port"));

