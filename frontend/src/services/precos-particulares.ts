import api from './api';
import type { PrecoParticular } from '@/types/PrecoParticular';

export const getPrecosParticulares = async (): Promise<PrecoParticular[]> => {
  const { data } = await api.get('/precos-particulares');
  return data;
};

export const createPrecoParticular = async (preco: Omit<PrecoParticular, 'id'>): Promise<PrecoParticular> => {
  const { data } = await api.post('/precos-particulares', preco);
  return data;
};

export const updatePrecoParticular = async (id: string, preco: Omit<PrecoParticular, 'id'>): Promise<PrecoParticular> => {
  const { data } = await api.put(`/precos-particulares/${id}`, preco);
  return data;
};

export const deletePrecoParticular = async (id: string): Promise<void> => {
  await api.delete(`/precos-particulares/${id}`);
}; 