import api from './api';
import type { Agendamento, StatusAgendamento, TipoAtendimento, RecorrenciaAgendamento } from '@/types/Agendamento';
import type { Paciente } from '@/types/Paciente';
import type { Profissional } from '@/types/Profissional';
import type { Convenio } from '@/types/Convenio';
import type { Servico } from '@/types/Servico';
import type { Recurso } from '@/types/Recurso';

export interface AgendamentoFormData {
  pacientes: Paciente[];
  profissionais: Profissional[];
  convenios: Convenio[];
  servicos: Servico[];
  recursos: Recurso[];
  disponibilidades: any[];
  agendamentos: Agendamento[];
  ocupacoesSemana: Array<{
    profissionalId: string;
    ocupados: number;
    total: number;
    percentual: number;
  }>;
}

// Função para gerar datas dos próximos dias
const getDateForDaysFromNow = (days: number, hour: number, minute: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

// Dados mock mantidos apenas como fallback em caso de erro na API
// Focado nos próximos dias para visualização no calendário
const agendamentosMock: Agendamento[] = [
  // HOJE
  {
    id: '1',
    pacienteId: 'pac1',
    profissionalId: 'prof1',
    tipoAtendimento: 'presencial',
    recursoId: 'rec1',
    convenioId: 'conv1',
    servicoId: 'serv1',
    dataHoraInicio: getDateForDaysFromNow(0, 9, 0), // Hoje 09:00
    dataHoraFim: getDateForDaysFromNow(0, 10, 0),
    status: 'AGENDADO',
    criadoEm: getDateForDaysFromNow(-2, 8, 0),
    atualizadoEm: getDateForDaysFromNow(-2, 8, 0),
    pacienteNome: 'Maria Silva Santos',
    profissionalNome: 'Dr. João Cardiologista',
    convenioNome: 'Unimed',
    servicoNome: 'Consulta Cardiológica',
    recursoNome: 'Sala 1 - Cardiologia'
  },
  {
    id: '2',
    pacienteId: 'pac2',
    profissionalId: 'prof2',
    tipoAtendimento: 'online',
    recursoId: 'rec2',
    convenioId: 'conv2',
    servicoId: 'serv2',
    dataHoraInicio: getDateForDaysFromNow(0, 14, 30), // Hoje 14:30
    dataHoraFim: getDateForDaysFromNow(0, 15, 30),
    status: 'LIBERADO',
    criadoEm: getDateForDaysFromNow(-3, 10, 0),
    atualizadoEm: getDateForDaysFromNow(-1, 9, 0),
    codLiberacao: 'LIB123456',
    statusCodLiberacao: 'APROVADO',
    dataCodLiberacao: getDateForDaysFromNow(-1, 9, 0),
    pacienteNome: 'Pedro José Oliveira',
    profissionalNome: 'Dra. Ana Neurologia',
    convenioNome: 'Bradesco Saúde',
    servicoNome: 'Consulta Neurológica',
    recursoNome: 'Telemedicina - Sala Virtual 2'
  },
  {
    id: '3',
    pacienteId: 'pac3',
    profissionalId: 'prof3',
    tipoAtendimento: 'presencial',
    recursoId: 'rec3',
    convenioId: 'conv3',
    servicoId: 'serv3',
    dataHoraInicio: getDateForDaysFromNow(0, 16, 0), // Hoje 16:00
    dataHoraFim: getDateForDaysFromNow(0, 17, 0),
    status: 'ATENDIDO',
    criadoEm: getDateForDaysFromNow(-5, 11, 0),
    atualizadoEm: getDateForDaysFromNow(0, 17, 0),
    codLiberacao: 'LIB789012',
    statusCodLiberacao: 'APROVADO',
    dataCodLiberacao: getDateForDaysFromNow(-2, 9, 0),
    dataAtendimento: getDateForDaysFromNow(0, 16, 0),
    observacoesAtendimento: 'Paciente compareceu pontualmente. Exame realizado sem intercorrências.',
    pacienteNome: 'Ana Carolina Mendes',
    profissionalNome: 'Dr. Carlos Ortopedia',
    convenioNome: 'SulAmérica',
    servicoNome: 'Consulta Ortopédica',
    recursoNome: 'Sala 3 - Ortopedia'
  },

  // AMANHÃ
  {
    id: '4',
    pacienteId: 'pac4',
    profissionalId: 'prof1',
    tipoAtendimento: 'presencial',
    recursoId: 'rec1',
    convenioId: 'conv1',
    servicoId: 'serv1',
    dataHoraInicio: getDateForDaysFromNow(1, 8, 0), // Amanhã 08:00
    dataHoraFim: getDateForDaysFromNow(1, 9, 0),
    status: 'AGENDADO',
    criadoEm: getDateForDaysFromNow(-1, 9, 0),
    atualizadoEm: getDateForDaysFromNow(-1, 9, 0),
    pacienteNome: 'Roberto Lima Costa',
    profissionalNome: 'Dr. João Cardiologista',
    convenioNome: 'Unimed',
    servicoNome: 'Consulta Cardiológica',
    recursoNome: 'Sala 1 - Cardiologia'
  },
  {
    id: '5',
    pacienteId: 'pac5',
    profissionalId: 'prof2',
    tipoAtendimento: 'online',
    recursoId: 'rec2',
    convenioId: 'conv2',
    servicoId: 'serv2',
    dataHoraInicio: getDateForDaysFromNow(1, 10, 30), // Amanhã 10:30
    dataHoraFim: getDateForDaysFromNow(1, 11, 30),
    status: 'AGENDADO',
    criadoEm: getDateForDaysFromNow(-2, 16, 0),
    atualizadoEm: getDateForDaysFromNow(-2, 16, 0),
    pacienteNome: 'Lucia Fernanda Sousa',
    profissionalNome: 'Dra. Ana Neurologia',
    convenioNome: 'Bradesco Saúde',
    servicoNome: 'Consulta Neurológica',
    recursoNome: 'Telemedicina - Sala Virtual 2'
  },
  {
    id: '6',
    pacienteId: 'pac6',
    profissionalId: 'prof3',
    tipoAtendimento: 'presencial',
    recursoId: 'rec3',
    convenioId: 'conv3',
    servicoId: 'serv3',
    dataHoraInicio: getDateForDaysFromNow(1, 15, 0), // Amanhã 15:00
    dataHoraFim: getDateForDaysFromNow(1, 16, 0),
    status: 'LIBERADO',
    criadoEm: getDateForDaysFromNow(-3, 10, 0),
    atualizadoEm: getDateForDaysFromNow(-1, 14, 0),
    codLiberacao: 'LIB567890',
    statusCodLiberacao: 'APROVADO',
    dataCodLiberacao: getDateForDaysFromNow(-1, 14, 0),
    pacienteNome: 'Carlos Eduardo Santos',
    profissionalNome: 'Dr. Carlos Ortopedia',
    convenioNome: 'SulAmérica',
    servicoNome: 'Consulta Ortopédica',
    recursoNome: 'Sala 3 - Ortopedia'
  },

  // DEPOIS DE AMANHÃ
  {
    id: '7',
    pacienteId: 'pac7',
    profissionalId: 'prof1',
    tipoAtendimento: 'presencial',
    recursoId: 'rec1',
    convenioId: 'conv1',
    servicoId: 'serv4',
    dataHoraInicio: getDateForDaysFromNow(2, 9, 30), // Depois de amanhã 09:30
    dataHoraFim: getDateForDaysFromNow(2, 10, 30),
    status: 'AGENDADO',
    criadoEm: getDateForDaysFromNow(-1, 11, 0),
    atualizadoEm: getDateForDaysFromNow(-1, 11, 0),
    pacienteNome: 'Fernanda Costa Lima',
    profissionalNome: 'Dr. João Cardiologista',
    convenioNome: 'Unimed',
    servicoNome: 'Ecocardiograma',
    recursoNome: 'Sala 1 - Cardiologia'
  },
  {
    id: '8',
    pacienteId: 'pac8',
    profissionalId: 'prof2',
    tipoAtendimento: 'online',
    recursoId: 'rec2',
    convenioId: 'conv2',
    servicoId: 'serv2',
    dataHoraInicio: getDateForDaysFromNow(2, 13, 0), // Depois de amanhã 13:00
    dataHoraFim: getDateForDaysFromNow(2, 14, 0),
    status: 'AGENDADO',
    criadoEm: getDateForDaysFromNow(-2, 9, 0),
    atualizadoEm: getDateForDaysFromNow(-2, 9, 0),
    pacienteNome: 'Ricardo Almeida Silva',
    profissionalNome: 'Dra. Ana Neurologia',
    convenioNome: 'Bradesco Saúde',
    servicoNome: 'Consulta Neurológica',
    recursoNome: 'Telemedicina - Sala Virtual 2'
  },

  // PRÓXIMOS DIAS
  {
    id: '9',
    pacienteId: 'pac9',
    profissionalId: 'prof3',
    tipoAtendimento: 'presencial',
    recursoId: 'rec3',
    convenioId: 'conv3',
    servicoId: 'serv3',
    dataHoraInicio: getDateForDaysFromNow(3, 11, 0), // +3 dias 11:00
    dataHoraFim: getDateForDaysFromNow(3, 12, 0),
    status: 'FINALIZADO',
    criadoEm: getDateForDaysFromNow(-5, 8, 0),
    atualizadoEm: getDateForDaysFromNow(3, 12, 0),
    codLiberacao: 'LIB234567',
    statusCodLiberacao: 'APROVADO',
    dataCodLiberacao: getDateForDaysFromNow(-2, 10, 0),
    dataAtendimento: getDateForDaysFromNow(3, 11, 0),
    dataAprovacao: getDateForDaysFromNow(3, 12, 0),
    aprovadoPor: 'Coordenação Médica',
    pacienteNome: 'Juliana Rodrigues Pereira',
    profissionalNome: 'Dr. Carlos Ortopedia',
    convenioNome: 'SulAmérica',
    servicoNome: 'Consulta Ortopédica',
    recursoNome: 'Sala 3 - Ortopedia'
  },
  {
    id: '10',
    pacienteId: 'pac10',
    profissionalId: 'prof1',
    tipoAtendimento: 'presencial',
    recursoId: 'rec1',
    convenioId: 'conv1',
    servicoId: 'serv1',
    dataHoraInicio: getDateForDaysFromNow(4, 14, 0), // +4 dias 14:00
    dataHoraFim: getDateForDaysFromNow(4, 15, 0),
    status: 'CANCELADO',
    criadoEm: getDateForDaysFromNow(-7, 11, 0),
    atualizadoEm: getDateForDaysFromNow(-1, 9, 0),
    codLiberacao: 'LIB012345',
    statusCodLiberacao: 'REPROVADO',
    dataCodLiberacao: getDateForDaysFromNow(-3, 14, 0),
    dataAprovacao: getDateForDaysFromNow(-1, 9, 0),
    motivoCancelamento: 'Paciente não compareceu ao atendimento',
    aprovadoPor: 'Recepção',
    pacienteNome: 'Gabriel Santos Oliveira',
    profissionalNome: 'Dr. João Cardiologista',
    convenioNome: 'Unimed',
    servicoNome: 'Consulta Cardiológica',
    recursoNome: 'Sala 1 - Cardiologia'
  }
];

export interface CreateAgendamentoData {
  pacienteId: string;
  profissionalId: string;
  tipoAtendimento: TipoAtendimento;
  recursoId: string;
  convenioId: string;
  servicoId: string;
  dataHoraInicio: string;
  recorrencia?: RecorrenciaAgendamento;
}

export interface UpdateAgendamentoData {
  // Etapa 2 - Liberar
  codLiberacao?: string;
  statusCodLiberacao?: string;
  dataCodLiberacao?: string;
  
  // Etapa 3 - Atender
  dataAtendimento?: string; // Data real do atendimento
  observacoesAtendimento?: string;
  compareceu?: boolean | null;
  assinaturaPaciente?: boolean | null;
  assinaturaProfissional?: boolean | null;
  
  // Etapa 4 - Aprovar
  dataAprovacao?: string;
  motivoCancelamento?: string;
  aprovadoPor?: string;
  // Novos campos
  avaliadoPorId?: string;
  motivoReprovacao?: string;
  
  // Gestão de pagamentos
  recebimento?: boolean;
  pagamento?: boolean;
  
  // Status
  status?: StatusAgendamento;
}

export interface EditAgendamentoData {
  // Dados básicos editáveis
  pacienteId?: string;
  profissionalId?: string;
  tipoAtendimento?: TipoAtendimento;
  recursoId?: string;
  convenioId?: string;
  servicoId?: string;
  dataHoraInicio?: string;
  recorrencia?: RecorrenciaAgendamento;
}

const transformApiAgendamento = (agendamento: any): Agendamento => {
  return {
    ...agendamento,
    // Extrair nomes dos objetos relacionais para compatibilidade
    pacienteNome: agendamento.paciente?.nomeCompleto || '',
    pacienteWhatsapp: agendamento.paciente?.whatsapp || '',
    profissionalNome: agendamento.profissional?.nome || '',
    convenioNome: agendamento.convenio?.nome || '',
    servicoNome: agendamento.servico?.nome || '',
    recursoNome: agendamento.recurso?.nome || '',
    // Campos adicionais para liberação
    profissionalConselhoSigla: agendamento.profissional?.conselho?.sigla || undefined,
    profissionalNumeroConselho: agendamento.profissional?.numeroConselho || agendamento.profissional?.numero_conselho || undefined,
    servicoProcedimentoPrimeiro: agendamento.servico?.procedimentoPrimeiroAtendimento || agendamento.servico?.procedimento_primeiro_atendimento || undefined,
    servicoProcedimentoDemais: agendamento.servico?.procedimentoDemaisAtendimentos || agendamento.servico?.procedimento_demais_atendimentos || undefined,
    // Garantir que os dados de liberação sejam preservados
    codLiberacao: agendamento.codLiberacao || undefined,
    statusCodLiberacao: agendamento.statusCodLiberacao || undefined,
    dataCodLiberacao: agendamento.dataCodLiberacao || undefined,
  };
};

export interface IPaginatedAgendamentos {
  data: Agendamento[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IAgendamentoFilters {
  // Paginação
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  
  // Filtros
  status?: StatusAgendamento;
  profissionalId?: string;
  pacienteId?: string;
  recursoId?: string;
  convenioId?: string;
  convenioIdExcluir?: string;
  servicoId?: string;
  dataInicio?: string;
  dataFim?: string;
  tipoAtendimento?: string;
  primeiraSessao?: string;

  // Busca textual
  search?: string;
  pacienteNome?: string;
  profissionalNome?: string;
  servicoNome?: string;
  convenioNome?: string;
}

export const getAgendamentos = async (filtros?: IAgendamentoFilters): Promise<IPaginatedAgendamentos> => {
  try {
    const params = new URLSearchParams();
    if (filtros) {
      // Paginação
      if (filtros.page) params.append('page', filtros.page.toString());
      if (filtros.limit) params.append('limit', filtros.limit.toString());
      if (filtros.orderBy) params.append('orderBy', filtros.orderBy);
      if (filtros.orderDirection) params.append('orderDirection', filtros.orderDirection);
      
      // Filtros
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.profissionalId) params.append('profissionalId', filtros.profissionalId);
      if (filtros.pacienteId) params.append('pacienteId', filtros.pacienteId);
      if (filtros.recursoId) params.append('recursoId', filtros.recursoId);
      if (filtros.convenioId) params.append('convenioId', filtros.convenioId);
      if (filtros.convenioIdExcluir) params.append('convenioIdExcluir', filtros.convenioIdExcluir);
      if (filtros.servicoId) params.append('servicoId', filtros.servicoId);
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.tipoAtendimento) params.append('tipoAtendimento', filtros.tipoAtendimento);
      if (filtros.primeiraSessao) params.append('primeiraSessao', filtros.primeiraSessao);

      // Busca textual
      if (filtros.search) params.append('search', filtros.search);
      if (filtros.pacienteNome) params.append('pacienteNome', filtros.pacienteNome);
      if (filtros.profissionalNome) params.append('profissionalNome', filtros.profissionalNome);
      if (filtros.servicoNome) params.append('servicoNome', filtros.servicoNome);
      if (filtros.convenioNome) params.append('convenioNome', filtros.convenioNome);
    }
    
    const url = `/agendamentos${params.toString() ? `?${params.toString()}` : ''}`;
    const { data } = await api.get(url);
    
    return {
      data: data.data.map(transformApiAgendamento),
      pagination: data.pagination
    };
    
  } catch (error) {
    console.warn('⚠️ Erro ao carregar agendamentos da API, usando dados mock como fallback:', error);
    
    // Fallback para dados mock em caso de erro
    let agendamentos = [...agendamentosMock];
    const page = filtros?.page || 1;
    const limit = filtros?.limit || 10;
    
    // Aplicar filtros no mock
    if (filtros) {
      if (filtros.status) {
        agendamentos = agendamentos.filter(a => a.status === filtros.status);
      }
      if (filtros.profissionalId) {
        agendamentos = agendamentos.filter(a => a.profissionalId === filtros.profissionalId);
      }
      if (filtros.pacienteId) {
        agendamentos = agendamentos.filter(a => a.pacienteId === filtros.pacienteId);
      }
      if (filtros.dataInicio || filtros.dataFim) {
        agendamentos = agendamentos.filter(a => {
          const dataAgendamento = new Date(a.dataHoraInicio);
          if (filtros.dataInicio && dataAgendamento < new Date(filtros.dataInicio)) return false;
          if (filtros.dataFim && dataAgendamento > new Date(filtros.dataFim)) return false;
          return true;
        });
      }
    }
    
    // Ordenar
    agendamentos.sort((a, b) => 
      new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()
    );
    
    // Aplicar paginação no mock
    const total = agendamentos.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = agendamentos.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }
};

export const getAgendamentoById = async (id: string): Promise<Agendamento | null> => {
  try {
    const { data } = await api.get(`/agendamentos/${id}`);
    return transformApiAgendamento(data);
  } catch (error) {
    console.warn('⚠️ Erro ao carregar agendamento da API, usando dados mock como fallback:', error);
    return agendamentosMock.find(a => a.id === id) || null;
  }
};

export const createAgendamento = async (data: CreateAgendamentoData): Promise<Agendamento> => {
  try {
    const { data: agendamento } = await api.post('/agendamentos', data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return transformApiAgendamento(agendamento);
  } catch (error) {
    console.error('Erro ao criar agendamento na API:', error);
    throw error;
  }
};

export const updateAgendamento = async (id: string, data: UpdateAgendamentoData): Promise<Agendamento> => {
  try {
    const { data: agendamento } = await api.put(`/agendamentos/${id}`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return transformApiAgendamento(agendamento);
  } catch (error) {
    console.error('Erro ao atualizar agendamento na API:', error);
    throw error;
  }
};

export const editAgendamento = async (id: string, data: EditAgendamentoData): Promise<Agendamento> => {
  try {
    const { data: agendamento } = await api.put(`/agendamentos/${id}`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return transformApiAgendamento(agendamento);
  } catch (error) {
    console.error('Erro ao editar agendamento na API:', error);
    throw error;
  }
};

export const deleteAgendamento = async (id: string, tipoEdicaoRecorrencia?: 'apenas_esta' | 'esta_e_futuras' | 'toda_serie'): Promise<void> => {
  try {
    const url = `/agendamentos/${id}`;
    
    if (tipoEdicaoRecorrencia) {
      // Enviar como query parameter
      await api.delete(`${url}?tipoEdicaoRecorrencia=${tipoEdicaoRecorrencia}`);
    } else {
      // Sem tipo de edição (comportamento padrão)
      await api.delete(url);
    }
  } catch (error) {
    console.error('Erro ao deletar agendamento na API:', error);
    throw error;
  }
};

// Funções específicas para os fluxos de agendamento

export const liberarAgendamento = async (id: string, dadosLiberacao: {
  codLiberacao: string;
  statusCodLiberacao: string;
  dataCodLiberacao: string;
}): Promise<Agendamento> => {
  // Usar a nova rota específica para liberação
  const response = await api.put(`/agendamentos-liberar/${id}`, {
    ...dadosLiberacao,
    status: 'LIBERADO'
  });
  return response.data;
};

export const liberarAgendamentoParticular = async (id: string, dadosLiberacao: {
  recebimento: boolean;
  dataLiberacao: string;
  pagamentoAntecipado?: boolean;
}): Promise<Agendamento> => {
  // Usar a nova rota específica para liberação de agendamentos particulares
  const response = await api.put(`/agendamentos-liberar-particular/${id}`, {
    ...dadosLiberacao,
    status: 'LIBERADO'
  });
  return response.data;
};

export const liberarAgendamentosParticularesMensal = async (dadosLiberacao: {
  pacienteId: string;
  profissionalId: string;
  servicoId: string;
  mesAno: string; // formato "2024-09"
  recebimento: boolean;
  dataLiberacao: string;
  pagamentoAntecipado?: boolean;
}): Promise<{
  agendamentosAtualizados: Agendamento[];
  totalLiberados: number;
}> => {
  // Usar a nova rota específica para liberação de agendamentos particulares mensais (grupo)
  const response = await api.put('/agendamentos-liberar-particular-mensal', dadosLiberacao);
  return response.data;
};

export const atenderAgendamento = async (id: string, dadosAtendimento: {
  dataAtendimento?: string;
  observacoes?: string;
  convenioId: string;
}): Promise<Agendamento> => {
  // Importar dinamicamente para evitar dependência circular
  const { verificarLiberadoParaFinalizado } = await import('./configuracoes');

  // 1️⃣ Verificar configuração ANTES de chamar API
  const deveFinalizar = await verificarLiberadoParaFinalizado(dadosAtendimento.convenioId);

  // 2️⃣ Fazer UMA ÚNICA chamada de API com o status correto
  if (deveFinalizar) {
    // Vai DIRETO para FINALIZADO (pula etapa de aprovação)
    const response = await api.put(`/agendamentos-concluir/${id}`, {
      dataAtendimento: dadosAtendimento.dataAtendimento,
      observacoes: dadosAtendimento.observacoes,
      status: 'FINALIZADO'
    });
    return response.data;
  } else {
    // Vai para ATENDIDO (fluxo normal - precisa de aprovação)
    const response = await api.put(`/agendamentos-atender/${id}`, {
      dataAtendimento: dadosAtendimento.dataAtendimento,
      observacoes: dadosAtendimento.observacoes,
      status: 'ATENDIDO'
    });
    return response.data;
  }
};

export const aprovarAgendamento = async (id: string, dadosAprovacao: {
  observacoes?: string;
  resultadoConsulta?: string;
  avaliadoPorId?: string;
}): Promise<Agendamento> => {
  // Usar a nova rota específica para conclusão
  const response = await api.put(`/agendamentos-concluir/${id}`, {
    ...dadosAprovacao,
    status: 'FINALIZADO'
  });
  return response.data;
};

export const resolverPendencia = async (id: string, dadosPendencia: {
  observacoes?: string;
  avaliadoPorId?: string;
}): Promise<Agendamento> => {
  // Usar a nova rota específica para resolver pendências
  const response = await api.put(`/agendamentos-pendencias/${id}`, {
    ...dadosPendencia,
    status: 'ATENDIDO'
  });
  return response.data;
};

export const cancelarAgendamento = async (id: string, dadosCancelamento: {
  dataAprovacao: string;
  motivoCancelamento: string;
  aprovadoPor: string;
}): Promise<Agendamento> => {
  return updateAgendamento(id, {
    ...dadosCancelamento,
    status: 'CANCELADO'
  });
};

// Nova rota dedicada para atualização de status (RBAC segregado)
export const setStatusAgendamento = async (id: string, status: StatusAgendamento): Promise<Agendamento> => {
  const response = await api.patch(`/agendamentos/${id}/status`, { status });
  return response.data;
};

export const getAgendamentoFormData = async (filtros?: {
  data?: string; // Data no formato YYYY-MM-DD
  profissionalId?: string;
}): Promise<AgendamentoFormData> => {
  try {
    // Quando houver data, usar a nova rota /agendamentos para buscar os agendamentos filtrados
    if (filtros?.data) {
      const paramsForm = new URLSearchParams();
      paramsForm.append('data', filtros.data);
      if (filtros.profissionalId) paramsForm.append('profissionalId', filtros.profissionalId);

      // Buscar dados base e ocupações pela rota form-data (para manter compatibilidade)
      const formDataPromise = api.get(`/agendamentos/form-data?${paramsForm.toString()}`);

      // Buscar agendamentos do dia pela rota paginada com filtros
      const agendamentosPromise = getAgendamentos({
        dataInicio: filtros.data,
        dataFim: filtros.data,
        ...(filtros.profissionalId ? { profissionalId: filtros.profissionalId } : {}),
      });

      const [{ data: formData }, agendamentosResult] = await Promise.all([
        formDataPromise,
        agendamentosPromise,
      ]);

      return {
        ...formData,
        agendamentos: agendamentosResult.data,
      } as AgendamentoFormData;
    }

    // Sem data: buscar somente os dados base
    const { data } = await api.get('/agendamentos/form-data');
    return data as AgendamentoFormData;
  } catch (error) {
    console.error('Erro ao carregar dados do formulário da API:', error);
    throw error;
  }
};

// Funções específicas para os novos campos
export const updateCompareceu = async (id: string, compareceu: boolean | null): Promise<Agendamento> => {
  return updateAgendamento(id, { compareceu });
};

export const updateAssinaturaPaciente = async (id: string, assinaturaPaciente: boolean | null): Promise<Agendamento> => {
  return updateAgendamento(id, { assinaturaPaciente });
};

export const updateAssinaturaProfissional = async (id: string, assinaturaProfissional: boolean | null): Promise<Agendamento> => {
  return updateAgendamento(id, { assinaturaProfissional });
};

export const updateRecebimento = async (id: string, recebimento: boolean): Promise<Agendamento> => {
  return updateAgendamento(id, { recebimento });
};

export const updatePagamento = async (id: string, pagamento: boolean): Promise<Agendamento> => {
  return updateAgendamento(id, { pagamento });
};

// Interfaces para fechamento financeiro
export interface FechamentoConvenio {
  convenio: string;
  dataInicio: string;
  dataFim: string;
  qtdAgendamentos: number;
  valorReceber: number;
}

export interface FechamentoParticular {
  paciente: string;
  dataInicio: string;
  dataFim: string;
  qtdAgendamentos: number;
  valorReceber: number;
}

// Funções para fechamento financeiro
export const getFechamentosConvenios = async (filtros?: {
  dataInicio?: string;
  dataFim?: string;
  convenio?: string;
}): Promise<FechamentoConvenio[]> => {
  try {
    // Buscar agendamentos finalizados (limitado pela API)
    const result = await getAgendamentos({ status: 'FINALIZADO' });
    const agendamentos = result.data;
    
    // Filtrar por parâmetros adicionais se fornecidos
    let agendamentosFiltrados = agendamentos;
    
    if (filtros) {
      if (filtros.dataInicio || filtros.dataFim) {
        agendamentosFiltrados = agendamentos.filter(a => {
          const dataAgendamento = a.dataHoraInicio.split('T')[0];
          if (filtros.dataInicio && dataAgendamento < filtros.dataInicio) return false;
          if (filtros.dataFim && dataAgendamento > filtros.dataFim) return false;
          return true;
        });
      }
      
      if (filtros.convenio) {
        agendamentosFiltrados = agendamentosFiltrados.filter(a => 
          a.convenioNome?.toLowerCase().includes(filtros.convenio!.toLowerCase())
        );
      }
    }
    
    // Agrupar por convênio
    const conveniosMap = new Map<string, {
      agendamentos: Agendamento[],
      valorTotal: number
    }>();

    agendamentosFiltrados.forEach(agendamento => {
      const convenio = agendamento.convenioNome || 'Não informado';
      
      if (!conveniosMap.has(convenio)) {
        conveniosMap.set(convenio, {
          agendamentos: [],
          valorTotal: 0
        });
      }

      const dados = conveniosMap.get(convenio)!;
      dados.agendamentos.push(agendamento);
      // Valor padrão - em produção, buscar da tabela servicos
      dados.valorTotal += 100.00;
    });

    // Converter para array e calcular datas
    return Array.from(conveniosMap.entries()).map(([convenio, dados]) => {
      const datas = dados.agendamentos.map(a => a.dataHoraInicio.split('T')[0]);
      const dataInicio = Math.min(...datas.map(d => new Date(d).getTime()));
      const dataFim = Math.max(...datas.map(d => new Date(d).getTime()));

      return {
        convenio,
        dataInicio: new Date(dataInicio).toISOString().split('T')[0],
        dataFim: new Date(dataFim).toISOString().split('T')[0],
        qtdAgendamentos: dados.agendamentos.length,
        valorReceber: dados.valorTotal
      };
    }).sort((a, b) => a.convenio.localeCompare(b.convenio));
    
  } catch (error) {
    console.error('Erro ao buscar fechamentos de convênios:', error);
    throw error;
  }
};

// Funções convenience para facilitar uso comum
export const getAgendamentosPendentes = async (page = 1, limit = 10): Promise<IPaginatedAgendamentos> => {
  return getAgendamentos({ status: 'PENDENTE', page, limit });
};

export const getAgendamentosAgendados = async (page = 1, limit = 10): Promise<IPaginatedAgendamentos> => {
  return getAgendamentos({ status: 'AGENDADO', page, limit });
};

export const getAgendamentosLiberados = async (page = 1, limit = 10): Promise<IPaginatedAgendamentos> => {
  return getAgendamentos({ status: 'LIBERADO', page, limit });
};

export const getAgendamentosAtendidos = async (page = 1, limit = 10): Promise<IPaginatedAgendamentos> => {
  return getAgendamentos({ status: 'ATENDIDO', page, limit });
};

export const getAgendamentosFinalizados = async (page = 1, limit = 10): Promise<IPaginatedAgendamentos> => {
  return getAgendamentos({ status: 'FINALIZADO', page, limit });
};

export const getAgendamentosByProfissional = async (profissionalId: string, page = 1, limit = 10): Promise<IPaginatedAgendamentos> => {
  return getAgendamentos({ profissionalId, page, limit });
};

export const getAgendamentosByPaciente = async (pacienteId: string, page = 1, limit = 10): Promise<IPaginatedAgendamentos> => {
  return getAgendamentos({ pacienteId, page, limit });
};

export const getFechamentosParticulares = async (filtros?: {
  dataInicio?: string;
  dataFim?: string;
  paciente?: string;
}): Promise<FechamentoParticular[]> => {
  try {
    // Buscar agendamentos finalizados (limitado pela API)
    const result = await getAgendamentos({ status: 'FINALIZADO' });
    const agendamentos = result.data;
    
    // Filtrar apenas particulares
    let agendamentosParticulares = agendamentos.filter(a => 
      a.convenioNome?.toLowerCase().includes('particular') || 
      a.convenioNome?.toLowerCase().includes('privado') ||
      a.convenioNome === 'Particular'
    );
    
    // Aplicar filtros adicionais se fornecidos
    if (filtros) {
      if (filtros.dataInicio || filtros.dataFim) {
        agendamentosParticulares = agendamentosParticulares.filter(a => {
          const dataAgendamento = a.dataHoraInicio.split('T')[0];
          if (filtros.dataInicio && dataAgendamento < filtros.dataInicio) return false;
          if (filtros.dataFim && dataAgendamento > filtros.dataFim) return false;
          return true;
        });
      }
      
      if (filtros.paciente) {
        agendamentosParticulares = agendamentosParticulares.filter(a => 
          a.pacienteNome?.toLowerCase().includes(filtros.paciente!.toLowerCase())
        );
      }
    }
    
    // Agrupar por paciente
    const pacientesMap = new Map<string, {
      agendamentos: Agendamento[],
      valorTotal: number
    }>();

    agendamentosParticulares.forEach(agendamento => {
      const paciente = agendamento.pacienteNome || 'Não informado';
      
      if (!pacientesMap.has(paciente)) {
        pacientesMap.set(paciente, {
          agendamentos: [],
          valorTotal: 0
        });
      }

      const dados = pacientesMap.get(paciente)!;
      dados.agendamentos.push(agendamento);
      // Valor padrão para particulares - em produção, buscar de precos_particulares
      dados.valorTotal += 150.00;
    });

    // Converter para array e calcular datas
    return Array.from(pacientesMap.entries()).map(([paciente, dados]) => {
      const datas = dados.agendamentos.map(a => a.dataHoraInicio.split('T')[0]);
      const dataInicio = Math.min(...datas.map(d => new Date(d).getTime()));
      const dataFim = Math.max(...datas.map(d => new Date(d).getTime()));

      return {
        paciente,
        dataInicio: new Date(dataInicio).toISOString().split('T')[0],
        dataFim: new Date(dataFim).toISOString().split('T')[0],
        qtdAgendamentos: dados.agendamentos.length,
        valorReceber: dados.valorTotal
      };
    }).sort((a, b) => a.paciente.localeCompare(b.paciente));
    
  } catch (error) {
    console.error('Erro ao buscar fechamentos particulares:', error);
    throw error;
  }
};

// Interface para dados do fechamento de pagamento
export interface FechamentoPagamentoData {
  agendamentoIds: string[];
  contaPagar: {
    descricao: string;
    valorOriginal: number;
    dataVencimento: string;
    dataEmissao: string;
    empresaId?: string | undefined;
    contaBancariaId?: string | undefined;
    categoriaId?: string | undefined;
    profissionalId: string;
    numeroDocumento?: string | undefined;
    tipoConta: 'DESPESA';
    recorrente?: boolean | undefined;
    observacoes?: string | undefined;
  };
}

// Interface para retorno do fechamento
export interface FechamentoPagamentoResult {
  contaPagar: any;
  agendamentosAtualizados: Agendamento[];
  agendamentosContas: any[];
}

export const efetuarFechamentoPagamento = async (data: FechamentoPagamentoData): Promise<FechamentoPagamentoResult> => {
  try {
    const response = await api.post('/agendamentos/fechamento-pagamento', data);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao efetuar fechamento de pagamento:', error);
    throw error;
  }
};

// Interface para dados do fechamento de recebimento (convênios)
export interface FechamentoRecebimentoData {
  agendamentoIds: string[];
  contaReceber: {
    descricao: string;
    valorOriginal: number;
    dataVencimento: string;
    dataEmissao: string;
    empresaId?: string | undefined;
    contaBancariaId?: string | undefined;
    categoriaId?: string | undefined;
    convenioId?: string | undefined;
    numeroDocumento?: string | undefined;
    tipoConta: 'RECEITA';
    recorrente?: boolean | undefined;
    observacoes?: string | undefined;
  };
}

// Interface para retorno do fechamento de recebimento
export interface FechamentoRecebimentoResult {
  contaReceber: any;
  agendamentosAtualizados: Agendamento[];
  agendamentosContas: any[];
}

export const efetuarFechamentoRecebimento = async (data: FechamentoRecebimentoData): Promise<FechamentoRecebimentoResult> => {
  try {
    const response = await api.post('/agendamentos/fechamento-recebimento', data);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao efetuar fechamento de recebimento:', error);
    throw error;
  }
}; 