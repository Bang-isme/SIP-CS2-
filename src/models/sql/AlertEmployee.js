import { DataTypes } from 'sequelize';
import sequelize from '../../mysqlDatabase.js';

/**
 * AlertEmployee - Stores ALL matching employees for each alert type
 * This table enables proper pagination, search, and sorting
 */
const AlertEmployee = sequelize.define('AlertEmployee', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    alert_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'anniversary, birthday, vacation, benefits_change'
    },
    employee_id: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    days_until: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Days until event (for sorting)'
    },
    extra_data: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Additional info like vacation_days, birth_date, etc'
    },
    aggregated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'alert_employees',
    timestamps: false,
    indexes: [
        { fields: ['alert_type'] },
        { fields: ['alert_type', 'days_until'] },
        { fields: ['alert_type', 'name'] },
        { fields: ['alert_type', 'employee_id'] }
    ]
});

export default AlertEmployee;
