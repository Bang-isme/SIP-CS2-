import Employee from "../models/Employee.js";
import { syncEmployeeToPayroll } from "../services/syncService.js";

/**
 * Create Employee - Case Study 3: Data Consistency
 * 
 * 1. Creates employee in HR system (MongoDB)
 * 2. Syncs to Payroll system (MySQL) via syncService
 */
export const createEmployee = async (req, res) => {
    try {
        const { employeeId, firstName, lastName, vacationDays, paidToDate, paidLastYear, payRate, payRateId,
            gender, ethnicity, employmentType, isShareholder, departmentId, hireDate, birthDate } = req.body;

        // Step 1: Create in MongoDB (HR System)
        const employee = new Employee({
            employeeId,
            firstName,
            lastName,
            gender,
            ethnicity,
            employmentType,
            isShareholder,
            departmentId,
            hireDate,
            birthDate,
            vacationDays,
            paidToDate,
            paidLastYear,
            payRate,
            payRateId
        });

        const savedEmployee = await employee.save();

        // Step 2: Sync to Payroll (MySQL) - Eventual Consistency
        const syncResult = await syncEmployeeToPayroll(employeeId, "CREATE", {
            payRate,
            payRateId,
        });

        // Return success with sync status
        return res.status(201).json({
            success: true,
            data: {
                _id: savedEmployee._id,
                employeeId: savedEmployee.employeeId,
                firstName: savedEmployee.firstName,
                lastName: savedEmployee.lastName,
                gender: savedEmployee.gender,
                employmentType: savedEmployee.employmentType,
                isShareholder: savedEmployee.isShareholder,
            },
            sync: {
                status: syncResult.success ? "SUCCESS" : "PENDING",
                message: syncResult.success
                    ? "Synced to Payroll system"
                    : "Will retry sync automatically",
            }
        });
    } catch (error) {
        console.error("createEmployee error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update Employee - Case Study 3: Data Consistency
 */
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Step 1: Update in MongoDB
        const employee = await Employee.findByIdAndUpdate(id, updateData, { new: true });

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        // Step 2: Sync to Payroll
        const syncResult = await syncEmployeeToPayroll(employee.employeeId, "UPDATE", updateData);

        return res.json({
            success: true,
            data: employee,
            sync: {
                status: syncResult.success ? "SUCCESS" : "PENDING",
            }
        });
    } catch (error) {
        console.error("updateEmployee error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete Employee - Case Study 3: Data Consistency
 */
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await Employee.findByIdAndDelete(id);

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        // Sync deletion to Payroll
        await syncEmployeeToPayroll(employee.employeeId, "DELETE");

        return res.json({
            success: true,
            message: "Employee deleted and synced",
        });
    } catch (error) {
        console.error("deleteEmployee error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findById(req.params.employeeId);
        return res.json({ success: true, data: employee });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getEmployees = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const employees = await Employee.find().skip(skip).limit(limit);
        const total = await Employee.countDocuments();

        return res.json({
            data: employees,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
