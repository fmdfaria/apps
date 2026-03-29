export type StatusAgendamento =
  | 'AGENDADO'
  | 'SOLICITADO'
  | 'LIBERADO'
  | 'ATENDIDO'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'ARQUIVADO'
  | 'PENDENTE';

export type TipoAtendimento = 'presencial' | 'online';
export type TipoRecorrencia = 'semanal' | 'quinzenal' | 'mensal';

export type RecorrenciaAgendamento = {
  tipo: TipoRecorrencia;
  repeticoes?: number;
  ate?: string;
};

export type Agendamento = {
  id: string;
  pacienteId: string;
  profissionalId: string;
  tipoAtendimento: TipoAtendimento;
  recursoId: string;
  convenioId: string;
  servicoId: string;
  dataHoraInicio: string;
  dataHoraFim?: string;
  urlMeet?: string | null;
  dataCodLiberacao?: string | null;
  dataAtendimento?: string | null;
  observacoesAtendimento?: string | null;
  compareceu?: boolean | null;
  assinaturaPaciente?: boolean | null;
  assinaturaProfissional?: boolean | null;
  motivoReprovacao?: string | null;
  numeroSessao?: number;
  status: StatusAgendamento;
  recebimento?: boolean;
  pagamento?: boolean;
  pacienteNome?: string;
  profissionalNome?: string;
  convenioNome?: string;
  servicoNome?: string;
  recursoNome?: string;
  paciente?: {
    id: string;
    nomeCompleto?: string;
    whatsapp?: string | null;
  } | null;
  profissional?: {
    id: string;
    nome?: string;
  } | null;
  convenio?: {
    id: string;
    nome?: string;
  } | null;
  servico?: {
    id: string;
    nome?: string;
  } | null;
  recurso?: {
    id: string;
    nome?: string;
  } | null;
};

export type CreateAgendamentoPayload = {
  pacienteId: string;
  profissionalId: string;
  tipoAtendimento: TipoAtendimento;
  recursoId: string;
  convenioId: string;
  servicoId: string;
  dataHoraInicio: string;
  recorrencia?: RecorrenciaAgendamento;
  permitirConflitoPaciente?: boolean;
};

export type AgendamentoFormPaciente = {
  id: string;
  nomeCompleto: string;
  whatsapp?: string | null;
  convenioId?: string | null;
  ativo?: boolean;
};

export type AgendamentoFormProfissional = {
  id: string;
  nome: string;
  ativo?: boolean;
};

export type AgendamentoFormConvenio = {
  id: string;
  nome: string;
  ativo?: boolean;
};

export type AgendamentoFormServico = {
  id: string;
  nome: string;
  duracaoMinutos?: number;
  convenioId?: string | null;
  ativo?: boolean;
};

export type AgendamentoFormRecurso = {
  id: string;
  nome: string;
  ativo?: boolean;
};

export type DisponibilidadeProfissional = {
  id: string;
  profissionalId?: string;
  profissional_id?: string;
  recursoId?: string | null;
  recurso_id?: string | null;
  diaSemana?: number | null;
  dia_semana?: number | null;
  dataEspecifica?: string | Date | null;
  data_especifica?: string | Date | null;
  horaInicio?: string | Date;
  hora_inicio?: string | Date;
  horaFim?: string | Date;
  hora_fim?: string | Date;
  tipo?: string | null;
  recurso?: {
    id?: string;
    nome?: string;
  } | null;
};

export type AgendamentoFormData = {
  pacientes: AgendamentoFormPaciente[];
  profissionais: AgendamentoFormProfissional[];
  convenios: AgendamentoFormConvenio[];
  servicos: AgendamentoFormServico[];
  recursos: AgendamentoFormRecurso[];
  disponibilidades: DisponibilidadeProfissional[];
  agendamentos: Agendamento[];
};

export type ServicoConvenioProfissional = {
  profissionalId: string;
  servicos: Array<{
    id: string;
    nome: string;
    duracaoMinutos?: number;
    valor?: number;
    convenio: {
      id: string;
      nome: string;
    };
  }>;
  convenios: Array<{
    id: string;
    nome: string;
  }>;
};

export type AgendamentosPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedAgendamentosResponse = {
  data: Agendamento[];
  pagination: AgendamentosPagination;
};

export type GetAgendamentosParams = {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  status?: StatusAgendamento;
  profissionalId?: string;
  pacienteId?: string;
  recursoId?: string;
  convenioId?: string;
  servicoId?: string;
  dataInicio?: string;
  dataFim?: string;
  tipoAtendimento?: string;
  recebimento?: boolean;
  pagamento?: boolean;
  includeArquivados?: boolean;
  statusNotIn?: string[];
  search?: string;
};

export type PrecoParticular = {
  id: string;
  pacienteId: string;
  servicoId: string;
  preco: number;
  duracaoMinutos?: number;
  percentualClinica?: number;
  percentualProfissional?: number;
  precoPaciente?: number;
  tipoPagamento?: string | null;
  pagamentoAntecipado?: boolean | null;
  diaPagamento?: number | null;
  notaFiscal?: boolean | null;
  recibo?: boolean | null;
};

