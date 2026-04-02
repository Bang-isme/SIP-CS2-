import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');
let unauthorizedHandler = null;

const clearStoredToken = () => {
  localStorage.removeItem('token');
};

const isAuthRoute = (url = '') => {
  return url.includes('/auth/signin') || url.includes('/auth/signup') || url.includes('/auth/logout');
};

const shouldBypassUnauthorizedHandler = (config = {}) => {
  return Boolean(config?.__skipUnauthorizedHandler);
};

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-access-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';

    if (status === 401 && !isAuthRoute(requestUrl) && !shouldBypassUnauthorizedHandler(error?.config)) {
      clearStoredToken();
      if (typeof unauthorizedHandler === 'function') {
        unauthorizedHandler(error);
      }
    }

    return Promise.reject(error);
  },
);

// Auth
export const login = async (email, password) => {
  const response = await api.post('/auth/signin', { email, password });
  const token = response.data?.token || response.data?.data?.token;

  if (!token) {
    throw new Error('Missing auth token in sign-in response');
  }

  localStorage.setItem('token', token);
  return response.data;
};

export const register = async (username, email, password, roles = ['user']) => {
  const response = await api.post('/auth/signup', { username, email, password, roles });
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const promoteUserToAdmin = async (userId) => {
  const response = await api.put(`/users/${userId}/promote-admin`);
  return response.data;
};

export const demoteUserFromAdmin = async (userId) => {
  const response = await api.put(`/users/${userId}/demote-admin`);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logout = async ({ revoke = true } = {}) => {
  const token = localStorage.getItem('token');

  if (revoke && token) {
    try {
      await api.get('/auth/logout', {
        __skipUnauthorizedHandler: true,
      });
    } catch {
      // Best-effort revoke; local cleanup still happens below.
    }
  }

  clearStoredToken();
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
};

export const isAuthenticated = () => {
  return Boolean(localStorage.getItem('token'));
};

// Dashboard APIs
export const getEarningsSummary = async (year) => {
  const response = await api.get('/dashboard/earnings', { params: { year } });
  return response.data;
};

export const getVacationSummary = async (year) => {
  const response = await api.get('/dashboard/vacation', { params: { year } });
  return response.data;
};

export const getBenefitsSummary = async () => {
  const response = await api.get('/dashboard/benefits');
  return response.data;
};

export const getExecutiveBrief = async (year) => {
  const response = await api.get('/dashboard/executive-brief', { params: { year } });
  return response.data;
};

export const getDrilldown = async (filters, config = {}) => {
  const response = await api.get('/dashboard/drilldown', { params: filters, ...config });
  return response.data;
};

export const exportDrilldownCsv = async (filters) => {
  const response = await api.get('/dashboard/drilldown/export', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

export const getDepartments = async () => {
  const response = await api.get('/dashboard/departments');
  return response.data?.data || [];
};

// Alerts APIs
export const getTriggeredAlerts = async () => {
  const response = await api.get('/alerts/triggered');
  return response.data;
};

export const getAlerts = async () => {
  const response = await api.get('/alerts');
  return response.data;
};

export const createAlertConfig = async (payload) => {
  const response = await api.post('/alerts', payload);
  return response.data;
};

export const updateAlertConfig = async (alertId, payload) => {
  const response = await api.put(`/alerts/${alertId}`, payload);
  return response.data;
};

export const deleteAlertConfig = async (alertId) => {
  const response = await api.delete(`/alerts/${alertId}`);
  return response.data;
};

export const acknowledgeAlert = async (alertId, payload) => {
  const response = await api.post(`/alerts/${alertId}/acknowledge`, payload);
  return response.data;
};

// Integrations (Outbox Monitor)
export const getIntegrationEvents = async ({ status, page = 1, limit = 10 } = {}) => {
  const response = await api.get('/integrations/events', {
    params: {
      ...(status && status !== 'ALL' ? { status } : {}),
      page,
      limit,
    },
  });
  return response.data;
};

export const getIntegrationMetrics = async () => {
  const response = await api.get('/integrations/events/metrics');
  return response.data;
};

export const retryIntegrationEvent = async (id) => {
  const response = await api.post(`/integrations/events/retry/${id}`);
  return response.data;
};

export const retryDeadIntegrationEvents = async () => {
  const response = await api.post('/integrations/events/retry-dead');
  return response.data;
};

export const recoverStuckIntegrationEvents = async () => {
  const response = await api.post('/integrations/events/recover-stuck');
  return response.data;
};

export const replayIntegrationEvents = async (payload = {}) => {
  const response = await api.post('/integrations/events/replay', payload);
  return response.data;
};

export default api;
