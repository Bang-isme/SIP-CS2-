import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

/**
 * SyncLog Model
 * Tracks synchronization status between HR (MongoDB) and Payroll (MySQL) systems.
 * Part of Case Study 3 - Data Consistency implementation.
 */
const SyncLog = sequelize.define(
    "SyncLog",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        entity_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: "Type of entity: employee, department, etc.",
        },
        entity_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: "MongoDB _id or employeeId",
        },
        action: {
            type: DataTypes.ENUM("CREATE", "UPDATE", "DELETE"),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED"),
            allowNull: false,
            defaultValue: "PENDING",
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        retry_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "sync_log",
        timestamps: true,
        indexes: [
            { fields: ["entity_type", "entity_id"] },
            { fields: ["status"] },
            { fields: ["createdAt"] },
        ],
    }
);

export default SyncLog;
