import axios from 'axios';
import { createSessionRestorer } from '../utils/sessionRestore';

const resolveBrowserApiBase = (port) => {
  if (typeof window === 'undefined') {
    return `http://127.0.0.1:${port}/api`;
  }
  return `${window.location.protocol}//${window.location.hostname}:${port}/api`;
};

const SA_API_BASE = import.meta.env.VITE_SA_API_BASE_URL
  || import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:4000/api' : resolveBrowserApiBase(4000));

const DASHBOARD_API_BASE = import.meta.env.VITE_DASHBOARD_API_BASE_URL
  || import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:4200/api' : resolveBrowserApiBase(4200));

let unauthorizedHandler = null;
let accessToken = '';
let refreshPromise = null;

const extractToken = (payload) => payload?.token || payload?.data?.token || '';

const clearAccessToken = () => {
  accessToken = '';
};

const EMPTY_JSON_BODY = {};

const setAccessToken = (token) => {
  accessToken = typeof token === 'string' ? token.trim() : '';
  return accessToken;
};

const isAuthRoute = (url = '') => [
  '/auth/signin',
  '/auth/signup',
  '/auth/logout',
  '/auth/refresh',
].some((segment) => url.includes(segment));

const shouldBypassUnauthorizedHandler = (config = {}) => Boolean(config?.__skipUnauthorizedHandler);

const bareSaApi = axios.create({
  baseURL: SA_API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = bareSaApi.post('/auth/refresh', EMPTY_JSON_BODY, {
    __skipUnauthorizedHandler: true,
    __skipAuthRefresh: true,
  }).then((response) => {
    const token = extractToken(response.data);
    if (!token) {
      throw new Error('Missing auth token in refresh response');
    }
    setAccessToken(token);
    return response.data;
  }).catch((error) => {
    clearAccessToken();
    throw error;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const probeRefreshAvailability = async () => {
  const response = await bareSaApi.get('/auth/session', {
    __skipUnauthorizedHandler: true,
    __skipAuthRefresh: true,
  });
  return Boolean(response?.data?.data?.refreshAvailable);
};

const notifyUnauthorized = (error, config = {}) => {
  clearAccessToken();
  if (!shouldBypassUnauthorizedHandler(config) && typeof unauthorizedHandler === 'function') {
    unauthorizedHandler(error);
  }
};

const createApiClient = (baseURL, { withCredentials = false } = {}) => {
  const client = axios.create({
    baseURL,
    withCredentials,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    (config) => {
      if (accessToken) {
        config.headers['x-access-token'] = accessToken;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status;
      const requestUrl = error?.config?.url || '';
      const originalConfig = error?.config || {};

      if (
        status === 401
        && !isAuthRoute(requestUrl)
        && !originalConfig.__skipAuthRefresh
        && !originalConfig.__retriedWithRefresh
      ) {
        try {
          await refreshAccessToken();
          originalConfig.__retriedWithRefresh = true;
          originalConfig.headers = {
            ...(originalConfig.headers || {}),
          };
          if (accessToken) {
            originalConfig.headers['x-access-token'] = accessToken;
          }
          return client(originalConfig);
        } catch (refreshError) {
          notifyUnauthorized(refreshError, originalConfig);
          return Promise.reject(refreshError);
        }
      }

      if (status === 401 && !isAuthRoute(requestUrl)) {
        notifyUnauthorized(error, originalConfig);
      }

      return Promise.reject(error);
    },
  );

  return client;
};

const saApi = createApiClient(SA_API_BASE, { withCredentials: true });
const dashboardApi = createApiClient(DASHBOARD_API_BASE);

const mergeRequestParams = (config = {}, extraParams = {}) => {
  const { params: existingParams, ...axiosConfig } = config || {};
  const params = Object.fromEntries(
    Object.entries({
      ...(existingParams || {}),
      ...extraParams,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

  return {
    ...axiosConfig,
    params,
  };
};

export const restoreSession = createSessionRestorer({
  probeRefreshAvailability,
  restoreWithRefresh: refreshAccessToken,
  clearSessionToken: clearAccessToken,
});

// Auth
export const login = async (email, password) => {
  clearAccessToken();
  const response = await saApi.post('/auth/signin', { email, password }, {
    __skipAuthRefresh: true,
    __skipUnauthorizedHandler: true,
  });
  const token = extractToken(response.data);

  if (!token) {
    throw new Error('Missing auth token in sign-in response');
  }

  setAccessToken(token);
  return response.data;
};

export const register = async (username, email, password, roles = ['user']) => {
  const response = await saApi.post('/auth/signup', { username, email, password, roles }, {
    __skipAuthRefresh: true,
    __skipUnauthorizedHandler: true,
  });
  return response.data;
};

export const getUsers = async () => {
  const response = await saApi.get('/users');
  return response.data;
};

export const promoteUserToAdmin = async (userId) => {
  const response = await saApi.put(`/users/${userId}/promote-admin`);
  return response.data;
};

export const demoteUserFromAdmin = async (userId) => {
  const response = await saApi.put(`/users/${userId}/demote-admin`);
  return response.data;
};

export const getMe = async () => {
  const response = await saApi.get('/auth/me');
  return response.data;
};

export const logout = async ({ revoke = true } = {}) => {
  if (revoke) {
    try {
      if (!accessToken) {
        await refreshAccessToken();
      }
      if (accessToken) {
        await saApi.post('/auth/logout', EMPTY_JSON_BODY, {
          __skipUnauthorizedHandler: true,
          __skipAuthRefresh: true,
        });
      }
    } catch {
      // Best-effort revoke; in-memory cleanup still happens below.
    }
  }

  clearAccessToken();
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
};

export const isAuthenticated = () => {
  return Boolean(accessToken);
};

// Dashboard APIs
export const getEarningsSummary = async (year, config = {}) => {
  const { department, ...requestConfig } = config || {};
  const response = await dashboardApi.get(
    '/dashboard/earnings',
    mergeRequestParams(requestConfig, { year, department }),
  );
  return response.data;
};

export const getVacationSummary = async (year, config = {}) => {
  const { department, ...requestConfig } = config || {};
  const response = await dashboardApi.get(
    '/dashboard/vacation',
    mergeRequestParams(requestConfig, { year, department }),
  );
  return response.data;
};

export const getBenefitsSummary = async (config = {}) => {
  const { year, department, ...requestConfig } = config || {};
  const response = await dashboardApi.get(
    '/dashboard/benefits',
    mergeRequestParams(requestConfig, { year, department }),
  );
  return response.data;
};

export const getExecutiveBrief = async (year, config = {}) => {
  const response = await dashboardApi.get('/dashboard/executive-brief', { params: { year }, ...config });
  return response.data;
};

export const getOperationalReadiness = async (year, { forceRefresh = false, ...config } = {}) => {
  const response = await dashboardApi.get('/dashboard/operational-readiness', mergeRequestParams(config, {
    year,
    ...(forceRefresh ? { fresh: true } : {}),
  }));
  return response.data;
};

export const refreshDashboardSummaries = async (year, config = {}) => {
  const response = await dashboardApi.post('/dashboard/refresh-summaries', EMPTY_JSON_BODY, {
    params: { year },
    ...config,
  });
  return response.data;
};

export const getDrilldown = async (filters, config = {}) => {
  const response = await dashboardApi.get('/dashboard/drilldown', { params: filters, ...config });
  return response.data;
};

export const exportDrilldownCsv = async (filters) => {
  const response = await dashboardApi.get('/dashboard/drilldown/export', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

export const getDepartments = async () => {
  const response = await dashboardApi.get('/dashboard/departments');
  return response.data?.data || [];
};

export const getEmployeesPage = async ({
  page = 1,
  limit = 20,
  search = '',
  departmentId = '',
  employmentType = '',
} = {}) => {
  const response = await saApi.get('/employee', {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(employmentType ? { employmentType } : {}),
    },
  });
  return response.data;
};

export const getEmployeeEditorOptions = async () => {
  const response = await saApi.get('/employee/options');
  return response.data;
};

export const getEmployeeSyncEvidence = async (employeeId) => {
  const response = await saApi.get(`/employee/${encodeURIComponent(employeeId)}/sync-evidence`);
  return response.data;
};

export const createEmployeeRecord = async (payload) => {
  const response = await saApi.post('/employee', payload);
  return response.data;
};

export const updateEmployeeRecord = async (id, payload) => {
  const response = await saApi.put(`/employee/${id}`, payload);
  return response.data;
};

export const deleteEmployeeRecord = async (id) => {
  const response = await saApi.delete(`/employee/${id}`);
  return response.data;
};

// Alerts APIs
export const getTriggeredAlerts = async (config = {}) => {
  const response = await dashboardApi.get('/alerts/triggered', config);
  return response.data;
};

export const getAlerts = async () => {
  const response = await dashboardApi.get('/alerts');
  return response.data;
};

export const createAlertConfig = async (payload) => {
  const response = await dashboardApi.post('/alerts', payload);
  return response.data;
};

export const updateAlertConfig = async (alertId, payload) => {
  const response = await dashboardApi.put(`/alerts/${alertId}`, payload);
  return response.data;
};

export const deleteAlertConfig = async (alertId) => {
  const response = await dashboardApi.delete(`/alerts/${alertId}`);
  return response.data;
};

export const acknowledgeAlert = async (alertId, payload) => {
  const response = await dashboardApi.post(`/alerts/${alertId}/acknowledge`, payload);
  return response.data;
};

// Integrations (Outbox Monitor)
export const getIntegrationEvents = async ({ status, page = 1, limit = 10 } = {}) => {
  const response = await saApi.get('/integrations/events', {
    params: {
      ...(status && status !== 'ALL' ? { status } : {}),
      page,
      limit,
    },
  });
  return response.data;
};

export const getIntegrationMetrics = async (config = {}) => {
  const response = await saApi.get('/integrations/events/metrics', config);
  return response.data;
};

export const getIntegrationReconciliation = async ({ forceRefresh = false, ...config } = {}) => {
  const response = await saApi.get('/integrations/events/reconciliation', mergeRequestParams(config, {
    ...(forceRefresh ? { fresh: true } : {}),
  }));
  return response.data;
};

export const repairIntegrationReconciliation = async () => {
  const response = await saApi.post('/integrations/events/reconciliation/repair');
  return response.data;
};

export const getIntegrationEventAudit = async (id, { page = 1, limit = 6, ...config } = {}) => {
  const response = await saApi.get(`/integrations/events/${id}/audit`, mergeRequestParams(config, {
    page,
    limit,
  }));
  return response.data;
};

export const retryIntegrationEvent = async (id) => {
  const response = await saApi.post(`/integrations/events/retry/${id}`);
  return response.data;
};

export const retryDeadIntegrationEvents = async () => {
  const response = await saApi.post('/integrations/events/retry-dead');
  return response.data;
};

export const recoverStuckIntegrationEvents = async () => {
  const response = await saApi.post('/integrations/events/recover-stuck');
  return response.data;
};

export const replayIntegrationEvents = async (payload = {}) => {
  const response = await saApi.post('/integrations/events/replay', payload);
  return response.data;
};

export const serviceApiBases = {
  sa: SA_API_BASE,
  dashboard: DASHBOARD_API_BASE,
};

export default dashboardApi;
