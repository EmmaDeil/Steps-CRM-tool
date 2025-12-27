// Centralized API service for Steps CRM
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (error.response?.status === 404) {
      // Don't show toast for 404s - handle in component
      console.warn('Resource not found:', error.config.url);
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const apiService = {
  // Generic CRUD operations
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),

  // Module-specific endpoints
  attendance: {
    getAll: () => api.get('/api/attendance'),
    getById: (id) => api.get(`/api/attendance/${id}`),
    create: (data) => api.post('/api/attendance', data),
    update: (id, data) => api.put(`/api/attendance/${id}`, data),
    delete: (id) => api.delete(`/api/attendance/${id}`),
  },

  accounting: {
    getTransactions: (params) => api.get('/api/accounting/transactions', { params }),
    createTransaction: (data) => api.post('/api/accounting/transactions', data),
    getStats: () => api.get('/api/accounting/stats'),
  },

  inventory: {
    getItems: (params) => api.get('/api/inventory/items', { params }),
    createItem: (data) => api.post('/api/inventory/items', data),
    updateItem: (id, data) => api.put(`/api/inventory/items/${id}`, data),
    getStats: () => api.get('/api/inventory/stats'),
  },

  hr: {
    getEmployees: (params) => api.get('/api/hr/employees', { params }),
    createEmployee: (data) => api.post('/api/hr/employees', data),
    updateEmployee: (id, data) => api.put(`/api/hr/employees/${id}`, data),
    getStats: () => api.get('/api/hr/stats'),
  },

  facility: {
    getTickets: (params) => api.get('/api/facility/tickets', { params }),
    createTicket: (data) => api.post('/api/facility/tickets', data),
    updateTicket: (id, data) => api.put(`/api/facility/tickets/${id}`, data),
    getStats: () => api.get('/api/facility/stats'),
  },

  finance: {
    getReports: () => api.get('/api/finance/reports'),
    generateReport: (type, params) => api.post('/api/finance/reports/generate', { type, params }),
  },

  security: {
    getLogs: (params) => api.get('/api/security/logs', { params }),
    getStats: () => api.get('/api/security/stats'),
  },

  admin: {
    getUsers: (params) => api.get('/api/admin/users', { params }),
    updateUser: (id, data) => api.put(`/api/admin/users/${id}`, data),
    getSystemStats: () => api.get('/api/admin/system/stats'),
  },

  user: {
    getProfile: (userId) => api.get(`/api/user/profile/${userId}`),
    updateProfile: (userId, data) => api.put(`/api/user/profile/${userId}`, data),
    uploadProfilePicture: (userId, formData) => api.post(`/api/user/profile/${userId}/upload-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    createOrUpdateProfile: (data) => api.post('/api/user/profile', data),
  },
};

export default api;
