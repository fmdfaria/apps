import { api } from '@/services/api/client';
import type {
  Agendamento,
  AgendamentoFormData,
  CreateAgendamentoPayload,
  GetAgendamentosParams,
  PaginatedAgendamentosResponse,
  PrecoParticular,
  ServicoConvenioProfissional,
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

type ApiDataEnvelope<T> = {
  data: T;
};

function unwrapData<T>(payload: T | ApiDataEnvelope<T>) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiDataEnvelope<T>).data;
  }
  return payload as T;
}

function sortByName<T extends { nome?: string; nomeCompleto?: string }>(list: T[]) {
  return [...list].sort((a, b) =>
    (a.nomeCompleto || a.nome || '').localeCompare(b.nomeCompleto || b.nome || '', 'pt-BR', {
      sensitivity: 'base',
    }),
  );
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

async function getAgendamentosAllPages(params: GetAgendamentosParams) {
  const limit = 200;
  const firstPage = await getAgendamentos({
    ...params,
    page: 1,
    limit,
    includeArquivados: true,
  });

  const data = [...firstPage.data];
  const totalPages = firstPage.pagination.totalPages || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await getAgendamentos({
      ...params,
      page,
      limit,
      includeArquivados: true,
    });
    data.push(...next.data);
  }

  return data;
}

export async function getAgendamentoFormData(filtros?: { data?: string; profissionalId?: string }) {
  const response = await api.get<AgendamentoFormData | ApiDataEnvelope<AgendamentoFormData>>('/agendamentos/form-data', {
    params: filtros,
  });

  const payload = unwrapData(response.data);

  let agendamentos = (payload.agendamentos || []).map(mapAgendamento);

  if (filtros?.data) {
    agendamentos = await getAgendamentosAllPages({
      dataInicio: filtros.data,
      dataFim: filtros.data,
      ...(filtros.profissionalId ? { profissionalId: filtros.profissionalId } : {}),
    });
  }

  return {
    pacientes: sortByName(payload.pacientes || []),
    profissionais: sortByName(payload.profissionais || []),
    convenios: sortByName(payload.convenios || []),
    servicos: sortByName(payload.servicos || []),
    recursos: sortByName(payload.recursos || []),
    disponibilidades: payload.disponibilidades || [],
    agendamentos,
  } satisfies AgendamentoFormData;
}

export async function getServicosConveniosByProfissional(profissionalId: string) {
  const response = await api.get<ServicoConvenioProfissional>(`/profissionais/${profissionalId}/servicos-convenios`);
  return response.data;
}

export async function createAgendamento(payload: CreateAgendamentoPayload) {
  const response = await api.post<Agendamento>('/agendamentos', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return mapAgendamento(response.data);
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

type SerieInfo = {
  isSeries: boolean;
  totalAgendamentos?: number;
  posicaoNaSerie?: {
    isAnterior: boolean;
    isAtual: boolean;
    isFuturo: boolean;
    posicao: number;
  };
};

export async function getAgendamentoSeriesInfo(id: string) {
  const response = await api.get<SerieInfo>(`/agendamentos/${id}/series-info`);
  return response.data;
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

export async function updateCodLiberacao(
  id: string,
  payload: {
    codLiberacao: string | null;
    pacienteId: string;
    profissionalId: string;
    servicoId: string;
    convenioId: string;
    recursoId: string;
    tipoAtendimento: string;
    status: StatusAgendamento;
    dataHoraInicio: string;
  },
) {
  const response = await api.put<Agendamento>(`/agendamentos/${id}`, payload);
  return mapAgendamento(response.data);
}

export async function deleteAgendamento(
  id: string,
  tipoEdicaoRecorrencia?: 'apenas_esta' | 'esta_e_futuras' | 'toda_serie',
) {
  const url = tipoEdicaoRecorrencia
    ? `/agendamentos/${id}?tipoEdicaoRecorrencia=${tipoEdicaoRecorrencia}`
    : `/agendamentos/${id}`;
  await api.delete(url);
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

