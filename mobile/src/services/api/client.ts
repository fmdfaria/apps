import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearSessionStorage, getAccessToken, getRefreshToken, storeTokens, storeUser } from '@/features/auth/storage';
import type { User } from '@/features/auth/types';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }

  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

type PendingRequest = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333';

const AUTH_401_IGNORE_PREFIXES = [
  '/login',
  '/first-login',
  '/refresh',
  '/password/reset',
  '/password/request-reset',
  '/email/confirm',
];

export const api = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let pendingRequests: PendingRequest[] = [];

function getRequestPath(config?: RetryableRequestConfig) {
  if (!config?.url) {
    return '';
  }

  const baseURL = config.baseURL || api.defaults.baseURL || '';
  const withoutBase = baseURL && config.url.startsWith(baseURL) ? config.url.slice(baseURL.length) : config.url;

  return withoutBase.split('?')[0] || '';
}

function shouldSkipAuthHandling(config?: RetryableRequestConfig) {
  if (!config) {
    return false;
  }

  if (config.skipAuthRefresh) {
    return true;
  }

  const path = getRequestPath(config);
  return AUTH_401_IGNORE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function processPendingRequests(error: unknown, token: string | null) {
  pendingRequests.forEach((request) => {
    if (error || !token) {
      request.reject(error || new Error('Falha ao renovar token.'));
      return;
    }

    request.resolve(token);
  });

  pendingRequests = [];
}

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new Error('Refresh token ausente.');
  }

  const response = await api.post(
    '/refresh',
    { refreshToken },
    { skipAuthRefresh: true } as RetryableRequestConfig,
  );

  const { accessToken, refreshToken: newRefreshToken, user } = response.data as {
    accessToken: string;
    refreshToken: string;
    user?: User;
  };

  if (!accessToken || !newRefreshToken) {
    throw new Error('Resposta inválida de refresh.');
  }

  await storeTokens({ accessToken, refreshToken: newRefreshToken });

  if (user) {
    await storeUser(user);
  }

  return accessToken;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const requestConfig = config as RetryableRequestConfig;

  if (requestConfig.skipAuthRefresh) {
    return requestConfig;
  }

  const token = await getAccessToken();

  if (token && requestConfig.headers) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }

  return requestConfig;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = (error.config || {}) as RetryableRequestConfig;

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (shouldSkipAuthHandling(originalRequest)) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      await clearSessionStorage();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
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
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      return api(originalRequest);
    } catch (refreshError) {
      processPendingRequests(refreshError, null);
      await clearSessionStorage();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
