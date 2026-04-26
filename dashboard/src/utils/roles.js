/**
 * Shared role normalization and permission helpers.
 * Consolidates duplicated role and permission logic across the dashboard workspace.
 */

/**
 * Normalize a roles array (which may contain strings, objects with .name, or nulls)
 * into a flat array of lowercase strings.
 */
export const normalizeRoles = (roles = []) => {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => {
      if (!role) return null;
      if (typeof role === 'string') return role.toLowerCase();
      if (typeof role === 'object' && role.name) return String(role.name).toLowerCase();
      return null;
    })
    .filter(Boolean);
};

export const hasRole = (roles, roleName) => normalizeRoles(roles).includes(roleName);
export const hasAdminRole = (roles) => hasRole(roles, 'admin');
export const hasSuperAdminRole = (roles) => hasRole(roles, 'super_admin');
export const hasPrivilegedRole = (roles) => hasAdminRole(roles) || hasSuperAdminRole(roles);

/**
 * Determine the single effective role for display purposes (highest privilege wins).
 */
export const getEffectiveRole = (roles) => {
  const normalized = normalizeRoles(roles);
  if (normalized.includes('super_admin')) return 'super_admin';
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('moderator')) return 'moderator';
  if (normalized.includes('user')) return 'user';
  return 'anonymous';
};

/**
 * Derive feature-level permissions from a roles array.
 */
export const getPermissions = (roles) => {
  const normalized = normalizeRoles(roles);
  return {
    canAccessIntegrationQueue: normalized.includes('admin') || normalized.includes('super_admin'),
    canManageEmployees: normalized.includes('super_admin'),
    canManageAlerts:
      normalized.includes('moderator') ||
      normalized.includes('admin') ||
      normalized.includes('super_admin'),
    canManageUsers: normalized.includes('super_admin'),
  };
};
