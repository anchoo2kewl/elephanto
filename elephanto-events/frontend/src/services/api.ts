import axios from 'axios';
import { AuthResponse, LoginRequest, UpdateProfileRequest, UpdateRoleRequest, User } from '@/types';

// Get API URL dynamically at request time
const getAPIURL = () => {
  // First try to get from runtime config injected by container startup
  if (typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.API_URL !== undefined) {
    const runtimeApiUrl = (window as any).__APP_CONFIG__.API_URL;
    console.log('Runtime API URL:', runtimeApiUrl);
    // If runtime config is not empty, use it directly
    if (runtimeApiUrl !== '') {
      return runtimeApiUrl;
    }
    // If runtime config is empty, use current domain (production case)
    console.log('Using current domain:', window.location.origin);
    return window.location.origin;
  }
  
  // Fallback to build-time environment variable (for development)
  const fallback = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080';
  console.log('Using fallback API URL:', fallback);
  return fallback;
};

// Create axios instance without fixed baseURL
const api = axios.create({
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Set baseURL dynamically for each request
  const apiUrl = getAPIURL();
  
  // Backend always expects /api prefix in both local and production
  config.baseURL = `${apiUrl}/api`;
  console.log('Final baseURL:', config.baseURL);
  
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  requestLogin: (data: LoginRequest) => 
    api.post('/auth/request-login', data),
  
  verifyToken: (token: string) => 
    api.get<AuthResponse>(`/auth/verify?token=${token}`),
  
  getMe: () => 
    api.get<User>('/auth/me'),
  
  logout: () => 
    api.post('/auth/logout'),
};

export const userAPI = {
  updateProfile: (data: UpdateProfileRequest) => 
    api.put<User>('/users/profile', data),
};

export const adminAPI = {
  getUsers: () => 
    api.get<any[]>('/admin/users'),
  
  getUserWithDetails: (userId: string) => 
    api.get(`/admin/users/${userId}`),
  
  updateUserRole: (userId: string, data: UpdateRoleRequest) => 
    api.put(`/admin/users/${userId}/role`, data),
  
  updateUserFull: (userId: string, data: any) => 
    api.put(`/admin/users/${userId}`, data),
  
  createUser: (data: any) => 
    api.post('/admin/users', data),
  
  updateUserAttendance: (userId: string, attending: boolean) =>
    api.put(`/admin/users/${userId}/attendance`, { attending }),
  
  getMigrationStatus: () => 
    api.get('/admin/migrations'),

  updateUserSurvey: (userId: string, surveyData: any) =>
    api.put(`/admin/users/${userId}/survey`, surveyData),

  updateUserCocktail: (userId: string, cocktailData: any) =>
    api.put(`/admin/users/${userId}/cocktail`, cocktailData),

  deleteUser: (userId: string) =>
    api.delete(`/admin/users/${userId}`),

  exportUsersCSV: () =>
    api.get('/admin/users/export/csv', {
      responseType: 'blob', // Important for file downloads
      headers: {
        'Accept': 'text/csv'
      }
    }),

  // Audit logs
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    adminId?: string;
    targetUserId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.adminId) searchParams.set('adminId', params.adminId);
    if (params?.targetUserId) searchParams.set('targetUserId', params.targetUserId);
    
    const queryString = searchParams.toString();
    return api.get(`/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
  },

  // Personal access tokens
  getTokens: () =>
    api.get('/admin/tokens'),

  createToken: (data: { name: string; expiresIn: number }) =>
    api.post('/admin/tokens', data),

  deleteToken: (tokenId: string) =>
    api.delete(`/admin/tokens/${tokenId}`),
};

export default api;