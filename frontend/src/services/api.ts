import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { AppToast } from './toast';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}

interface PendingRequest {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

let isRefreshing = false;
let pendingRequests: PendingRequest[] = [];

const AUTH_401_IGNORE_PREFIXES = [
  '/login',
  '/first-login',
  '/refresh',
  '/password/validate',
  '/password/reset',
  '/password/request-reset',
  '/email/confirm',
];

function processPendingRequests(error: unknown, token: string | null) {
  pendingRequests.forEach((request) => {
    if (error || !token) {
      request.reject(error || new Error('Falha ao renovar token'));
      return;
    }

    request.resolve(token);
  });

  pendingRequests = [];
}

function forceLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  if (!window.location.pathname.includes('/auth/login')) {
    window.location.href = '/auth/login';
  }
}

function getRequestPath(config?: RetryableRequestConfig): string {
  if (!config?.url) {
    return '';
  }

  const baseURL = config.baseURL || api.defaults.baseURL || '';
  const withoutBase = baseURL && config.url.startsWith(baseURL)
    ? config.url.slice(baseURL.length)
    : config.url;

  return withoutBase.split('?')[0] || '';
}

function shouldSkipAuthHandling(config?: RetryableRequestConfig): boolean {
  if (!config) {
    return false;
  }

  if (config.skipAuthRefresh) {
    return true;
  }

  const path = getRequestPath(config);
  return AUTH_401_IGNORE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function refreshAccessToken(): Promise<string> {
  const currentRefreshToken = localStorage.getItem('refreshToken');

  if (!currentRefreshToken) {
    throw new Error('Refresh token ausente');
  }

  const response = await api.post(
    '/refresh',
    { refreshToken: currentRefreshToken },
    { skipAuthRefresh: true } as RetryableRequestConfig
  );

  const { accessToken, refreshToken, user } = response.data;

  if (!accessToken || !refreshToken) {
    throw new Error('Resposta de refresh invalida');
  }

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  return accessToken;
}

function handleForbiddenError(originalRequest: RetryableRequestConfig, backendData?: any) {
  const backendMethod = backendData?.method?.toUpperCase?.();
  const backendPath = backendData?.requiredPath;

  if (backendMethod && backendPath) {
    AppToast.accessDenied(`${backendMethod} ${backendPath}`);
    return;
  }

  const fullUrl = originalRequest.url;
  const method = originalRequest.method?.toUpperCase() || 'GET';
  const baseURL = api.defaults.baseURL || '';
  const path = fullUrl?.startsWith?.(baseURL) ? fullUrl.replace(baseURL, '') : fullUrl;
  const cleanPath = (path || '')?.split?.('?')[0] || '/';

  console.warn(`Acesso negado para ${method} ${cleanPath}`);
  AppToast.accessDenied(`${method} ${cleanPath}`);
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const requestConfig = config as RetryableRequestConfig;

  if (requestConfig.skipAuthRefresh) {
    return requestConfig;
  }

  const token = localStorage.getItem('accessToken');
  if (token && requestConfig.headers) {
    (requestConfig.headers as any).Authorization = `Bearer ${token}`;
  }

  return requestConfig;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = (error.config || {}) as RetryableRequestConfig;

    if (error.response?.status === 401) {
      if (shouldSkipAuthHandling(originalRequest)) {
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        forceLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                (originalRequest.headers as any).Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();
        processPendingRequests(null, newAccessToken);

        if (originalRequest.headers) {
          (originalRequest.headers as any).Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processPendingRequests(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      handleForbiddenError(originalRequest, (error.response.data as any) || undefined);
    }

    return Promise.reject(error);
  }
);

export default api;
