import app from "./app.js";
import "./database.js"; // MongoDB
import { connectMySQL, syncDatabase } from "./mysqlDatabase.js"; // MySQL
import { PORT } from "./config.js";
import "./libs/initialSetup.js";

// Initialize MySQL and sync tables
const initializeMySQL = async () => {
    const connected = await connectMySQL();
    if (connected) {
        await syncDatabase(); // Creates tables if they don't exist
    }
};

initializeMySQL();

app.listen(PORT);
console.log("Server on port", app.get("port"));

