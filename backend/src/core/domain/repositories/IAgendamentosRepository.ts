import { Agendamento } from '../entities/Agendamento';

export interface IRecorrenciaAgendamento {
  tipo: 'semanal' | 'quinzenal' | 'mensal';
  ate?: Date;
  repeticoes?: number;
}

export interface ICreateAgendamentoDTO {
  pacienteId: string;
  profissionalId: string;
  tipoAtendimento: string;
  recursoId: string;
  convenioId: string;
  servicoId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  codLiberacao?: string | null;
  statusCodLiberacao?: string | null;
  dataCodLiberacao?: Date | null;
  status?: string;
  recebimento?: boolean;
  pagamento?: boolean;
  urlMeet?: string | null;
  googleEventId?: string | null;
  recorrencia?: IRecorrenciaAgendamento;
}

export interface IUpdateAgendamentoDTO extends Partial<ICreateAgendamentoDTO> {
  avaliadoPorId?: string | null;
  motivoReprovacao?: string | null;
}

export interface IAgendamentoFilters {
  // Paginação
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  
  // Filtros
  status?: string;
  profissionalId?: string;
  pacienteId?: string;
  recursoId?: string;
  convenioId?: string;
  servicoId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  tipoAtendimento?: string;
  
  // Busca textual
  search?: string;
  pacienteNome?: string;
  profissionalNome?: string;
  servicoNome?: string;
  convenioNome?: string;
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IAgendamentosRepository {
  create(data: ICreateAgendamentoDTO): Promise<Agendamento>;
  update(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento>;
  findById(id: string): Promise<Agendamento | null>;
  findAll(filters?: IAgendamentoFilters): Promise<IPaginatedResponse<Agendamento>>;
  findByProfissionalAndDataHoraInicio(profissionalId: string, dataHoraInicio: Date): Promise<Agendamento | null>;
  findByRecursoAndDataHoraInicio(recursoId: string, dataHoraInicio: Date): Promise<Agendamento | null>;
  findByPacienteAndDataHoraInicio(pacienteId: string, dataHoraInicio: Date): Promise<Agendamento | null>;
  findByRecursoAndDateRange(recursoId: string, dataInicio: Date, dataFim: Date): Promise<Agendamento[]>;
  delete(id: string): Promise<void>;
} 