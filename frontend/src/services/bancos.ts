import api from './api';
import type { Banco } from '../types/Banco';

export interface CreateBancoData {
  codigo: string;
  nome: string;
}

export interface UpdateBancoData {
  codigo?: string;
  nome?: string;
}

export const getBancos = async (): Promise<Banco[]> => {
  const response = await api.get('/bancos');
  return response.data;
};

export const createBanco = async (data: CreateBancoData): Promise<Banco> => {
  const response = await api.post('/bancos', data);
  return response.data;
};

export const updateBanco = async (id: string, data: UpdateBancoData): Promise<Banco> => {
  const response = await api.put(`/bancos/${id}`, data);
  return response.data;
};

export const deleteBanco = async (id: string): Promise<void> => {
  await api.delete(`/bancos/${id}`);
};