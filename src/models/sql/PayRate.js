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
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        },
        tax_percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0.1,
        },
        type: {
            type: DataTypes.ENUM("hourly", "salary", "commission"),
            defaultValue: "salary",
        },
    },
    {
        tableName: "pay_rates",
        timestamps: true,
    }
);

export default PayRate;
