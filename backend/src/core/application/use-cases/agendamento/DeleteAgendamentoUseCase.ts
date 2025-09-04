import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';
import { GoogleCalendarService } from '../../../../infra/services/GoogleCalendarService';

@injectable()
export class DeleteAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('GoogleCalendarService')
    private googleCalendarService: GoogleCalendarService
  ) {}

  async execute(id: string): Promise<void> {
    const agendamento = await this.agendamentosRepository.findById(id);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado.', 404);
    }

    // Deletar evento do Google Calendar se for online e tiver eventId
    if (agendamento.tipoAtendimento === 'online' && 
        agendamento.googleEventId && 
        this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        await this.googleCalendarService.deletarEvento(agendamento.googleEventId);
        console.log(`✅ Evento Google Calendar deletado: ${agendamento.googleEventId}`);
      } catch (error) {
        console.error('Erro ao deletar evento do Google Calendar:', error);
        // Continua com a exclusão do agendamento mesmo se falhar a exclusão do Google Calendar
      }
    }

    await this.agendamentosRepository.delete(id);
  }
} 