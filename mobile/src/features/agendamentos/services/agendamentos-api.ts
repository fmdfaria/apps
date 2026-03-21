import { api } from '@/services/api/client';
import type {
  Agendamento,
  GetAgendamentosParams,
  PaginatedAgendamentosResponse,
  PrecoParticular,
  StatusAgendamento,
} from '@/features/agendamentos/types';

function mapAgendamento(agendamento: Agendamento): Agendamento {
  return {
    ...agendamento,
    pacienteNome: agendamento.pacienteNome || agendamento.paciente?.nomeCompleto || '',
    profissionalNome: agendamento.profissionalNome || agendamento.profissional?.nome || '',
    convenioNome: agendamento.convenioNome || agendamento.convenio?.nome || '',
    servicoNome: agendamento.servicoNome || agendamento.servico?.nome || '',
    recursoNome: agendamento.recursoNome || agendamento.recurso?.nome || '',
  };
}

export async function getAgendamentos(params: GetAgendamentosParams) {
  const response = await api.get<PaginatedAgendamentosResponse>('/agendamentos', {
    params: {
      ...params,
      statusNotIn: params.statusNotIn?.join(','),
    },
  });

  return {
    ...response.data,
    data: response.data.data.map(mapAgendamento),
  };
}

export async function setStatusAgendamento(id: string, status: StatusAgendamento) {
  const response = await api.patch(`/agendamentos/${id}/status`, { status });
  return response.data;
}

export async function alterarStatusAgendamento(id: string, status: StatusAgendamento) {
  const response = await api.put(`/agendamentos-alterar-status/${id}`, { status });
  return response.data;
}

export async function getMeuProfissional() {
  const response = await api.get<{ id: string; nome: string }>('/profissionais/me');
  return response.data;
}

type UpdateAgendamentoPayload = {
  compareceu?: boolean | null;
  assinaturaPaciente?: boolean | null;
  assinaturaProfissional?: boolean | null;
  motivoReprovacao?: string | null;
  status?: StatusAgendamento;
};

export async function updateAgendamento(id: string, payload: UpdateAgendamentoPayload) {
  const response = await api.put<Agendamento>(`/agendamentos/${id}`, payload);
  return mapAgendamento(response.data);
}

export async function getAgendamentoById(id: string) {
  const response = await api.get<Agendamento>(`/agendamentos/${id}`);
  return mapAgendamento(response.data);
}

export async function updateCompareceu(id: string, compareceu: boolean | null) {
  return updateAgendamento(id, { compareceu });
}

export async function updateAssinaturaPaciente(id: string, assinaturaPaciente: boolean | null) {
  return updateAgendamento(id, { assinaturaPaciente });
}

export async function updateAssinaturaProfissional(id: string, assinaturaProfissional: boolean | null) {
  return updateAgendamento(id, { assinaturaProfissional });
}

export async function updateMotivoReprovacao(id: string, motivoReprovacao: string | null) {
  return updateAgendamento(id, { motivoReprovacao });
}

export async function concluirAgendamento(
  id: string,
  payload: {
    dataAtendimento?: string;
    observacoes?: string;
  },
) {
  const response = await api.put<Agendamento>(`/agendamentos-concluir/${id}`, {
    dataAtendimento: payload.dataAtendimento,
    observacoes: payload.observacoes,
    status: 'FINALIZADO',
  });

  return mapAgendamento(response.data);
}

export async function liberarAgendamento(
  id: string,
  payload: {
    codLiberacao: string;
    statusCodLiberacao: string;
    dataCodLiberacao: string;
  },
) {
  const response = await api.put<Agendamento>(`/agendamentos-liberar/${id}`, {
    codLiberacao: payload.codLiberacao,
    statusCodLiberacao: payload.statusCodLiberacao,
    dataCodLiberacao: payload.dataCodLiberacao,
    status: 'LIBERADO',
  });

  return mapAgendamento(response.data);
}

export async function liberarAgendamentoParticular(
  id: string,
  payload: {
    recebimento: boolean;
    dataLiberacao: string;
    pagamentoAntecipado?: boolean;
  },
) {
  const response = await api.put<Agendamento>(`/agendamentos-liberar-particular/${id}`, {
    recebimento: payload.recebimento,
    dataLiberacao: payload.dataLiberacao,
    pagamentoAntecipado: payload.pagamentoAntecipado,
    status: 'LIBERADO',
  });

  return mapAgendamento(response.data);
}

export async function getPrecosParticulares() {
  const response = await api.get<PrecoParticular[]>('/precos-particulares');
  return response.data;
}

type ConfigByEntityParams = {
  entidadeTipo: string;
  entidadeId?: string;
  contexto?: string;
};

export async function getConfiguracoesByEntity(params: ConfigByEntityParams) {
  const response = await api.get<Record<string, unknown>>('/configuracoes/entity', { params });
  return response.data;
}

type EvolucaoStatusItem = {
  agendamentoId: string;
  temEvolucao: boolean;
};

export async function getStatusEvolucoesPorAgendamentos(agendamentoIds: string[]) {
  if (!agendamentoIds.length) return [] as EvolucaoStatusItem[];

  const response = await api.post<EvolucaoStatusItem[]>('/evolucoes/status-por-agendamentos', { agendamentoIds });
  return response.data;
}

