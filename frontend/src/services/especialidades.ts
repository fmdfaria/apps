import api from './api';
import type { Especialidade } from '@/types/Especialidade';

export const getEspecialidades = async (): Promise<Especialidade[]> => {
  const { data } = await api.get('/especialidades');
  return data;
};

export const createEspecialidade = async (especialidade: Omit<Especialidade, 'id'>): Promise<Especialidade> => {
  const { data } = await api.post('/especialidades', especialidade);
  return data;
};

export const updateEspecialidade = async (id: string, especialidade: Omit<Especialidade, 'id'>): Promise<Especialidade> => {
  const response = await api.put(`/especialidades/${id}`, especialidade);
  return response.data;
};

export const deleteEspecialidade = async (id: string): Promise<void> => {
  await api.delete(`/especialidades/${id}`);
}; 