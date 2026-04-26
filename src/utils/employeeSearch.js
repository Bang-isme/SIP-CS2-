import { escapeRegexLiteral } from "./dashboardContracts.js";

const toCapitalizedWord = (value = "") => (
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
);

const buildPrefixRegex = (value) => new RegExp(`^${escapeRegexLiteral(value)}`);

export const buildEmployeeSearchQuery = (search = "") => {
  const normalizedSearch = String(search).trim();
  if (!normalizedSearch) {
    return null;
  }

  const compactSearch = normalizedSearch.replace(/\s+/g, " ").trim();
  const upperSearch = compactSearch.toUpperCase();
  const capitalizedSearch = toCapitalizedWord(compactSearch);
  const parts = capitalizedSearch.split(" ").filter(Boolean);

  const orClauses = [
    { employeeId: upperSearch },
    { employeeId: buildPrefixRegex(upperSearch) },
    { firstName: capitalizedSearch },
    { lastName: capitalizedSearch },
    { firstName: buildPrefixRegex(capitalizedSearch) },
    { lastName: buildPrefixRegex(capitalizedSearch) },
  ];

  if (parts.length >= 2) {
    const [firstName, ...rest] = parts;
    const lastName = rest.join(" ");
    orClauses.push(
      { firstName, lastName },
      { firstName: buildPrefixRegex(firstName), lastName: buildPrefixRegex(lastName) },
    );
  }

  return { $or: orClauses };
};
