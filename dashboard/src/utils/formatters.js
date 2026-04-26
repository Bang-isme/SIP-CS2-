/**
 * Shared formatting utilities used across dashboard components.
 * Consolidates duplicated formatters from Dashboard, AdminEmployeesModal,
 * AdminUsersModal, AlertSettingsModal, AlertsPanel, IntegrationEventsPanel,
 * BenefitsChart, EarningsChart, VacationChart, and DrilldownModal.
 */

/**
 * Extract a user-friendly error message from an Axios error or generic Error.
 */
export const getErrorMessage = (error, fallback = 'An unexpected error occurred.') => {
  return error?.response?.data?.message || error?.message || fallback;
};

export const isValidEmail = (value) => {
  if (!value || typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

/**
 * Format a date/time value for display (e.g. "Apr 10, 03:45 PM").
 * @param {string|Date} value - Date string or Date object.
 * @param {object} [options]
 * @param {string} [options.fallback='N/A'] - Text to return when value is empty or invalid.
 */
export const formatTimestamp = (value, { fallback = 'N/A' } = {}) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a number as full US-dollar currency (e.g. "$123,456").
 * Returns '--' for null/undefined/empty values.
 */
export const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};

/**
 * Format a number as compact US-dollar currency for chart axes (e.g. "$1.2M", "$45K").
 */
export const formatCurrencyCompact = (value) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
};

/**
 * Format a number with US locale grouping (e.g. "1,234,567").
 */
export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

/**
 * Extract initials from a display name (e.g. "Jane Doe" → "JD").
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0]?.toUpperCase() || '?';
};

/**
 * Simple dollar formatting without Intl (e.g. "$1,234").
 * Used by BenefitsChart for tooltip values.
 */
export const formatDollar = (value) => `$${(value || 0).toLocaleString()}`;

/**
 * Format a count/integer with locale grouping.
 */
export const formatCount = (value) => Number(value || 0).toLocaleString();
