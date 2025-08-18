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
  recorrencia?: IRecorrenciaAgendamento;
}

export interface IUpdateAgendamentoDTO extends Partial<ICreateAgendamentoDTO> {}

export interface IAgendamentosRepository {
  create(data: ICreateAgendamentoDTO): Promise<Agendamento>;
  update(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento>;
  findById(id: string): Promise<Agendamento | null>;
  findAll(filters?: Partial<{ profissionalId: string; pacienteId: string; dataHoraInicio: Date; dataHoraFim: Date; status: string }>): Promise<Agendamento[]>;
  findByProfissionalAndDataHoraInicio(profissionalId: string, dataHoraInicio: Date): Promise<Agendamento | null>;
  findByRecursoAndDateRange(recursoId: string, dataInicio: Date, dataFim: Date): Promise<Agendamento[]>;
  delete(id: string): Promise<void>;
} 