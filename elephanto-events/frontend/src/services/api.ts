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
};

export default api;