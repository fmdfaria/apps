import api from './api';
import type { ContaPagar, CreateContaPagarData, PagarContaData, ContaPagarFilters } from '@/types/ContaPagar';

export const getContasPagar = async (filters?: ContaPagarFilters): Promise<ContaPagar[]> => {
  const params = new URLSearchParams();
  
  if (filters?.empresaId) {
    params.append('empresaId', filters.empresaId);
  }
  if (filters?.contaBancariaId) {
    params.append('contaBancariaId', filters.contaBancariaId);
  }
  if (filters?.profissionalId) {
    params.append('profissionalId', filters.profissionalId);
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.tipoConta) {
    params.append('tipoConta', filters.tipoConta);
  }
  if (filters?.recorrente !== undefined) {
    params.append('recorrente', String(filters.recorrente));
  }
  if (filters?.dataVencimentoInicio) {
    params.append('dataVencimentoInicio', filters.dataVencimentoInicio);
  }
  if (filters?.dataVencimentoFim) {
    params.append('dataVencimentoFim', filters.dataVencimentoFim);
  }
  
  const queryString = params.toString();
  const url = queryString ? `/contas-pagar?${queryString}` : '/contas-pagar';
  
  const { data } = await api.get(url);
  return data.data;
};

export const getContasPagarPendentes = async (): Promise<ContaPagar[]> => {
  return getContasPagar({ status: 'PENDENTE' });
};

export const getContasPagarVencidas = async (): Promise<ContaPagar[]> => {
  const hoje = new Date().toISOString().split('T')[0];
  return getContasPagar({ 
    status: 'PENDENTE', 
    dataVencimentoFim: hoje 
  });
};

export const getContasPagarByProfissional = async (profissionalId: string): Promise<ContaPagar[]> => {
  return getContasPagar({ profissionalId });
};

export const getContasPagarRecorrentes = async (): Promise<ContaPagar[]> => {
  return getContasPagar({ recorrente: true });
};

export const getContaPagarById = async (id: string): Promise<ContaPagar> => {
  const { data } = await api.get(`/contas-pagar/${id}`);
  return data.data;
};

export const createContaPagar = async (conta: CreateContaPagarData): Promise<ContaPagar> => {
  const { data } = await api.post('/contas-pagar', conta);
  return data.data;
};

export const pagarConta = async (id: string, pagamento: PagarContaData): Promise<ContaPagar> => {
  const { data } = await api.post(`/contas-pagar/${id}/pagar`, pagamento);
  return data.data;
};

export const updateContaPagar = async (id: string, conta: Partial<CreateContaPagarData>): Promise<ContaPagar> => {
  const { data } = await api.put(`/contas-pagar/${id}`, conta);
  return data.data;
};

export const deleteContaPagar = async (id: string): Promise<void> => {
  await api.delete(`/contas-pagar/${id}`);
};

export const cancelarContaPagar = async (id: string, motivo?: string): Promise<ContaPagar> => {
  const { data } = await api.patch(`/contas-pagar/${id}/cancelar`, { motivo });
  return data.data;
};