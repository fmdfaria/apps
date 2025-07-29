import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true, // para cookies de refresh token
});

// Interceptador para adicionar accessToken
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
});

// Interceptador de resposta para refresh automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Não tenta renovar se já tentou ou se a rota é /refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.endsWith('/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await api.post('/refresh', {
          refreshToken: localStorage.getItem('refreshToken'),
        });
        const { accessToken } = refreshResponse.data;
        localStorage.setItem('accessToken', accessToken);
        if (originalRequest.headers) {
          (originalRequest.headers as any)['Authorization'] = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Se o erro foi no /refresh, desloga direto
    if (originalRequest.url.endsWith('/refresh')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api; 