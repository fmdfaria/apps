import { inject, injectable } from 'tsyringe';
import { ISeriesRepository } from '../../core/domain/repositories/ISeriesRepository';
import { IAgendamentosRepository } from '../../core/domain/repositories/IAgendamentosRepository';
import { SerieInfo, SeriePosition, SerieUpdateOptions } from '../../core/domain/entities/SerieInfo';
import { Agendamento } from '../../core/domain/entities/Agendamento';
import { GoogleCalendarService } from './GoogleCalendarService';
import { AppError } from '../../shared/errors/AppError';

@injectable()
export class SeriesManager {
  constructor(
    @inject('SeriesRepository')
    private seriesRepository: ISeriesRepository,
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('GoogleCalendarService')
    private googleCalendarService: GoogleCalendarService
  ) {}

  /**
   * Busca informações completas de uma série por agendamento
   */
  async findSerieByAgendamentoId(agendamentoId: string): Promise<SerieInfo | null> {
    console.log('🔍 SeriesManager - Buscando série para agendamento:', agendamentoId);

    const serieId = await this.seriesRepository.findSerieIdByAgendamentoId(agendamentoId);
    
    if (!serieId) {
      console.log('ℹ️ SeriesManager - Agendamento não faz parte de uma série');
      return null;
    }

    const agendamentos = await this.seriesRepository.findAgendamentosBySerieId(serieId);
    
    if (agendamentos.length <= 1) {
      console.log('ℹ️ SeriesManager - Série tem apenas 1 agendamento, tratando como individual');
      return null;
    }

    // Verificar se tem Google Calendar (qualquer agendamento da série com googleEventId)
    const temGoogleCalendar = agendamentos.some(ag => ag.googleEventId);
    const googleEventId = agendamentos.find(ag => ag.googleEventId)?.googleEventId;
    
    // Encontrar o master
    const masterAgendamento = agendamentos.find(ag => ag.serieMaster);
    
    console.log('📊 SeriesManager - Série encontrada:', {
      serieId,
      totalAgendamentos: agendamentos.length,
      temGoogleCalendar,
      temMaster: !!masterAgendamento
    });

    return {
      serieId,
      isMaster: masterAgendamento?.id === agendamentoId,
      totalAgendamentos: agendamentos.length,
      agendamentos: agendamentos.map(ag => ({
        id: ag.id,
        dataHoraInicio: ag.dataHoraInicio,
        dataHoraFim: ag.dataHoraFim,
        status: ag.status,
        isMaster: ag.serieMaster || false,
        instanciaData: ag.instanciaData || new Date(ag.dataHoraInicio)
      })),
      temGoogleCalendar,
      googleEventId
    };
  }

  /**
   * Determina a posição de um agendamento na série
   */
  async getSeriePosition(agendamentoId: string): Promise<SeriePosition | null> {
    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    
    if (!serie) return null;

    const agendamentoAtual = serie.agendamentos.find(ag => ag.id === agendamentoId);
    if (!agendamentoAtual) return null;

    const dataAtual = agendamentoAtual.instanciaData;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const agendamentosAnteriores = serie.agendamentos.filter(ag => 
      ag.instanciaData < dataAtual
    );
    
    const agendamentosFuturos = serie.agendamentos.filter(ag => 
      ag.instanciaData > dataAtual
    );

    const posicao = agendamentosAnteriores.length + 1;

    return {
      isAnterior: dataAtual < hoje,
      isAtual: dataAtual.getTime() === hoje.getTime(),
      isFuturo: dataAtual > hoje,
      posicao,
      totalNaSerie: serie.totalAgendamentos
    };
  }

  /**
   * Atualiza apenas esta ocorrência
   */
  async updateApenaEsta(agendamentoId: string, dados: any): Promise<Agendamento> {
    console.log('📝 SeriesManager - Atualizando apenas esta ocorrência:', agendamentoId);

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    
    // Se tem Google Calendar e faz parte de série
    if (serie?.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 SeriesManager - Atualizando instância específica no Google Calendar');
        
        const novoEventId = await this.googleCalendarService.editarOcorrenciaEspecifica(
          serie.googleEventId,
          agendamento.dataHoraInicio,
          {
            dataHoraInicio: dados.dataHoraInicio || agendamento.dataHoraInicio,
            dataHoraFim: dados.dataHoraFim || agendamento.dataHoraFim,
            // Outros dados necessários para Google Calendar...
            pacienteNome: agendamento.paciente?.nomeCompleto || '',
            profissionalNome: agendamento.profissional?.nome || '',
            servicoNome: agendamento.servico?.nome || '',
            convenioNome: agendamento.convenio?.nome || '',
            agendamentoId: agendamento.id,
            profissionalEmail: agendamento.profissional?.email || '',
            pacienteEmail: agendamento.paciente?.email
          }
        );

        // Atualizar com o novo eventId da instância
        dados.googleEventId = novoEventId;
      } catch (error) {
        console.error('❌ SeriesManager - Erro ao atualizar Google Calendar:', error);
        // Continuar com atualização local
      }
    }

    return await this.agendamentosRepository.update(agendamentoId, dados);
  }

  /**
   * Atualiza esta e todas as futuras ocorrências
   */
  async updateEstaEFuturas(agendamentoId: string, dados: any): Promise<void> {
    console.log('📅 SeriesManager - Atualizando esta e futuras ocorrências:', agendamentoId);

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    if (!serie) {
      // Se não é série, atualizar apenas este
      console.log('ℹ️ SeriesManager - Não é série, atualizando apenas este agendamento');
      await this.agendamentosRepository.update(agendamentoId, dados);
      return;
    }

    const agendamentoAtual = serie.agendamentos.find(ag => ag.id === agendamentoId);
    if (!agendamentoAtual) {
      throw new AppError('Agendamento não encontrado na série', 404);
    }

    // Encontrar agendamentos desta data em diante (incluindo o atual)
    const agendamentosParaAtualizar = await this.seriesRepository.findAgendamentosFromDate(
      serie.serieId,
      agendamentoAtual.instanciaData,
      true // incluir a data atual
    );

    console.log(`📊 SeriesManager - Atualizando ${agendamentosParaAtualizar.length} agendamentos (esta e futuras)`);

    // Se tem Google Calendar, fazer split da série
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 SeriesManager - Fazendo split da série no Google Calendar');
        
        // Detectar tipo de recorrência
        const tipoRecorrencia = this.detectarTipoRecorrencia(serie.agendamentos);
        
        const novoEventId = await this.googleCalendarService.editarSerieAPartirDe(
          serie.googleEventId,
          dados.dataHoraInicio || agendamento.dataHoraInicio,
          {
            dataHoraInicio: dados.dataHoraInicio || agendamento.dataHoraInicio,
            dataHoraFim: dados.dataHoraFim || agendamento.dataHoraFim,
            recorrencia: {
              tipo: tipoRecorrencia,
              repeticoes: agendamentosParaAtualizar.length
            },
            // Outros dados...
            pacienteNome: agendamento.paciente?.nomeCompleto || '',
            profissionalNome: agendamento.profissional?.nome || '',
            servicoNome: agendamento.servico?.nome || '',
            convenioNome: agendamento.convenio?.nome || '',
            agendamentoId: agendamento.id,
            profissionalEmail: agendamento.profissional?.email || '',
            pacienteEmail: agendamento.paciente?.email
          }
        );

        // Adicionar novo googleEventId aos dados que serão atualizados
        dados.googleEventId = novoEventId;
      } catch (error) {
        console.error('❌ SeriesManager - Erro ao fazer split da série Google Calendar:', error);
        // Continuar com atualização local
      }
    }

    // Calcular delta de tempo se mudou dataHoraInicio
    let deltaMilliseconds = 0;
    if (dados.dataHoraInicio) {
      deltaMilliseconds = dados.dataHoraInicio.getTime() - agendamento.dataHoraInicio.getTime();
    }

    // Atualizar todos os agendamentos desta data em diante
    const updatePromises = agendamentosParaAtualizar.map((ag, index) => {
      const dadosParaEsteAgendamento = { ...dados };

      // Se mudou horário, aplicar o delta para manter o padrão
      if (deltaMilliseconds !== 0 && ag.id !== agendamentoId) {
        dadosParaEsteAgendamento.dataHoraInicio = new Date(ag.dataHoraInicio.getTime() + deltaMilliseconds);
        dadosParaEsteAgendamento.dataHoraFim = new Date(ag.dataHoraFim.getTime() + deltaMilliseconds);
        dadosParaEsteAgendamento.instanciaData = new Date(dadosParaEsteAgendamento.dataHoraInicio);
        dadosParaEsteAgendamento.instanciaData.setHours(0, 0, 0, 0);
      }

      console.log(`📝 SeriesManager - Atualizando agendamento ${index + 1}/${agendamentosParaAtualizar.length}:`, ag.id);
      
      return this.agendamentosRepository.update(ag.id, dadosParaEsteAgendamento);
    });

    await Promise.all(updatePromises);
    console.log('✅ SeriesManager - Esta e futuras atualizações concluídas');
  }

  /**
   * Atualiza toda a série
   */
  async updateTodaSerie(agendamentoId: string, dados: any): Promise<void> {
    console.log('🎯 SeriesManager - Atualizando toda a série para agendamento:', agendamentoId);

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    if (!serie) {
      // Se não é série, atualizar apenas este
      console.log('ℹ️ SeriesManager - Não é série, atualizando apenas este agendamento');
      await this.agendamentosRepository.update(agendamentoId, dados);
      return;
    }

    console.log(`📊 SeriesManager - Atualizando todos os ${serie.totalAgendamentos} agendamentos da série`);

    // Se tem Google Calendar
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 SeriesManager - Atualizando série completa no Google Calendar');
        
        await this.googleCalendarService.editarTodaASerie(
          serie.googleEventId,
          {
            dataHoraInicio: dados.dataHoraInicio || agendamento.dataHoraInicio,
            dataHoraFim: dados.dataHoraFim || agendamento.dataHoraFim,
            // Outros dados...
            pacienteNome: agendamento.paciente?.nomeCompleto || '',
            profissionalNome: agendamento.profissional?.nome || '',
            servicoNome: agendamento.servico?.nome || '',
            convenioNome: agendamento.convenio?.nome || '',
            agendamentoId: agendamento.id,
            profissionalEmail: agendamento.profissional?.email || '',
            pacienteEmail: agendamento.paciente?.email
          }
        );
      } catch (error) {
        console.error('❌ SeriesManager - Erro ao atualizar série completa Google Calendar:', error);
        // Continuar com atualização local
      }
    }

    // Calcular delta de tempo se mudou dataHoraInicio
    let deltaMilliseconds = 0;
    if (dados.dataHoraInicio) {
      deltaMilliseconds = dados.dataHoraInicio.getTime() - agendamento.dataHoraInicio.getTime();
    }

    // Atualizar todos os agendamentos da série
    const todosAgendamentos = await this.seriesRepository.findAgendamentosBySerieId(serie.serieId);
    const updatePromises = todosAgendamentos.map((ag, index) => {
      const dadosParaEsteAgendamento = { ...dados };

      // Se mudou horário, aplicar o delta para manter o padrão
      if (deltaMilliseconds !== 0 && ag.id !== agendamentoId) {
        dadosParaEsteAgendamento.dataHoraInicio = new Date(ag.dataHoraInicio.getTime() + deltaMilliseconds);
        dadosParaEsteAgendamento.dataHoraFim = new Date(ag.dataHoraFim.getTime() + deltaMilliseconds);
        dadosParaEsteAgendamento.instanciaData = new Date(dadosParaEsteAgendamento.dataHoraInicio);
        dadosParaEsteAgendamento.instanciaData.setHours(0, 0, 0, 0);
      }

      console.log(`📝 SeriesManager - Atualizando agendamento ${index + 1}/${todosAgendamentos.length}:`, ag.id);
      
      return this.agendamentosRepository.update(ag.id, dadosParaEsteAgendamento);
    });

    await Promise.all(updatePromises);
    console.log('✅ SeriesManager - Toda a série foi atualizada');
  }

  /**
   * Exclui apenas esta ocorrência
   */
  async deleteApenaEsta(agendamentoId: string): Promise<void> {
    console.log('🗑️ SeriesManager - Excluindo apenas esta ocorrência:', agendamentoId);

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);

    // Se tem Google Calendar e faz parte de série
    if (serie?.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 SeriesManager - Excluindo instância específica no Google Calendar');
        await this.googleCalendarService.deletarOcorrenciaEspecifica(
          serie.googleEventId,
          agendamento.dataHoraInicio
        );
      } catch (error) {
        console.error('❌ SeriesManager - Erro ao excluir do Google Calendar:', error);
        // Continuar com exclusão local
      }
    }

    await this.agendamentosRepository.delete(agendamentoId);
    console.log('✅ SeriesManager - Apenas esta ocorrência foi excluída');
  }

  /**
   * Exclui esta e todas as futuras ocorrências
   */
  async deleteEstaEFuturas(agendamentoId: string): Promise<void> {
    console.log('📅 SeriesManager - Excluindo esta e futuras ocorrências:', agendamentoId);

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    if (!serie) {
      // Se não é série, excluir apenas este
      console.log('ℹ️ SeriesManager - Não é série, excluindo apenas este agendamento');
      await this.agendamentosRepository.delete(agendamentoId);
      return;
    }

    const agendamentoAtual = serie.agendamentos.find(ag => ag.id === agendamentoId);
    if (!agendamentoAtual) {
      throw new AppError('Agendamento não encontrado na série', 404);
    }

    // Encontrar agendamentos desta data em diante
    const agendamentosParaExcluir = await this.seriesRepository.findAgendamentosFromDate(
      serie.serieId,
      agendamentoAtual.instanciaData,
      true
    );

    console.log(`📊 SeriesManager - Excluindo ${agendamentosParaExcluir.length} agendamentos (esta e futuras)`);

    // Se tem Google Calendar
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 SeriesManager - Terminando série no Google Calendar a partir da data');
        await this.googleCalendarService.deletarSerieAPartirDe(
          serie.googleEventId,
          agendamentoAtual.dataHoraInicio
        );
      } catch (error) {
        console.error('❌ SeriesManager - Erro ao terminar série Google Calendar:', error);
        // Continuar com exclusão local
      }
    }

    // Excluir todos os agendamentos desta data em diante
    const idsParaExcluir = agendamentosParaExcluir.map(ag => ag.id);
    await this.seriesRepository.deleteMultipleAgendamentos(idsParaExcluir);
    
    console.log('✅ SeriesManager - Esta e futuras exclusões concluídas');
  }

  /**
   * Exclui toda a série
   */
  async deleteTodaSerie(agendamentoId: string): Promise<void> {
    console.log('🎯 SeriesManager - Excluindo toda a série para agendamento:', agendamentoId);

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    if (!serie) {
      // Se não é série, excluir apenas este
      console.log('ℹ️ SeriesManager - Não é série, excluindo apenas este agendamento');
      await this.agendamentosRepository.delete(agendamentoId);
      return;
    }

    console.log(`📊 SeriesManager - Excluindo todos os ${serie.totalAgendamentos} agendamentos da série`);

    // Se tem Google Calendar
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 SeriesManager - Excluindo série completa do Google Calendar');
        await this.googleCalendarService.deletarEvento(serie.googleEventId);
      } catch (error) {
        console.error('❌ SeriesManager - Erro ao excluir série Google Calendar:', error);
        // Continuar com exclusão local
      }
    }

    // Excluir todos os agendamentos da série
    const todosAgendamentos = await this.seriesRepository.findAgendamentosBySerieId(serie.serieId);
    const idsParaExcluir = todosAgendamentos.map(ag => ag.id);
    
    await this.seriesRepository.deleteMultipleAgendamentos(idsParaExcluir);
    console.log('✅ SeriesManager - Toda a série foi excluída');
  }

  /**
   * Detecta o tipo de recorrência baseado no intervalo entre agendamentos
   */
  private detectarTipoRecorrencia(agendamentos: any[]): 'semanal' | 'quinzenal' | 'mensal' {
    if (agendamentos.length < 2) return 'semanal';

    const sortedAgendamentos = [...agendamentos].sort((a, b) => 
      a.dataHoraInicio.getTime() - b.dataHoraInicio.getTime()
    );

    const diffDays = Math.abs(
      sortedAgendamentos[1].dataHoraInicio.getTime() - sortedAgendamentos[0].dataHoraInicio.getTime()
    ) / (1000 * 60 * 60 * 24);

    if (diffDays <= 8) return 'semanal';
    if (diffDays <= 16) return 'quinzenal';
    return 'mensal';
  }
}