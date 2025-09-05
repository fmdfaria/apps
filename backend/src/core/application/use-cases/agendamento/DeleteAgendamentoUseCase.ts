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
    console.log('🗑️ DeleteAgendamentoUseCase - Iniciado:', {
      agendamentoId: id,
      tipoEdicaoRecorrencia: tipoEdicaoRecorrencia || 'auto-detect'
    });

    // 1. Verificar se agendamento existe
    const agendamento = await this.agendamentosRepository.findById(id);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado.', 404);
    }

    console.log('📋 Agendamento encontrado:', {
      id: agendamento.id,
      dataHoraInicio: agendamento.dataHoraInicio,
      tipoAtendimento: agendamento.tipoAtendimento,
      googleEventId: agendamento.googleEventId,
      serieId: agendamento.serieId
    });

    // 2. Verificar se faz parte de uma série
    const serie = await this.seriesManager.findSerieByAgendamentoId(id);
    
    if (!serie) {
      // AGENDAMENTO INDIVIDUAL
      console.log('📄 Processando exclusão de agendamento individual');
      await this.excluirAgendamentoIndividual(agendamento);
    } else {
      // AGENDAMENTO DE SÉRIE
      console.log('📅 Processando exclusão de agendamento de série:', {
        serieId: serie.serieId,
        totalAgendamentos: serie.totalAgendamentos,
        tipoEdicaoSolicitado: tipoEdicaoRecorrencia
      });
      
      await this.excluirAgendamentoSerie(id, serie, tipoEdicaoRecorrencia);
    }

    console.log('✅ Exclusão concluída com sucesso');
  }

  /**
   * Exclui agendamento individual (não faz parte de série)
   */
  private async excluirAgendamentoIndividual(agendamento: any): Promise<void> {
    console.log('📄 Excluindo agendamento individual');

    // Se tem Google Calendar, deletar evento
    if (agendamento.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 Deletando evento do Google Calendar:', agendamento.googleEventId);
        await this.googleCalendarService.deletarEvento(agendamento.googleEventId);
      } catch (error) {
        console.error('❌ Erro ao deletar evento Google Calendar:', error);
        // Continuar com exclusão local mesmo se Google falhar
      }
    }

    // Deletar do banco de dados
    await this.agendamentosRepository.delete(agendamento.id);
    
    console.log('✅ Agendamento individual excluído com sucesso');
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
    
    console.log('📅 Processando série com tipo de exclusão:', tipoEdicao);

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

    console.log('✅ Série excluída com sucesso');
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
      console.log('👤 Usando tipo de edição especificado pelo usuário:', tipoEdicaoRecorrencia);
      return tipoEdicaoRecorrencia as 'apenas_esta' | 'esta_e_futuras' | 'toda_serie';
    }

    // Auto-detecção baseada na série
    if (serie.totalAgendamentos === 1) {
      console.log('🔍 Auto-detecção: Apenas 1 agendamento na série, usando "apenas_esta"');
      return 'apenas_esta';
    }

    // Se não especificado e é série com múltiplos agendamentos, usar padrão
    console.log('🔍 Auto-detecção: Série com múltiplos agendamentos, usando padrão "apenas_esta"');
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
    console.log('⚠️ Exclusão forçada de agendamento individual:', id);
    
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