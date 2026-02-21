import { Router } from "express";
import { createEmployee, getEmployees, getEmployee, updateEmployee, deleteEmployee } from "../controllers/employee.controller.js";
import { isAdmin, verifyToken } from "../middlewares/authJwt.js";

const router = Router();

// Read endpoints require authentication
router.get("/", [verifyToken], getEmployees);
router.get("/:employeeId", [verifyToken], getEmployee);

// Mutation endpoints are admin-only
router.post("/", [verifyToken, isAdmin], createEmployee);
router.put("/:id", [verifyToken, isAdmin], updateEmployee);
router.delete("/:id", [verifyToken, isAdmin], deleteEmployee);

export default router;
