import axios from 'axios';

interface CocktailPreference {
  id: string;
  userId: string;
  preference: string;
  createdAt: string;
  updatedAt: string;
}

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

export const cocktailApi = {
  getPreference: () => 
    api.get<CocktailPreference>('/cocktail-preference'),

  savePreference: (preference: string) => 
    api.post<CocktailPreference>('/cocktail-preference', { preference }),
};