import { DataTypes } from "sequelize";
import sequelize, { DASHBOARD_COMPANY_SCOPE_VALUE } from "../../mysqlDatabase.js";

/**
 * BenefitsSummary - Pre-aggregated benefits data for dashboard
 */
const BenefitsSummary = sequelize.define(
    "BenefitsSummary",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
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
        // Group by plan name
        plan_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        // 'shareholder' or 'nonShareholder'
        shareholder_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        total_paid: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        enrollment_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        average_paid: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        computed_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "benefits_summary",
        timestamps: false,
        indexes: [
            {
                name: "ux_benefits_summary_scope_plan_shareholder",
                unique: true,
                fields: ["scope_type", "scope_value", "plan_name", "shareholder_type"],
            },
        ],
    }
);

export default BenefitsSummary;
