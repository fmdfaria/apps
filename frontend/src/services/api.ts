import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { AppToast } from './toast';
import { getRouteInfo } from './routes-info';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true, // para cookies de refresh token
});

// Função para tratar erros 403 com mensagens amigáveis
async function handleForbiddenError(originalRequest: any) {
  try {
    // Extrai o path e método da requisição
    const fullUrl = originalRequest.url;
    const method = originalRequest.method?.toUpperCase() || 'GET';
    
    // Remove a base URL para obter apenas o path
    const baseURL = api.defaults.baseURL || '';
    const path = fullUrl.startsWith(baseURL) ? fullUrl.replace(baseURL, '') : fullUrl;
    
    // Remove query parameters para buscar a rota exata
    const cleanPath = path.split('?')[0];
    
    // Busca informações da rota
    const routeInfo = await getRouteInfo(cleanPath, method);
    
    if (routeInfo) {
      // Mensagem amigável com informações da rota
      AppToast.accessDenied(routeInfo.nome, routeInfo.descricao);
    } else {
      // Mensagem genérica se a rota não for encontrada
      AppToast.accessDenied();
    }
  } catch (err) {
    // Se houver erro ao buscar informações da rota, mostra mensagem genérica
    AppToast.accessDenied();
  }
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
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    // Se o erro foi no /refresh, desloga direto
    if (originalRequest.url.endsWith('/refresh')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/auth/login';
    }

    // Trata erros 403 (Acesso Negado) com mensagem amigável
    if (error.response?.status === 403) {
      handleForbiddenError(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api; 