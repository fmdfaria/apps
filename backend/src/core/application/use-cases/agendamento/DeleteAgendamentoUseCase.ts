import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository } from '../../../domain/repositories/IAgendamentosRepository';
import { GoogleCalendarService } from '../../../../infra/services/GoogleCalendarService';
import { SeriesManager } from '../../../../infra/services/SeriesManager';

@injectable()
export class DeleteAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('GoogleCalendarService')
    private googleCalendarService: GoogleCalendarService,
    @inject('SeriesManager')
    private seriesManager: SeriesManager
  ) {}

  async execute(id: string, tipoEdicaoRecorrencia?: 'apenas_esta' | 'esta_e_futuras' | 'toda_serie'): Promise<void> {

    // 1. Verificar se agendamento existe
    const agendamento = await this.agendamentosRepository.findById(id);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado.', 404);
    }

    // 2. Validar se o status permite exclusão (apenas AGENDADO pode ser excluído)
    if (agendamento.status !== 'AGENDADO') {
      throw new AppError(
        `Não é possível excluir agendamentos com status ${agendamento.status}. Apenas agendamentos com status AGENDADO podem ser excluídos.`,
        400
      );
    }

    // 3. Verificar se faz parte de uma série
    const serie = await this.seriesManager.findSerieByAgendamentoId(id);
    
    if (!serie) {
      // AGENDAMENTO INDIVIDUAL
      await this.excluirAgendamentoIndividual(agendamento);
    } else {
      // AGENDAMENTO DE SÉRIE
      
      await this.excluirAgendamentoSerie(id, serie, tipoEdicaoRecorrencia);
    }

  }

  /**
   * Exclui agendamento individual (não faz parte de série)
   */
  private async excluirAgendamentoIndividual(agendamento: any): Promise<void> {

    // Se tem Google Calendar, deletar evento
    if (agendamento.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        await this.googleCalendarService.deletarEvento(agendamento.googleEventId);
      } catch (error) {
        console.error('❌ Erro ao deletar evento Google Calendar:', error);
        // Continuar com exclusão local mesmo se Google falhar
      }
    }

    // Deletar do banco de dados
    try {
      await this.agendamentosRepository.delete(agendamento.id);
    } catch (error: any) {
      // Verificar se é erro de foreign key constraint relacionado a agendamentos_contas
      if (error.code === 'P2003' || error.message?.includes('agendamentos_contas') || error.message?.includes('Foreign key constraint')) {
        throw new AppError(
          'Não é possível excluir este agendamento pois existem contas financeiras vinculadas a ele. Remova primeiro as contas a receber ou a pagar associadas.',
          400
        );
      }
      // Relançar outros erros
      throw error;
    }

  }

  /**
   * Exclui agendamento de série usando SeriesManager
   */
  private async excluirAgendamentoSerie(
    id: string, 
    serie: any, 
    tipoEdicaoRecorrencia?: string
  ): Promise<void> {
    // Determinar tipo de exclusão
    const tipoEdicao = this.determinarTipoEdicaoExclusao(serie, tipoEdicaoRecorrencia);
    

    switch (tipoEdicao) {
      case 'apenas_esta':
        await this.seriesManager.deleteApenaEsta(id);
        break;
        
      case 'esta_e_futuras':
        await this.seriesManager.deleteEstaEFuturas(id);
        break;
        
      case 'toda_serie':
        await this.seriesManager.deleteTodaSerie(id);
        break;
        
      default:
        throw new AppError(`Tipo de exclusão inválido: ${tipoEdicao}`, 400);
    }

  }

  /**
   * Determina o tipo de edição baseado na posição na série e entrada do usuário
   */
  private determinarTipoEdicaoExclusao(
    serie: any, 
    tipoEdicaoRecorrencia?: string
  ): 'apenas_esta' | 'esta_e_futuras' | 'toda_serie' {
    // Se o usuário especificou explicitamente, usar a escolha dele
    if (tipoEdicaoRecorrencia) {
      return tipoEdicaoRecorrencia as 'apenas_esta' | 'esta_e_futuras' | 'toda_serie';
    }

    // Auto-detecção baseada na série
    if (serie.totalAgendamentos === 1) {
      return 'apenas_esta';
    }

    // Se não especificado e é série com múltiplos agendamentos, usar padrão
    return 'apenas_esta';
  }

  /**
   * Método de compatibilidade para chamadas que não especificam tipo de edição
   * (mantém compatibilidade com código existente)
   */
  async deleteById(id: string): Promise<void> {
    await this.execute(id);
  }

  /**
   * Método para exclusão forçada de agendamento individual
   * (útil para limpezas ou operações administrativas)
   */
  async forceDeleteSingle(id: string): Promise<void> {
    
    const agendamento = await this.agendamentosRepository.findById(id);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado.', 404);
    }

    await this.excluirAgendamentoIndividual(agendamento);
  }

  /**
   * Método para obter informações sobre uma série antes da exclusão
   * (útil para o frontend mostrar opções ao usuário)
   */
  async getSeriesDeleteInfo(id: string): Promise<{
    isSeries: boolean;
    totalAgendamentos?: number;
    serieId?: string;
    temGoogleCalendar?: boolean;
    posicaoNaSerie?: {
      isAnterior: boolean;
      isAtual: boolean;
      isFuturo: boolean;
      posicao: number;
    };
  }> {
    const serie = await this.seriesManager.findSerieByAgendamentoId(id);
    
    if (!serie) {
      return { isSeries: false };
    }

    const posicao = await this.seriesManager.getSeriePosition(id);

    return {
      isSeries: true,
      totalAgendamentos: serie.totalAgendamentos,
      serieId: serie.serieId,
      temGoogleCalendar: serie.temGoogleCalendar,
      posicaoNaSerie: posicao || undefined
    };
  }
}