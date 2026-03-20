export type AppointmentStatus =
  | 'AGENDADO'
  | 'SOLICITADO'
  | 'LIBERADO'
  | 'ATENDIDO'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'ARQUIVADO'
  | 'PENDENTE';

export type AppointmentType = 'presencial' | 'online';

export type ProfessionalAgendaAppointment = {
  id: string;
  pacienteId: string;
  profissionalId: string;
  tipoAtendimento: AppointmentType;
  recursoId: string;
  convenioId: string;
  servicoId: string;
  dataHoraInicio: string;
  dataHoraFim?: string;
  status: AppointmentStatus;
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

export type PaginatedAppointmentsResponse = {
  data: ProfessionalAgendaAppointment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
