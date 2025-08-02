import axios from 'axios';
import { AuthResponse, LoginRequest, UpdateProfileRequest, UpdateRoleRequest, User } from '@/types';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080';

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
  
  updateUserRole: (userId: string, data: UpdateRoleRequest) => 
    api.put(`/admin/users/${userId}/role`, data),
  
  getMigrationStatus: () => 
    api.get('/admin/migrations'),
};

export default api;