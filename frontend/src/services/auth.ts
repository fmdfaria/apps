import api from './api';
import type { AuthResponse, FirstLoginRequest, FirstLoginResponse } from '../types/User';

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