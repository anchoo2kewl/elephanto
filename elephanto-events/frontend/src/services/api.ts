import axios from 'axios';
import { AuthResponse, LoginRequest, UpdateProfileRequest, UpdateRoleRequest, User } from '@/types';

// Get API URL from runtime config or fallback to environment variables
const getAPIURL = () => {
  // First try to get from runtime config injected by container startup
  if (typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.API_URL !== undefined) {
    return (window as any).__APP_CONFIG__.API_URL;
  }
  
  // Fallback to build-time environment variable (for development)
  return (import.meta as any).env.VITE_API_URL !== undefined ? (import.meta as any).env.VITE_API_URL : 'http://localhost:8080';
};

const API_URL = getAPIURL();

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
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
    api.get<User[]>('/admin/users'),
  
  getUserWithDetails: (userId: string) => 
    api.get(`/admin/users/${userId}`),
  
  updateUserRole: (userId: string, data: UpdateRoleRequest) => 
    api.put(`/admin/users/${userId}/role`, data),
  
  updateUserFull: (userId: string, data: any) => 
    api.put(`/admin/users/${userId}`, data),
  
  createUser: (data: any) => 
    api.post('/admin/users', data),
  
  getMigrationStatus: () => 
    api.get('/admin/migrations'),
};

export default api;