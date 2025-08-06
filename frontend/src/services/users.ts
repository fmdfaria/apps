import api from './api';
import type { User, UserType } from '../types/User';

// Interface para criar/atualizar usuário
export interface CreateUserData {
  nome: string;
  email: string;
  senha: string;
  tipo: UserType;
}

export interface UpdateUserData {
  nome?: string;
  email?: string;
  tipo?: UserType;
  ativo?: boolean;
}

export async function getUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/users');
  return res.data;
}

export async function createUser(data: CreateUserData): Promise<User> {
  const res = await api.post<User>('/register', data);
  return res.data;
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const res = await api.put<User>(`/users/${id}`, data);
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}