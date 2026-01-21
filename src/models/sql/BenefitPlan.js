import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

const BenefitPlan = sequelize.define(
    "BenefitPlan",
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
        type: {
            type: DataTypes.ENUM("health", "dental", "vision", "retirement", "life", "other"),
            allowNull: false,
            defaultValue: "other",
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        monthly_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: "benefits_plans",
        timestamps: true,
    }
);

export default BenefitPlan;
