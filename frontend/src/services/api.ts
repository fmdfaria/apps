import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { AppToast } from './toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

// Função para tratar erros 403 com mensagens amigáveis
function handleForbiddenError(originalRequest: any, backendData?: any) {
  // Se o backend já informou method e requiredPath, usa diretamente
  const backendMethod = backendData?.method?.toUpperCase?.();
  const backendPath = backendData?.requiredPath;

  if (backendMethod && backendPath) {
    AppToast.accessDenied(`${backendMethod} ${backendPath}`);
    return;
  }

  // Extrai informações básicas da requisição para fallback
  const fullUrl = originalRequest.url;
  const method = originalRequest.method?.toUpperCase() || 'GET';
  
  // Remove a base URL para obter apenas o path
  const baseURL = api.defaults.baseURL || '';
  const path = fullUrl?.startsWith?.(baseURL) ? fullUrl.replace(baseURL, '') : fullUrl;
  const cleanPath = (path || '')?.split?.('?')[0] || '/';
  
  console.warn(`Acesso negado para ${method} ${cleanPath}`);
  
  AppToast.accessDenied(`${method} ${cleanPath}`);
}

// Interceptador para adicionar accessToken
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
});

// Interceptador de resposta para lidar com erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se receber 401 (não autorizado), redireciona para login
    if (error.response?.status === 401) {
      console.error('Token expirado ou inválido, fazendo logout');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');

      // Só redireciona se não estivermos já na página de login
      if (!window.location.pathname.includes('/auth/login')) {
        window.location.href = '/auth/login';
      }
      return Promise.reject(error);
    }

    // Trata erros 403 (Acesso Negado) com mensagem amigável
    if (error.response?.status === 403) {
      handleForbiddenError(originalRequest, error.response?.data);
    }

    return Promise.reject(error);
  }
);

export default api; 