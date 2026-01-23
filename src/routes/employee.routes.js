import { Router } from "express";
import { createEmployee, getEmployees, getEmployee, updateEmployee, deleteEmployee } from "../controllers/employee.controller.js";
import { isAdmin, verifyToken } from "../middlewares/authJwt.js";

const router = Router();

// Public endpoints (for testing - in production, add auth)
router.get("/", getEmployees);
router.get("/:employeeId", getEmployee);

// Protected endpoints (require auth)
router.post("/", [verifyToken], createEmployee);
router.put("/:id", [verifyToken], updateEmployee);
router.delete("/:id", [verifyToken, isAdmin], deleteEmployee);

export default router;
