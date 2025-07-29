import api from './api';
import type { Agendamento, StatusAgendamento, TipoAtendimento, RecorrenciaAgendamento } from '@/types/Agendamento';

// Função para gerar datas dos próximos dias
const getDateForDaysFromNow = (days: number, hour: number, minute: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

// Dados mock para demonstração (como fallback) - focado nos próximos dias para visualização no calendário
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
  dataAtendimento?: string;
  observacoesAtendimento?: string;
  
  // Etapa 4 - Aprovar
  dataAprovacao?: string;
  motivoCancelamento?: string;
  aprovadoPor?: string;
  
  // Status
  status?: StatusAgendamento;
}

export const getAgendamentos = async (filtros?: {
  status?: StatusAgendamento;
  profissionalId?: string;
  pacienteId?: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<Agendamento[]> => {
  try {
    // 🚨 TEMPORÁRIO: Forçando uso de dados mock até API ser configurada com JOINs
    // A API atual retorna apenas IDs, sem os nomes relacionais (pacienteNome, profissionalNome, etc.)
    // 
    // Para configurar a API real:
    // 1. No backend, modificar GET /agendamentos para fazer JOIN com:
    //    - pacientes (para pacienteNome)
    //    - profissionais (para profissionalNome) 
    //    - convenios (para convenioNome)
    //    - servicos (para servicoNome)
    //    - recursos (para recursoNome)
    // 2. Descomentar o código abaixo e remover o throw
    
    // Comentado temporariamente para forçar uso de mock:
    // const params = new URLSearchParams();
    // if (filtros) {
    //   if (filtros.status) params.append('status', filtros.status);
    //   if (filtros.profissionalId) params.append('profissionalId', filtros.profissionalId);
    //   if (filtros.pacienteId) params.append('pacienteId', filtros.pacienteId);
    //   if (filtros.dataInicio) params.append('dataHoraInicio', filtros.dataInicio);
    //   if (filtros.dataFim) params.append('dataHoraFim', filtros.dataFim);
    // }
    // const url = `/agendamentos${params.toString() ? `?${params.toString()}` : ''}`;
    // const { data } = await api.get(url);
    // return data.sort((a: Agendamento, b: Agendamento) => 
    //   new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()
    // );
    
    // Forçar uso de dados mock por enquanto
    throw new Error('Forçando uso de dados mock até API estar configurada com JOINs');
    
  } catch (error) {
    console.info('ℹ️ Usando dados mock para agendamentos - campos relacionais completos');
    
    // Fallback para dados mock em caso de erro
    let agendamentos = [...agendamentosMock];
    
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
      if (filtros.dataInicio && filtros.dataFim) {
        agendamentos = agendamentos.filter(a => {
          const dataAgendamento = new Date(a.dataHoraInicio);
          const inicio = new Date(filtros.dataInicio!);
          const fim = new Date(filtros.dataFim!);
          return dataAgendamento >= inicio && dataAgendamento <= fim;
        });
      }
    }
    
    return agendamentos.sort((a, b) => 
      new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()
    );
  }
};

export const getAgendamentoById = async (id: string): Promise<Agendamento | null> => {
  try {
    const { data } = await api.get(`/agendamentos/${id}`);
    return data;
  } catch (error) {
    console.error('Erro ao carregar agendamento da API, usando dados mock:', error);
    return agendamentosMock.find(a => a.id === id) || null;
  }
};

export const createAgendamento = async (data: CreateAgendamentoData): Promise<Agendamento> => {
  try {
    const { data: agendamento } = await api.post('/agendamentos', data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return agendamento;
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
    return agendamento;
  } catch (error) {
    console.error('Erro ao atualizar agendamento na API:', error);
    throw error;
  }
};

export const deleteAgendamento = async (id: string): Promise<void> => {
  try {
    await api.delete(`/agendamentos/${id}`);
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
  return updateAgendamento(id, {
    ...dadosLiberacao,
    status: 'LIBERADO'
  });
};

export const atenderAgendamento = async (id: string, dadosAtendimento: {
  dataAtendimento: string;
  observacoesAtendimento?: string;
}): Promise<Agendamento> => {
  return updateAgendamento(id, {
    ...dadosAtendimento,
    status: 'ATENDIDO'
  });
};

export const aprovarAgendamento = async (id: string, dadosAprovacao: {
  dataAprovacao: string;
  aprovadoPor: string;
}): Promise<Agendamento> => {
  return updateAgendamento(id, {
    ...dadosAprovacao,
    status: 'FINALIZADO'
  });
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