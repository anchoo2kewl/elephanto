export interface User {
  id: string;
  email: string;
  name?: string;
  dateOfBirth?: string;
  currentCity?: string;
  role: 'user' | 'admin';
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
}

export interface UpdateProfileRequest {
  name?: string;
  dateOfBirth?: string;
  currentCity?: string;
}

export interface UpdateRoleRequest {
  role: 'user' | 'admin';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}