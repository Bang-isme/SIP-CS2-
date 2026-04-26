import Department from "../models/Department.js";
import Employee from "../models/Employee.js";
import { buildDepartmentNameMap, resolveDepartmentIdByName } from "../utils/departmentMapping.js";

export async function resolveDashboardDepartmentScope(departmentName) {
  const normalizedDepartmentName = departmentName === undefined || departmentName === null
    ? ""
    : String(departmentName).trim();

  if (!normalizedDepartmentName) {
    return {
      scopeType: "company",
      scopeValue: null,
      department: null,
    };
  }

  const { map } = await buildDepartmentNameMap({
    DepartmentModel: Department,
    EmployeeModel: Employee,
  });
  const departmentId = resolveDepartmentIdByName(normalizedDepartmentName, map);

  if (!departmentId) {
    return {
      scopeType: "department",
      scopeValue: "__missing__",
      department: normalizedDepartmentName,
    };
  }

  return {
    scopeType: "department",
    scopeValue: departmentId,
    department: map.get(departmentId) || normalizedDepartmentName,
  };
}
