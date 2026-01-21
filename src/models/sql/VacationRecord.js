import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

const VacationRecord = sequelize.define(
    "VacationRecord",
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
        days_taken: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        reason: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
    },
    {
        tableName: "vacation_records",
        timestamps: true,
        indexes: [
            { fields: ["employee_id"] },
            { fields: ["year"] },
        ],
    }
);

export default VacationRecord;
