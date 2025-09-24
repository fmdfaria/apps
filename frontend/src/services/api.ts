import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { AppToast } from './toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true, // para cookies de refresh token
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

// Interceptador de resposta para refresh automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Não tenta renovar se já tentou ou se a rota é de autenticação
    const isAuthRoute = originalRequest.url.endsWith('/login') || 
                       originalRequest.url.endsWith('/refresh') ||
                       originalRequest.url.endsWith('/register') ||
                       originalRequest.url.endsWith('/first-login') ||
                       originalRequest.url.includes('/password/');
    
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await api.post('/refresh', {
          refreshToken: localStorage.getItem('refreshToken'),
        });
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
        
        // Atualiza ambos os tokens
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        if (originalRequest.headers) {
          (originalRequest.headers as any)['Authorization'] = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Falha na renovação automática de token:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Só redireciona se não estivermos já na página de login
        if (!window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Se o erro foi no /refresh, desloga direto
    if (originalRequest.url.endsWith('/refresh')) {
      console.error('Falha no endpoint /refresh, fazendo logout');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // Só redireciona se não estivermos já na página de login
      if (!window.location.pathname.includes('/auth/login')) {
        window.location.href = '/auth/login';
      }
    }

    // Trata erros 403 (Acesso Negado) com mensagem amigável
    if (error.response?.status === 403) {
      handleForbiddenError(originalRequest, error.response?.data);
    }

    return Promise.reject(error);
  }
);

export default api; 