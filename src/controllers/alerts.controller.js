import Alert from "../models/Alert.js";
import Employee from "../models/Employee.js";
import { EmployeeBenefit } from "../models/sql/index.js";
import { Op } from "sequelize";

/**
 * Alerts Controller
 * Manage alert configurations and check triggered alerts
 */

/**
 * GET /api/alerts
 * Get all alert configurations
 */
export const getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find().populate("createdBy", "username email");
        res.json({ success: true, data: alerts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/alerts
 * Create a new alert configuration
 */
export const createAlert = async (req, res) => {
    try {
        const { name, type, threshold, description } = req.body;

        const alert = new Alert({
            name,
            type,
            threshold,
            description,
            createdBy: req.userId, // From auth middleware
            isActive: true,
        });

        await alert.save();
        res.status(201).json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/alerts/:id
 * Update an alert configuration
 */
export const updateAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const alert = await Alert.findByIdAndUpdate(id, updates, { new: true });
        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found" });
        }

        res.json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/alerts/:id
 * Delete an alert configuration
 */
export const deleteAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const alert = await Alert.findByIdAndDelete(id);

        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found" });
        }

        res.json({ success: true, message: "Alert deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/alerts/triggered
 * Get all currently triggered alerts based on configured conditions
 */
export const getTriggeredAlerts = async (req, res) => {
    try {
        const activeAlerts = await Alert.find({ isActive: true });
        const triggeredAlerts = [];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        for (const alert of activeAlerts) {
            let matchingEmployees = [];

            switch (alert.type) {
                case "anniversary":
                    // Employees within X days of hiring anniversary
                    const anniversaryThreshold = alert.threshold || 30;
                    const employees = await Employee.find({ hireDate: { $exists: true } }).lean();

                    matchingEmployees = employees.filter((emp) => {
                        if (!emp.hireDate) return false;
                        const hireDate = new Date(emp.hireDate);
                        const anniversaryThisYear = new Date(currentYear, hireDate.getMonth(), hireDate.getDate());

                        // If anniversary already passed this year, check next year
                        if (anniversaryThisYear < today) {
                            anniversaryThisYear.setFullYear(currentYear + 1);
                        }

                        const daysUntil = Math.ceil((anniversaryThisYear - today) / (1000 * 60 * 60 * 24));
                        return daysUntil >= 0 && daysUntil <= anniversaryThreshold;
                    });
                    break;

                case "vacation":
                    // Employees with more than X accumulated vacation days
                    const vacationThreshold = alert.threshold || 20;
                    const empsWithVacation = await Employee.find({ vacationDays: { $gt: vacationThreshold } }).lean();
                    matchingEmployees = empsWithVacation;
                    break;

                case "benefits_change":
                    // Employees who made benefits changes recently
                    const changeThreshold = alert.threshold || 7; // days
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - changeThreshold);

                    const recentChanges = await EmployeeBenefit.findAll({
                        where: {
                            last_change_date: { [Op.gte]: cutoffDate.toISOString().split("T")[0] },
                        },
                        raw: true,
                    });

                    const changedEmployeeIds = [...new Set(recentChanges.map((c) => c.employee_id))];
                    // Only query by employeeId (string field), not _id (ObjectId)
                    if (changedEmployeeIds.length > 0) {
                        matchingEmployees = await Employee.find({
                            employeeId: { $in: changedEmployeeIds }
                        }).lean();
                    }
                    break;

                case "birthday":
                    // Employees with birthdays in current month
                    const empsWithBirthday = await Employee.find({ birthDate: { $exists: true } }).lean();
                    matchingEmployees = empsWithBirthday.filter((emp) => {
                        if (!emp.birthDate) return false;
                        return new Date(emp.birthDate).getMonth() === currentMonth;
                    });
                    break;
            }

            if (matchingEmployees.length > 0) {
                triggeredAlerts.push({
                    alert: {
                        _id: alert._id,
                        name: alert.name,
                        type: alert.type,
                        threshold: alert.threshold,
                    },
                    matchingEmployees: matchingEmployees.map((e) => ({
                        _id: e._id,
                        employeeId: e.employeeId,
                        name: `${e.firstName} ${e.lastName || ""}`.trim(),
                        hireDate: e.hireDate,
                        birthDate: e.birthDate,
                        vacationDays: e.vacationDays,
                    })),
                    count: matchingEmployees.length,
                });
            }
        }

        res.json({
            success: true,
            data: triggeredAlerts,
            meta: { totalAlerts: activeAlerts.length, triggeredCount: triggeredAlerts.length },
        });
    } catch (error) {
        console.error("getTriggeredAlerts error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
