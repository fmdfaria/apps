import api from './api';
import type { FilaEspera } from '@/types/FilaEspera';

export const getFilaEspera = async (): Promise<FilaEspera[]> => {
  const { data } = await api.get('/fila-de-espera');
  return data;
};

export const getFilaEsperaAtiva = async (): Promise<FilaEspera[]> => {
  const { data } = await api.get('/fila-de-espera?ativo=true');
  return data;
};

export const getFilaEsperaById = async (id: string): Promise<FilaEspera> => {
  const { data } = await api.get(`/fila-de-espera/${id}`);
  return data;
};

export const createFilaEspera = async (payload: Omit<FilaEspera, 'id' | 'createdAt' | 'updatedAt'>): Promise<FilaEspera> => {
  const { data } = await api.post('/fila-de-espera', payload);
  return data;
};

export const updateFilaEspera = async (id: string, payload: Omit<FilaEspera, 'id' | 'createdAt' | 'updatedAt'>): Promise<FilaEspera> => {
  const { data } = await api.put(`/fila-de-espera/${id}`, payload);
  return data;
};

export const deleteFilaEspera = async (id: string): Promise<void> => {
  await api.delete(`/fila-de-espera/${id}`);
};

export const toggleFilaEsperaStatus = async (id: string, ativo: boolean): Promise<FilaEspera> => {
  const { data } = await api.patch(`/fila-de-espera/${id}/status`, { ativo });
  return data;
};


