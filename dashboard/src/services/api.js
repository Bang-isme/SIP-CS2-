import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

// Create axios instance with auth token
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    // Debug logging for development
    if (process.env.NODE_ENV !== 'production' && !token) {
        console.warn('[API] No token found in localStorage');
    }

    if (token) {
        config.headers['x-access-token'] = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor for debugging
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.error('[API] Auth Error:', error.response.data?.message);
            // Optional: Auto-logout on 401
            // localStorage.removeItem('token');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/signin', { email, password });
        console.log('[API] Login response:', response.data);

        // Backend returns { success, data, token } or just { token, ... }
        // Handle both possible structures
        const token = response.data?.token || response.data?.data?.token;

        if (token) {
            console.log('[API] Token saved to localStorage');
            localStorage.setItem('token', token);
        } else {
            console.error('[API] No token in response!', response.data);
        }

        return response.data;
    } catch (error) {
        console.error('[API] Login failed:', error);
        throw error;
    }
};

export const register = async (username, email, password) => {
    try {
        const response = await api.post('/auth/signup', { username, email, password });
        return response.data;
    } catch (error) {
        console.error('[API] Registration failed:', error);
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

// Dashboard APIs (SELECT only)
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

export const getDrilldown = async (filters, config = {}) => {
    const response = await api.get('/dashboard/drilldown', { params: filters, ...config });
    return response.data;
};

export const exportDrilldownCsv = async (filters) => {
    const response = await api.get('/dashboard/drilldown/export', {
        params: filters,
        responseType: 'blob'
    });
    return response.data;
};

export const getDepartments = async () => {
    const response = await api.get('/dashboard/departments');
    return response.data?.data || [];
};

// Alerts APIs (SELECT only for Case Study 1)
export const getTriggeredAlerts = async () => {
    const response = await api.get('/alerts/triggered');
    return response.data;
};

export const getAlerts = async () => {
    const response = await api.get('/alerts');
    return response.data;
};

export default api;
