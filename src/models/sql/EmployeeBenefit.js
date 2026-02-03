import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";
import BenefitPlan from "./BenefitPlan.js";

const EmployeeBenefit = sequelize.define(
    "EmployeeBenefit",
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
        plan_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: BenefitPlan,
                key: "id",
            },
        },
        amount_paid: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        },
        effective_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        last_change_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        tableName: "employee_benefits",
        timestamps: true,
        indexes: [
            { fields: ["employee_id"] },
            { fields: ["plan_id"] },
            { fields: ["last_change_date"] }, // Optimized for benefits_change alert
        ],
    }
);

// Define relationship
EmployeeBenefit.belongsTo(BenefitPlan, { foreignKey: "plan_id", as: "plan" });
BenefitPlan.hasMany(EmployeeBenefit, { foreignKey: "plan_id", as: "enrollments" });

export default EmployeeBenefit;
