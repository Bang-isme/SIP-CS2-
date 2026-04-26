import { DataTypes } from "sequelize";
import sequelize, { DASHBOARD_COMPANY_SCOPE_VALUE } from "../../mysqlDatabase.js";

/**
 * EarningsSummary - Pre-aggregated earnings data for dashboard
 * 
 * Populated by batch job, NOT at request time.
 * ~50-100 rows total (one per group combination)
 */
const EarningsSummary = sequelize.define(
    "EarningsSummary",
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
        // Grouping: 'department', 'gender', 'ethnicity', 'employmentType', 'shareholder', 'total'
        group_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        // Value: e.g., 'Engineering', 'Male', 'Full-time', 'shareholder'
        group_value: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        // Aggregated amounts
        current_total: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        previous_total: {
            type: DataTypes.DECIMAL(15, 2),
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
        tableName: "earnings_summary",
        timestamps: false,
        indexes: [
            {
                name: "ux_earnings_summary_scope_group",
                unique: true,
                fields: ["year", "scope_type", "scope_value", "group_type", "group_value"],
            },
        ],
    }
);

export default EarningsSummary;
