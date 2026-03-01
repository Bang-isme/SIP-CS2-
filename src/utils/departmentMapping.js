const DEPARTMENT_FALLBACK_ORDER = [
  "Human Resources",
  "Finance",
  "Engineering",
  "Sales",
  "Marketing",
  "IT Support",
  "Operations",
  "Legal",
];

const FALLBACK_PREFIX = "Department";

export const normalizeDepartmentName = (value) =>
  String(value || "").trim().toLowerCase();

export const buildFallbackDepartmentMapFromIds = (departmentIds = []) => {
  const sortedIds = [...new Set((departmentIds || []).filter(Boolean).map((id) => String(id)))]
    .sort((a, b) => a.localeCompare(b));

  const map = new Map();
  sortedIds.forEach((id, index) => {
    const fallbackName =
      DEPARTMENT_FALLBACK_ORDER[index] || `${FALLBACK_PREFIX}-${index + 1}`;
    map.set(id, fallbackName);
  });
  return map;
};

export const buildDepartmentNameMap = async ({ DepartmentModel, EmployeeModel }) => {
  const departments = await DepartmentModel.find().select("_id name").lean();
  if (departments.length > 0) {
    return {
      map: new Map(departments.map((d) => [String(d._id), d.name])),
      usedFallback: false,
    };
  }

  const distinctIds = await EmployeeModel.distinct("departmentId", {
    departmentId: { $exists: true, $ne: null },
  });

  return {
    map: buildFallbackDepartmentMapFromIds(distinctIds),
    usedFallback: true,
  };
};

export const resolveDepartmentIdByName = (departmentName, departmentMap) => {
  const needle = normalizeDepartmentName(departmentName);
  if (!needle) return null;

  for (const [id, name] of departmentMap.entries()) {
    if (normalizeDepartmentName(name) === needle) {
      return id;
    }
  }
  return null;
};

export const listDepartmentNames = (departmentMap) => {
  const seen = new Set();
  const names = [];

  for (const name of departmentMap.values()) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
};

