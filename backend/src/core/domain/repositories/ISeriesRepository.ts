import { Agendamento } from '../entities/Agendamento';

export interface ISeriesRepository {
  findAgendamentosBySerieId(serieId: string): Promise<Agendamento[]>;
  
  findSerieIdByAgendamentoId(agendamentoId: string): Promise<string | null>;
  
  updateMultipleAgendamentos(
    agendamentoIds: string[], 
    updateData: Partial<Agendamento>
  ): Promise<void>;
  
  deleteMultipleAgendamentos(agendamentoIds: string[]): Promise<void>;
  
  findAgendamentosFromDate(
    serieId: string, 
    fromDate: Date, 
    includeFromDate?: boolean
  ): Promise<Agendamento[]>;
}