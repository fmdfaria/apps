import api from './api';
import type { ContaReceber, CreateContaReceberData, UpdateContaReceberData, ReceberContaData, CancelarContaData, ContaReceberFilters } from '@/types/ContaReceber';

export const getContasReceber = async (filters?: ContaReceberFilters): Promise<ContaReceber[]> => {
  const params = new URLSearchParams();
  
  if (filters?.empresaId) {
    params.append('empresaId', filters.empresaId);
  }
  if (filters?.contaBancariaId) {
    params.append('contaBancariaId', filters.contaBancariaId);
  }
  if (filters?.pacienteId) {
    params.append('pacienteId', filters.pacienteId);
  }
  if (filters?.convenioId) {
    params.append('convenioId', filters.convenioId);
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.dataVencimentoInicio) {
    params.append('dataVencimentoInicio', filters.dataVencimentoInicio);
  }
  if (filters?.dataVencimentoFim) {
    params.append('dataVencimentoFim', filters.dataVencimentoFim);
  }
  
  const queryString = params.toString();
  const url = queryString ? `/contas-receber?${queryString}` : '/contas-receber';
  
  const { data } = await api.get(url);
  return data.data;
};

export const getContasReceberPendentes = async (empresaId?: string): Promise<ContaReceber[]> => {
  const { data } = await api.get(`/contas-receber/pendentes${empresaId ? `?empresaId=${empresaId}` : ''}`);
  return data.data;
};

export const getContasReceberVencidas = async (): Promise<ContaReceber[]> => {
  const { data } = await api.get('/contas-receber/vencidas');
  return data.data;
};

export const getContasReceberByPaciente = async (pacienteId: string): Promise<ContaReceber[]> => {
  return getContasReceber({ pacienteId });
};

export const getContasReceberByConvenio = async (convenioId: string): Promise<ContaReceber[]> => {
  return getContasReceber({ convenioId });
};

export const getContaReceberById = async (id: string): Promise<ContaReceber> => {
  const { data } = await api.get(`/contas-receber/${id}`);
  return data.data;
};

export const createContaReceber = async (conta: CreateContaReceberData): Promise<ContaReceber> => {
  const { data } = await api.post('/contas-receber', conta);
  return data.data;
};

export const receberConta = async (id: string, recebimento: ReceberContaData): Promise<ContaReceber> => {
  const { data } = await api.post(`/contas-receber/${id}/receber`, recebimento);
  return data.data;
};

export const updateContaReceber = async (id: string, conta: UpdateContaReceberData): Promise<ContaReceber> => {
  const { data } = await api.put(`/contas-receber/${id}`, conta);
  return data.data;
};

export const deleteContaReceber = async (id: string): Promise<void> => {
  await api.delete(`/contas-receber/${id}`);
};

export const cancelarContaReceber = async (id: string, dados: CancelarContaData): Promise<void> => {
  await api.patch(`/contas-receber/${id}/cancelar`, dados);
};