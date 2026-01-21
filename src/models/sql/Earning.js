import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

const Earning = sequelize.define(
    "Earning",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        employee_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: "Links to MongoDB Employee._id or employeeId",
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        month: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 12,
            },
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
    },
    {
        tableName: "earnings",
        timestamps: true,
        indexes: [
            { fields: ["employee_id"] },
            { fields: ["year", "month"] },
        ],
    }
);

export default Earning;
