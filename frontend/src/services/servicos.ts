import api from './api';
import type { Servico } from '@/types/Servico';

export const getServicos = async (): Promise<Servico[]> => {
  const { data } = await api.get('/servicos');
  return data;
};

export const getServicosAtivos = async (params?: { convenioId?: string }): Promise<Servico[]> => {
  const qs = new URLSearchParams();
  qs.append('ativo', 'true');
  if (params?.convenioId) qs.append('convenio', params.convenioId);
  const { data } = await api.get(`/servicos?${qs.toString()}`);
  return data;
};

export const createServico = async (servico: Omit<Servico, 'id'>): Promise<Servico> => {
  const { data } = await api.post('/servicos', servico);
  return data;
};

export const updateServico = async (id: string, servico: Omit<Servico, 'id'>): Promise<Servico> => {
  const { data } = await api.put(`/servicos/${id}`, servico);
  return data;
};

export const deleteServico = async (id: string): Promise<void> => {
  await api.delete(`/servicos/${id}`);
};

export const toggleServicoStatus = async (id: string, ativo: boolean): Promise<Servico> => {
  const { data } = await api.patch(`/servicos/${id}/status`, { ativo });
  return data;
}; 