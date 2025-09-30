import { inject, injectable } from 'tsyringe';
import { ISeriesRepository } from '../../core/domain/repositories/ISeriesRepository';
import { IAgendamentosRepository } from '../../core/domain/repositories/IAgendamentosRepository';
import { SerieInfo, SeriePosition, SerieUpdateOptions } from '../../core/domain/entities/SerieInfo';
import { Agendamento } from '../../core/domain/entities/Agendamento';
import { GoogleCalendarService } from './GoogleCalendarService';
import { AppError } from '../../shared/errors/AppError';
import { 
  gerarMensagemAgendamentoNaoEncontrado,
  gerarMensagemAgendamentoNaoEncontradoSerie
} from '../../shared/utils/MensagensAgendamento';

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
    const serieId = await this.seriesRepository.findSerieIdByAgendamentoId(agendamentoId);
    
    if (!serieId) {
      return null;
    }

    const agendamentos = await this.seriesRepository.findAgendamentosBySerieId(serieId);
    
    if (agendamentos.length <= 1) {
      return null;
    }

    // Encontrar o master
    const masterAgendamento = agendamentos.find(ag => ag.serieMaster);
    
    // O googleEventId da série deve vir SEMPRE do master, não de instâncias específicas
    // Instâncias específicas têm IDs como "original_id_20250910T103000Z" 
    // O master deve manter o ID original da série recorrente
    let googleEventId = masterAgendamento?.googleEventId;
    
    // Se o master não tem googleEventId, buscar um ID que NÃO seja de instância específica
    if (!googleEventId) {
      googleEventId = agendamentos.find(ag => 
        ag.googleEventId && !ag.googleEventId.includes('_202')
      )?.googleEventId;
    }
    
    // Se ainda não achou, pegar qualquer um (fallback)
    if (!googleEventId) {
      googleEventId = agendamentos.find(ag => ag.googleEventId)?.googleEventId;
    }
    
    const temGoogleCalendar = !!googleEventId;

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

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError(gerarMensagemAgendamentoNaoEncontrado(agendamentoId, 'para operação em série'), 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    
    // Se tem Google Calendar e faz parte de série
    if (serie?.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        
        // CRÍTICO: Para identificar a instância correta, precisamos do horário ORIGINAL da série
        // Buscar diretamente do Google Calendar para ter a referência exata
        let dataOriginalInstancia: Date;
        
        try {
          const horarioOriginalSerie = await this.googleCalendarService.buscarHorarioOriginalSerie(serie.googleEventId);
          
          if (horarioOriginalSerie) {
            // Usar a data do agendamento atual + horário original da série
            dataOriginalInstancia = new Date(agendamento.instanciaData || agendamento.dataHoraInicio);
            dataOriginalInstancia.setHours(
              horarioOriginalSerie.getHours(),
              horarioOriginalSerie.getMinutes(),
              horarioOriginalSerie.getSeconds(),
              horarioOriginalSerie.getMilliseconds()
            );
          } else {
            // Fallback: usar horário do agendamento atual
            dataOriginalInstancia = agendamento.dataHoraInicio;
          }
        } catch (error) {
          dataOriginalInstancia = agendamento.dataHoraInicio;
        }
        
        let novoEventId: string;

        // Se o agendamento tem um googleEventId DIFERENTE do da série,
        // significa que já é uma instância individual - usar atualizarEvento
        if (agendamento.googleEventId && agendamento.googleEventId !== serie.googleEventId) {
          
          await this.googleCalendarService.atualizarEvento(agendamento.googleEventId, {
            dataHoraInicio: dados.dataHoraInicio || agendamento.dataHoraInicio,
            dataHoraFim: dados.dataHoraFim || agendamento.dataHoraFim,
            pacienteNome: agendamento.paciente?.nomeCompleto || '',
            profissionalNome: agendamento.profissional?.nome || '',
            servicoNome: agendamento.servico?.nome || '',
            convenioNome: agendamento.convenio?.nome || '',
            agendamentoId: agendamento.id,
            profissionalEmail: agendamento.profissional?.email || '',
            pacienteEmail: agendamento.paciente?.email
          });
          
          novoEventId = agendamento.googleEventId; // Mantém o mesmo ID
          
          // url_meet não muda pois é o mesmo evento (já tem Meet configurado)
        } else {
          
          try {
            novoEventId = await this.googleCalendarService.editarOcorrenciaEspecifica(
              serie.googleEventId,
              dataOriginalInstancia, // Data/hora atual do agendamento (antes da edição)
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
          } catch (instanceError) {
            try {
              novoEventId = await this.googleCalendarService.criarEventoIndividualComoFallback(
                serie.googleEventId,
                dataOriginalInstancia,
                {
                  dataHoraInicio: dados.dataHoraInicio || agendamento.dataHoraInicio,
                  dataHoraFim: dados.dataHoraFim || agendamento.dataHoraFim,
                  pacienteNome: agendamento.paciente?.nomeCompleto || '',
                  profissionalNome: agendamento.profissional?.nome || '',
                  servicoNome: agendamento.servico?.nome || '',
                  convenioNome: agendamento.convenio?.nome || '',
                  agendamentoId: agendamento.id,
                  profissionalEmail: agendamento.profissional?.email || '',
                  pacienteEmail: agendamento.paciente?.email
                }
              );
            } catch (fallbackError) {
              throw fallbackError; // Re-throw para o catch externo
            }
          }
        }

        // CRÍTICO: Se o agendamento é o MASTER da série, NÃO alterar seu googleEventId
        // pois isso corromperia a referência da série inteira
        const eMasterDaSerie = serie.agendamentos.find(ag => ag.id === agendamentoId)?.isMaster;
        
        if (eMasterDaSerie) {
          // Para o master, não alteramos o googleEventId para preservar a série
          // O Google Calendar vai ter tanto o evento master quanto a instância específica
        } else {
          dados.googleEventId = novoEventId;
        }
      } catch (error) {
        // Mesmo com erro no Google Calendar, garantir que o banco seja atualizado
        // Remove googleEventId dos dados para não corromper referências
        if (dados.googleEventId) {
          delete dados.googleEventId;
        }
      }
    }

    // Se mudou a dataHoraInicio, atualizar o instanciaData também
    if (dados.dataHoraInicio) {
      dados.instanciaData = new Date(dados.dataHoraInicio);
      dados.instanciaData.setHours(0, 0, 0, 0);
    }

    return await this.agendamentosRepository.update(agendamentoId, dados);
  }

  /**
   * Atualiza esta e todas as futuras ocorrências
   */
  async updateEstaEFuturas(agendamentoId: string, dados: any): Promise<void> {

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError(gerarMensagemAgendamentoNaoEncontrado(agendamentoId, 'para operação em série'), 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    if (!serie) {
      // Se não é série, atualizar apenas este
      await this.agendamentosRepository.update(agendamentoId, dados);
      return;
    }

    const agendamentoAtual = serie.agendamentos.find(ag => ag.id === agendamentoId);
    if (!agendamentoAtual) {
      throw new AppError(gerarMensagemAgendamentoNaoEncontradoSerie(agendamentoId, serie.id, serie.agendamentos.length), 404);
    }

    // Encontrar agendamentos desta data em diante (incluindo o atual)
    const agendamentosParaAtualizar = await this.seriesRepository.findAgendamentosFromDate(
      serie.serieId,
      agendamentoAtual.instanciaData,
      true // incluir a data atual
    );

    // Se tem Google Calendar, editar instâncias específicas
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      
      // Para cada agendamento que será atualizado, criar uma instância específica no Google Calendar
      for (const ag of agendamentosParaAtualizar) {
        try {
          // Calcular o novo horário para este agendamento específico
          let novaDataHoraInicio = dados.dataHoraInicio || ag.dataHoraInicio;
          let novaDataHoraFim = dados.dataHoraFim || ag.dataHoraFim;
          
          // Se não é o agendamento sendo editado, aplicar a diferença de dias
          if (ag.id !== agendamentoId && dados.dataHoraInicio) {
            const diasDiferenca = Math.ceil((ag.instanciaData.getTime() - agendamentoAtual.instanciaData.getTime()) / (1000 * 60 * 60 * 24));
            
            novaDataHoraInicio = new Date(dados.dataHoraInicio);
            novaDataHoraInicio.setDate(novaDataHoraInicio.getDate() + diasDiferenca);
            
            novaDataHoraFim = new Date(dados.dataHoraFim || ag.dataHoraFim);
            novaDataHoraFim.setDate(novaDataHoraFim.getDate() + diasDiferenca);
          }
          
          await this.googleCalendarService.editarOcorrenciaEspecifica(
            serie.googleEventId,
            ag.dataHoraInicio, // Data original da instância
            {
              dataHoraInicio: novaDataHoraInicio,
              dataHoraFim: novaDataHoraFim,
              pacienteNome: agendamento.paciente?.nomeCompleto || '',
              profissionalNome: agendamento.profissional?.nome || '',
              servicoNome: agendamento.servico?.nome || '',
              convenioNome: agendamento.convenio?.nome || '',
              agendamentoId: ag.id,
              profissionalEmail: agendamento.profissional?.email || '',
              pacienteEmail: agendamento.paciente?.email
            }
          );
        } catch (error) {
          // Continuar com outros agendamentos
        }
      }
    }

    // Atualizar todos os agendamentos desta data em diante
    const updatePromises = agendamentosParaAtualizar.map((ag, index) => {
      const dadosParaEsteAgendamento = { ...dados };

      // Para "esta e futuras", aplicar os novos dados para todos os agendamentos
      // mantendo a mesma diferença de dias entre eles
      if (dados.dataHoraInicio && ag.id !== agendamentoId) {
        // Calcular a diferença de dias entre o agendamento atual e este agendamento
        const diasDiferenca = Math.ceil((ag.instanciaData.getTime() - agendamentoAtual.instanciaData.getTime()) / (1000 * 60 * 60 * 24));
        
        // Aplicar a diferença de dias ao novo horário
        const novaDataHoraInicio = new Date(dados.dataHoraInicio);
        novaDataHoraInicio.setDate(novaDataHoraInicio.getDate() + diasDiferenca);
        
        const novaDataHoraFim = new Date(dados.dataHoraFim || ag.dataHoraFim);
        novaDataHoraFim.setDate(novaDataHoraFim.getDate() + diasDiferenca);
        
        dadosParaEsteAgendamento.dataHoraInicio = novaDataHoraInicio;
        dadosParaEsteAgendamento.dataHoraFim = novaDataHoraFim;
        dadosParaEsteAgendamento.instanciaData = new Date(novaDataHoraInicio);
        dadosParaEsteAgendamento.instanciaData.setHours(0, 0, 0, 0);
      }

      return this.agendamentosRepository.update(ag.id, dadosParaEsteAgendamento);
    });

    await Promise.all(updatePromises);
  }

  /**
   * Atualiza toda a série
   */
  async updateTodaSerie(agendamentoId: string, dados: any): Promise<void> {

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError(gerarMensagemAgendamentoNaoEncontrado(agendamentoId, 'para operação em série'), 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    if (!serie) {
      // Se não é série, atualizar apenas este
      await this.agendamentosRepository.update(agendamentoId, dados);
      return;
    }

    // Se tem Google Calendar
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        
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
        // Continuar com atualização local
      }
    }

    // Atualizar todos os agendamentos da série
    const todosAgendamentos = await this.seriesRepository.findAgendamentosBySerieId(serie.serieId);
    const updatePromises = todosAgendamentos.map((ag, index) => {
      const dadosParaEsteAgendamento = { ...dados };

      // Para "toda a série", aplicar o mesmo horário para todos os agendamentos
      // mantendo apenas a diferença de datas
      if (dados.dataHoraInicio && ag.id !== agendamentoId) {
        // Calcular a diferença de dias entre o agendamento de referência e este agendamento
        const agendamentoReferencia = todosAgendamentos.find(a => a.id === agendamentoId);
        if (agendamentoReferencia) {
          const diasDiferenca = Math.ceil((ag.instanciaData.getTime() - agendamentoReferencia.instanciaData.getTime()) / (1000 * 60 * 60 * 24));
          
          // Aplicar a diferença de dias ao novo horário
          const novaDataHoraInicio = new Date(dados.dataHoraInicio);
          novaDataHoraInicio.setDate(novaDataHoraInicio.getDate() + diasDiferenca);
          
          const novaDataHoraFim = new Date(dados.dataHoraFim || ag.dataHoraFim);
          novaDataHoraFim.setDate(novaDataHoraFim.getDate() + diasDiferenca);
          
          dadosParaEsteAgendamento.dataHoraInicio = novaDataHoraInicio;
          dadosParaEsteAgendamento.dataHoraFim = novaDataHoraFim;
          dadosParaEsteAgendamento.instanciaData = new Date(novaDataHoraInicio);
          dadosParaEsteAgendamento.instanciaData.setHours(0, 0, 0, 0);
        }
      }

      return this.agendamentosRepository.update(ag.id, dadosParaEsteAgendamento);
    });

    await Promise.all(updatePromises);
  }

  /**
   * Exclui apenas esta ocorrência
   */
  async deleteApenaEsta(agendamentoId: string): Promise<void> {

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError(gerarMensagemAgendamentoNaoEncontrado(agendamentoId, 'para operação em série'), 404);
    }

    // Validar se o status permite exclusão
    if (agendamento.status !== 'AGENDADO') {
      throw new AppError(
        `Não é possível excluir este agendamento (Status: ${agendamento.status}). Apenas agendamentos com status AGENDADO podem ser excluídos.`,
        400
      );
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);

    // Se tem Google Calendar e faz parte de série
    if (serie?.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        
        // CRÍTICO: Usar a mesma lógica do editar - buscar horário original da série
        let dataOriginalInstancia: Date;
        
        try {
          const horarioOriginalSerie = await this.googleCalendarService.buscarHorarioOriginalSerie(serie.googleEventId);
          
          if (horarioOriginalSerie) {
            // Usar a data do agendamento atual + horário original da série
            dataOriginalInstancia = new Date(agendamento.instanciaData || agendamento.dataHoraInicio);
            dataOriginalInstancia.setHours(
              horarioOriginalSerie.getHours(),
              horarioOriginalSerie.getMinutes(),
              horarioOriginalSerie.getSeconds(),
              horarioOriginalSerie.getMilliseconds()
            );
          } else {
            // Fallback: usar horário do agendamento atual
            dataOriginalInstancia = agendamento.dataHoraInicio;
          }
        } catch (error) {
          dataOriginalInstancia = agendamento.dataHoraInicio;
        }
        
        // Se o agendamento tem googleEventId próprio (foi editado antes), deletar o evento individual
        if (agendamento.googleEventId && agendamento.googleEventId !== serie.googleEventId) {
          await this.googleCalendarService.deletarEvento(agendamento.googleEventId);
        } else {
          
          try {
            await this.googleCalendarService.deletarOcorrenciaEspecifica(
              serie.googleEventId,
              dataOriginalInstancia
            );
          } catch (instanceError) {
            // Se falhar, pode ser porque a instância já foi modificada antes
            // Neste caso, a exclusão do banco de dados será suficiente
          }
        }
      } catch (error) {
        // Continuar com exclusão local
      }
    }

    await this.agendamentosRepository.delete(agendamentoId);
  }

  /**
   * Exclui esta e todas as futuras ocorrências
   */
  async deleteEstaEFuturas(agendamentoId: string): Promise<void> {

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError(gerarMensagemAgendamentoNaoEncontrado(agendamentoId, 'para operação em série'), 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    if (!serie) {
      // Se não é série, excluir apenas este
      await this.agendamentosRepository.delete(agendamentoId);
      return;
    }

    const agendamentoAtual = serie.agendamentos.find(ag => ag.id === agendamentoId);
    if (!agendamentoAtual) {
      throw new AppError(gerarMensagemAgendamentoNaoEncontradoSerie(agendamentoId, serie.id, serie.agendamentos.length), 404);
    }

    // Encontrar agendamentos desta data em diante
    const agendamentosParaExcluir = await this.seriesRepository.findAgendamentosFromDate(
      serie.serieId,
      agendamentoAtual.instanciaData,
      true
    );

    // Validar se todos os agendamentos têm status AGENDADO
    const agendamentosNaoPermitidos = agendamentosParaExcluir.filter(ag => ag.status !== 'AGENDADO');
    if (agendamentosNaoPermitidos.length > 0) {
      const quantidade = agendamentosNaoPermitidos.length;
      const statusList = [...new Set(agendamentosNaoPermitidos.map(ag => ag.status))].join(', ');
      throw new AppError(
        `Não é possível excluir esta e futuras ocorrências. Existem ${quantidade} agendamento(s) que não estão com status AGENDADO (Status encontrados: ${statusList}). Apenas agendamentos com status AGENDADO podem ser excluídos.`,
        400
      );
    }

    // Se tem Google Calendar
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        await this.googleCalendarService.deletarSerieAPartirDe(
          serie.googleEventId,
          agendamentoAtual.dataHoraInicio
        );
      } catch (error) {
        // Continuar com exclusão local
      }
    }

    // Excluir todos os agendamentos desta data em diante
    const idsParaExcluir = agendamentosParaExcluir.map(ag => ag.id);
    await this.seriesRepository.deleteMultipleAgendamentos(idsParaExcluir);
  }

  /**
   * Exclui toda a série
   */
  async deleteTodaSerie(agendamentoId: string): Promise<void> {

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    if (!serie) {
      // Se não é série, excluir apenas este
      await this.agendamentosRepository.delete(agendamentoId);
      return;
    }

    // Se tem Google Calendar
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        await this.googleCalendarService.deletarEvento(serie.googleEventId);
      } catch (error) {
        // Continuar com exclusão local
      }
    }

    // Excluir todos os agendamentos da série
    const todosAgendamentos = await this.seriesRepository.findAgendamentosBySerieId(serie.serieId);

    // Validar se todos os agendamentos têm status AGENDADO
    const agendamentosNaoPermitidos = todosAgendamentos.filter(ag => ag.status !== 'AGENDADO');
    if (agendamentosNaoPermitidos.length > 0) {
      const quantidade = agendamentosNaoPermitidos.length;
      const statusList = [...new Set(agendamentosNaoPermitidos.map(ag => ag.status))].join(', ');
      throw new AppError(
        `Não é possível excluir toda a série. Existem ${quantidade} agendamento(s) que não estão com status AGENDADO (Status encontrados: ${statusList}). Apenas agendamentos com status AGENDADO podem ser excluídos.`,
        400
      );
    }

    const idsParaExcluir = todosAgendamentos.map(ag => ag.id);

    await this.seriesRepository.deleteMultipleAgendamentos(idsParaExcluir);
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