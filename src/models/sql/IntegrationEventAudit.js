import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

const IntegrationEventAudit = sequelize.define(
  "IntegrationEventAudit",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    integration_event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    operator_action: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    operator_actor_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    operator_request_id: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    source_status: {
      type: DataTypes.ENUM("PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD"),
      allowNull: true,
    },
    target_status: {
      type: DataTypes.ENUM("PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD"),
      allowNull: true,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "integration_event_audits",
    timestamps: true,
    indexes: [
      { fields: ["integration_event_id", "createdAt"] },
      { fields: ["operator_action"] },
      { fields: ["operator_request_id"] },
      { fields: ["createdAt"] },
    ],
  },
);

export default IntegrationEventAudit;
