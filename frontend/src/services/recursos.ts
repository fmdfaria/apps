import api from './api';
import type { Recurso } from '@/types/Recurso';

export const getRecursos = async (): Promise<Recurso[]> => {
  const { data } = await api.get('/recursos');
  return data;
};

export const createRecurso = async (recurso: Omit<Recurso, 'id'>): Promise<Recurso> => {
  const { data } = await api.post('/recursos', recurso);
  return data;
};

export const updateRecurso = async (id: string, recurso: Omit<Recurso, 'id'>): Promise<Recurso> => {
  const { data } = await api.put(`/recursos/${id}`, recurso);
  return data;
};

export const deleteRecurso = async (id: string): Promise<void> => {
  await api.delete(`/recursos/${id}`);
}; 