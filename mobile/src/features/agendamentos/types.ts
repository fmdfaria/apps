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

