import api from './api';
import type { AuthResponse, FirstLoginRequest, FirstLoginResponse, User } from '../types/User';

export async function login(email: string, senha: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/login', { email, senha });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post('/logout');
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  const res = await api.post('/refresh', { refreshToken });
  return res.data;
}

export async function firstLogin(data: FirstLoginRequest): Promise<FirstLoginResponse> {
  const res = await api.post<FirstLoginResponse>('/first-login', data);
  return res.data;
}

export async function changePassword(senhaAtual: string, novaSenha: string): Promise<void> {
  await api.post('/password/change', { senhaAtual, novaSenha });
}

export async function getCurrentUser(): Promise<User> {
  const res = await api.get<User>('/users/me');
  return res.data;
} 