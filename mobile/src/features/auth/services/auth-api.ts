import { api } from '@/services/api/client';
import type { AuthResponse, FirstLoginRequest, FirstLoginResponse, User, UserPermission } from '@/features/auth/types';

export async function login(email: string, senha: string) {
  const response = await api.post<AuthResponse>('/login', { email, senha });
  return response.data;
}

export async function firstLogin(payload: FirstLoginRequest) {
  const response = await api.post<FirstLoginResponse>('/first-login', payload);
  return response.data;
}

export async function refreshSession(refreshToken: string) {
  const response = await api.post<Omit<AuthResponse, 'requiresPasswordChange'>>(
    '/refresh',
    { refreshToken },
    { skipAuthRefresh: true },
  );

  return response.data;
}

export async function logout(refreshToken?: string) {
  await api.post('/logout', { refreshToken }, { skipAuthRefresh: true });
}

export async function getCurrentUser() {
  const response = await api.get<User>('/users/me');
  return response.data;
}

export async function getCurrentUserPermissions() {
  const response = await api.get<UserPermission[]>('/users/me/permissions');
  return response.data;
}
