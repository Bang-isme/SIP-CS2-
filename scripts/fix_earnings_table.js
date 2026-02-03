
import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// Setup minimal Sequelize connection
const sequelize = new Sequelize(
    process.env.MYSQL_DB || "payroll_db",
    process.env.MYSQL_USER || "root",
    process.env.MYSQL_PASSWORD || "password",
    {
        host: process.env.MYSQL_HOST || "localhost",
        dialect: "mysql",
        logging: false,
    }
);

const EarningsEmployeeYear = sequelize.define(
    "EarningsEmployeeYear",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.STRING(50), allowNull: false },
        year: { type: DataTypes.INTEGER, allowNull: false },
        total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    {
        tableName: "earnings_employee_year",
        timestamps: false,
        indexes: [
            { fields: ["employee_id"] },
            { fields: ["year", "employee_id"], unique: true },
            { fields: ["year", "total"] },
        ],
    }
);

async function fixTable() {
    try {
        await sequelize.authenticate();
        console.log("Connected to MySQL.");

        console.log("Dropping table earnings_employee_year...");
        await EarningsEmployeeYear.drop();

        console.log("Recreating table with correct schema...");
        await EarningsEmployeeYear.sync({ force: true });

        console.log("✅ Table fixed. Now please run: node scripts/aggregate-dashboard.js 2026");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sequelize.close();
    }
}

fixTable();
