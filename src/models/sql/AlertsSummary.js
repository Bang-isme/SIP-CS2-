import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

/**
 * AlertsSummary - Pre-aggregated alerts data
 * 
 * Stores employee counts and lists matching each alert condition.
 * Updated by batch job, not at request time.
 */
const AlertsSummary = sequelize.define(
    "AlertsSummary",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        // Alert type: 'anniversary', 'vacation', 'benefits_change', 'birthday'
        alert_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        // Threshold value used for this summary
        threshold: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        // Number of matching employees
        employee_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        // JSON array of matching employee summaries (limited to top 100)
        matching_employees: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const value = this.getDataValue('matching_employees');
                return value ? JSON.parse(value) : [];
            },
            set(value) {
                this.setDataValue('matching_employees', JSON.stringify(value));
            }
        },
        computed_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "alerts_summary",
        timestamps: false,
        indexes: [
            { unique: true, fields: ["alert_type", "threshold"] },
        ],
    }
);

export default AlertsSummary;
