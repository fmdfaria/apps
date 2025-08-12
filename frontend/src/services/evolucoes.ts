import api from './api';
import type { EvolucaoPaciente, CreateEvolucaoPacienteData, UpdateEvolucaoPacienteData } from '@/types/EvolucaoPaciente';

const transformApiEvolucao = (evolucao: any): EvolucaoPaciente => {
  return {
    ...evolucao,
    // Transformações de campos se necessário
    dataEvolucao: evolucao.dataEvolucao || evolucao.data_evolucao,
    objetivoSessao: evolucao.objetivoSessao || evolucao.objetivo_sessao,
    descricaoEvolucao: evolucao.descricaoEvolucao || evolucao.descricao_evolucao,
    createdAt: evolucao.createdAt || evolucao.created_at,
    updatedAt: evolucao.updatedAt || evolucao.updated_at,
    
    // Dados relacionados vindos das JOINs
    pacienteNome: evolucao.pacienteNome || evolucao.paciente?.nome,
    agendamentoData: evolucao.agendamentoData || evolucao.agendamento?.dataHoraInicio,
    agendamentoHora: evolucao.agendamentoHora || evolucao.agendamento?.dataHoraInicio,
  };
};

export const getEvolucoes = async (filtros?: {
  pacienteId?: string;
  agendamentoId?: string;
}): Promise<EvolucaoPaciente[]> => {
  try {
    const params = new URLSearchParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    const url = `/evolucoes${params.toString() ? `?${params.toString()}` : ''}`;
    const { data } = await api.get(url);
    return data.map(transformApiEvolucao);
  } catch (error) {
    console.error('Erro ao carregar evoluções da API:', error);
    throw error;
  }
};

export const getEvolucaoById = async (id: string): Promise<EvolucaoPaciente | null> => {
  try {
    const { data } = await api.get(`/evolucoes/${id}`);
    return transformApiEvolucao(data);
  } catch (error) {
    console.error('Erro ao carregar evolução da API:', error);
    throw error;
  }
};

export const createEvolucao = async (data: CreateEvolucaoPacienteData): Promise<EvolucaoPaciente> => {
  try {
    const { data: evolucao } = await api.post('/evolucoes', data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return transformApiEvolucao(evolucao);
  } catch (error) {
    console.error('Erro ao criar evolução na API:', error);
    throw error;
  }
};

export const updateEvolucao = async (id: string, data: UpdateEvolucaoPacienteData): Promise<EvolucaoPaciente> => {
  try {
    const { data: evolucao } = await api.put(`/evolucoes/${id}`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return transformApiEvolucao(evolucao);
  } catch (error) {
    console.error('Erro ao atualizar evolução na API:', error);
    throw error;
  }
};

export const getEvolucaoByAgendamento = async (agendamentoId: string): Promise<EvolucaoPaciente | null> => {
  try {
    const { data } = await api.get(`/evolucoes/agendamento/${agendamentoId}`);
    return transformApiEvolucao(data);
  } catch (error: any) {
    // Se retornar 404, significa que não existe evolução para este agendamento
    if (error?.response?.status === 404) {
      return null;
    }
    console.error('Erro ao buscar evolução por agendamento da API:', error);
    throw error;
  }
};

export const deleteEvolucao = async (id: string): Promise<void> => {
  try {
    await api.delete(`/evolucoes/${id}`);
  } catch (error) {
    console.error('Erro ao deletar evolução da API:', error);
    throw error;
  }
};

// Endpoint otimizado para verificar status de evoluções por agendamentos (batch)
export const getStatusEvolucoesPorAgendamentos = async (
  agendamentoIds: string[]
): Promise<Array<{ agendamentoId: string; temEvolucao: boolean }>> => {
  try {
    const { data } = await api.post('/evolucoes/status-por-agendamentos', {
      agendamentoIds
    });
    return data as Array<{ agendamentoId: string; temEvolucao: boolean }>;
  } catch (error) {
    console.error('Erro ao buscar status de evoluções por agendamentos:', error);
    throw error;
  }
};