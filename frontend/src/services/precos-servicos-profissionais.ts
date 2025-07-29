import api from './api';
import type { PrecoServicoProfissional } from '@/types/PrecoServicoProfissional';

export const getPrecosServicoProfissional = async (): Promise<PrecoServicoProfissional[]> => {
  const { data } = await api.get('/precos-servicos-profissionais');
  return data;
};

export const createPrecoServicoProfissional = async (preco: Omit<PrecoServicoProfissional, 'id'>): Promise<PrecoServicoProfissional> => {
  const { data } = await api.post('/precos-servicos-profissionais', preco);
  return data;
};

export const updatePrecoServicoProfissional = async (id: string, preco: Omit<PrecoServicoProfissional, 'id'>): Promise<PrecoServicoProfissional> => {
  const { data } = await api.put(`/precos-servicos-profissionais/${id}`, preco);
  return data;
};

export const deletePrecoServicoProfissional = async (id: string): Promise<void> => {
  await api.delete(`/precos-servicos-profissionais/${id}`);
}; 