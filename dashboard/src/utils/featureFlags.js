const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

const isTruthy = (value) => TRUTHY_VALUES.has(String(value || '').trim().toLowerCase());

export const isSelfSignupEnabled = () => {
  const rawValue = import.meta.env.VITE_ENABLE_SELF_SIGNUP;
  if (rawValue === undefined) {
    return true;
  }
  return isTruthy(rawValue);
};

export const isDemoShortcutsEnabled = () => {
  if (!isTruthy(import.meta.env.VITE_ENABLE_DEMO_SHORTCUTS)) {
    return false;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  return ['127.0.0.1', 'localhost'].includes(window.location.hostname);
};
