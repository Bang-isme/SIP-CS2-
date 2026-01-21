import { Sequelize } from "sequelize";
import {
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
} from "./config.js";

// Create Sequelize instance for MySQL connection
const sequelize = new Sequelize(MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, {
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    dialect: "mysql",
    logging: false, // Set to console.log to see SQL queries
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

// Test connection function
export const connectMySQL = async () => {
    try {
        await sequelize.authenticate();
        console.log("MySQL (Payroll DB) connected successfully.");
        return true;
    } catch (error) {
        console.error("Unable to connect to MySQL:", error.message);
        return false;
    }
};

// Sync all models (create tables if not exist)
export const syncDatabase = async (force = false) => {
    try {
        await sequelize.sync({ force });
        console.log("MySQL tables synchronized.");
    } catch (error) {
        console.error("Error syncing MySQL tables:", error.message);
    }
};

export default sequelize;
