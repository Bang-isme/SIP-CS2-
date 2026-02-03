import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

/**
 * IntegrationEvent (Outbox) Model
 * Case Study 4 - Middleware-lite outbox for async integrations
 */
const IntegrationEvent = sequelize.define(
    "IntegrationEvent",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        entity_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        entity_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        action: {
            type: DataTypes.ENUM("CREATE", "UPDATE", "DELETE"),
            allowNull: false,
        },
        payload: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM("PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD"),
            allowNull: false,
            defaultValue: "PENDING",
        },
        attempts: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        last_error: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        next_run_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        processed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "integration_events",
        timestamps: true,
        indexes: [
            { fields: ["status"] },
            { fields: ["next_run_at"] },
            { fields: ["createdAt"] },
            { fields: ["entity_type"] },
        ],
    }
);

export default IntegrationEvent;
