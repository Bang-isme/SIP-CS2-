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
    if (token) {
        config.headers['x-access-token'] = token;
    }
    return config;
});

// Auth
export const login = async (email, password) => {
    const response = await api.post('/auth/signin', { email, password });
    // Backend returns { success, data, token } - token is at root level
    if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
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

export const getDrilldown = async (filters) => {
    const response = await api.get('/dashboard/drilldown', { params: filters });
    return response.data;
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
