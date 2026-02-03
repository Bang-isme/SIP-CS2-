import { DataTypes } from "sequelize";
import sequelize from "../../mysqlDatabase.js";

/**
 * EarningsEmployeeYear
 * Pre-aggregated totals by employee and year for fast minEarnings queries.
 */
const EarningsEmployeeYear = sequelize.define(
  "EarningsEmployeeYear",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "earnings_employee_year",
    timestamps: false,
    indexes: [
      { fields: ["employee_id"] },
      { fields: ["year", "employee_id"], unique: true },
      { fields: ["year", "total"] },
    ],
  }
);

export default EarningsEmployeeYear;
