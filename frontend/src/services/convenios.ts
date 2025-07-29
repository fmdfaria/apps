import api from './api';
import type { Convenio } from '@/types/Convenio';

export const getConvenios = async (): Promise<Convenio[]> => {
  const { data } = await api.get('/convenios');
  return data;
};

export const createConvenio = async (convenio: Omit<Convenio, 'id'>): Promise<Convenio> => {
  const { data } = await api.post('/convenios', convenio);
  return data;
};

export const updateConvenio = async (id: string, convenio: Omit<Convenio, 'id'>): Promise<Convenio> => {
  const { data } = await api.put(`/convenios/${id}`, convenio);
  return data;
};

export const deleteConvenio = async (id: string): Promise<void> => {
  await api.delete(`/convenios/${id}`);
}; 