import api from './api';

export interface AgendamentoConta {
  id: string;
  agendamentoId: string;
  contaReceberId?: string;
  contaPagarId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgendamentoContaData {
  agendamentoId: string;
  contaReceberId?: string;
  contaPagarId?: string;
}

export const createAgendamentoConta = async (data: CreateAgendamentoContaData): Promise<AgendamentoConta> => {
  const response = await api.post('/agendamentos-contas', data);
  return response.data.data;
};

export const getAgendamentosContas = async (filters?: {
  contaReceberId?: string;
  contaPagarId?: string;
}): Promise<AgendamentoConta[]> => {
  const params = new URLSearchParams();
  
  if (filters?.contaReceberId) {
    params.append('contaReceberId', filters.contaReceberId);
  }
  
  if (filters?.contaPagarId) {
    params.append('contaPagarId', filters.contaPagarId);
  }
  
  const queryString = params.toString();
  const url = queryString ? `/agendamentos-contas?${queryString}` : '/agendamentos-contas';
  
  const response = await api.get(url);
  return response.data.data;
};

export const getAgendamentoContaByAgendamento = async (agendamentoId: string): Promise<AgendamentoConta | null> => {
  try {
    const response = await api.get(`/agendamentos-contas/agendamento/${agendamentoId}`);
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getAgendamentosContasByContaReceber = async (contaReceberId: string): Promise<AgendamentoConta[]> => {
  const response = await api.get(`/agendamentos-contas/conta-receber/${contaReceberId}`);
  return response.data.data;
};

export const getAgendamentosContasByContaPagar = async (contaPagarId: string): Promise<AgendamentoConta[]> => {
  const response = await api.get(`/agendamentos-contas/conta-pagar/${contaPagarId}`);
  return response.data.data;
};

export const deleteAgendamentoConta = async (id: string): Promise<void> => {
  await api.delete(`/agendamentos-contas/${id}`);
};