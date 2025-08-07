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

export const usersService = {
  getUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/users');
    return res.data;
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    const res = await api.post<User>('/register', data);
    return res.data;
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const res = await api.put<User>(`/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  }
};

// Exportações individuais para compatibilidade
export async function getUsers(): Promise<User[]> {
  return usersService.getUsers();
}

export async function createUser(data: CreateUserData): Promise<User> {
  return usersService.createUser(data);
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  return usersService.updateUser(id, data);
}

export async function deleteUser(id: string): Promise<void> {
  return usersService.deleteUser(id);
}