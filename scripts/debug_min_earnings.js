
import { Sequelize, Op, DataTypes } from "sequelize";
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
    }
);

async function runDebug() {
    try {
        await sequelize.authenticate();
        console.log("Connected to MySQL.");

        const targetId = 'EMP0000040'; // David Thomas from screenshot
        const year = 2026;
        const minEarnings = 100000;

        console.log(`\n--- checking record for ${targetId} in ${year} ---`);
        const record = await EarningsEmployeeYear.findOne({
            where: { employee_id: targetId, year: year },
            raw: true
        });

        if (!record) {
            console.log("❌ Record NOT FOUND!");
        } else {
            console.log("✅ Record Found:", record);
            console.log("   Total Type:", typeof record.total);
            console.log("   Is Total >= 100000?", parseFloat(record.total) >= 100000);
        }

        console.log(`\n--- checking query total >= ${minEarnings} ---`);
        const queryResult = await EarningsEmployeeYear.findAll({
            where: {
                year: year,
                total: { [Op.gte]: minEarnings }
            },
            attributes: ['employee_id', 'total'],
            raw: true
        });

        console.log(`Query returned ${queryResult.length} records.`);
        const foundInQuery = queryResult.find(r => r.employee_id === targetId);

        if (foundInQuery) {
            console.log(`❌ ERROR: ${targetId} (${foundInQuery.total}) was INCLUDED in results!`);
            console.log("   This suggests the SQL comparison is failing (maybe String comparison?)");
        } else {
            console.log(`✅ OK: ${targetId} was correctly EXCLUDED from results.`);
            console.log("   If the UI shows it, the issue might be in how IDs are passed to Mongo.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sequelize.close();
    }
}

runDebug();
