import { DataTypes } from "sequelize";
import sequelize, { DASHBOARD_COMPANY_SCOPE_VALUE } from "../../mysqlDatabase.js";

/**
 * VacationSummary - Pre-aggregated vacation data for dashboard
 */
const VacationSummary = sequelize.define(
    "VacationSummary",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        scope_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "company",
        },
        scope_value: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: DASHBOARD_COMPANY_SCOPE_VALUE,
        },
        group_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        group_value: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        current_total: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        previous_total: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        employee_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        computed_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "vacation_summary",
        timestamps: false,
        indexes: [
            {
                name: "ux_vacation_summary_scope_group",
                unique: true,
                fields: ["year", "scope_type", "scope_value", "group_type", "group_value"],
            },
        ],
    }
);

export default VacationSummary;
