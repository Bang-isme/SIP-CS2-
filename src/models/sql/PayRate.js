import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

const PayRate = sequelize.define(
    "PayRate",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        employee_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: "Links to MongoDB Employee.employeeId",
        },
        pay_rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        },
        pay_type: {
            type: DataTypes.ENUM("HOURLY", "SALARY", "COMMISSION", "TERMINATED"),
            allowNull: false,
            defaultValue: "HOURLY",
        },
        effective_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: "pay_rates",
        timestamps: true,
        indexes: [
            { unique: true, fields: ["employee_id"] },
            { fields: ["pay_type"] },
        ],
    }
);

export default PayRate;
