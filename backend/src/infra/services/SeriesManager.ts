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
    
    console.log('📊 SeriesManager - Série encontrada:', {
      serieId,
      totalAgendamentos: agendamentos.length,
      temGoogleCalendar,
      temMaster: !!masterAgendamento,
      googleEventId: googleEventId
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
    console.log('📝 SeriesManager - Atualizando APENAS ESTA ocorrência:', {
      agendamentoId,
      dadosRecebidos: Object.keys(dados),
      temDataHoraInicio: !!dados.dataHoraInicio
    });

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);
    
    // Se tem Google Calendar e faz parte de série
    if (serie?.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 SeriesManager - Atualizando instância específica no Google Calendar');
        
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
            
            console.log('✅ SeriesManager - Usando horário original do Google Calendar:', horarioOriginalSerie.toISOString());
          } else {
            // Fallback: usar horário do agendamento atual
            dataOriginalInstancia = agendamento.dataHoraInicio;
            console.log('⚠️ SeriesManager - Fallback: usando horário atual do agendamento');
          }
        } catch (error) {
          console.error('❌ SeriesManager - Erro ao buscar horário original, usando fallback:', error);
          dataOriginalInstancia = agendamento.dataHoraInicio;
        }
        
        console.log('🔍 SeriesManager - Editando instância Google Calendar:', {
          agendamentoId: agendamento.id,
          dataOriginalInstancia: dataOriginalInstancia.toISOString(),
          novaData: dados.dataHoraInicio?.toISOString()
        });
        
        let novoEventId: string;
        
        console.log('🔍 SeriesManager - Verificando tipo de evento:', {
          agendamentoGoogleEventId: agendamento.googleEventId,
          serieGoogleEventId: serie.googleEventId,
          saoIguais: agendamento.googleEventId === serie.googleEventId
        });

        // Se o agendamento tem um googleEventId DIFERENTE do da série,
        // significa que já é uma instância individual - usar atualizarEvento
        if (agendamento.googleEventId && agendamento.googleEventId !== serie.googleEventId) {
          console.log('🔄 SeriesManager - Agendamento já tem instância própria, usando atualizarEvento');
          
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
          console.log('🆕 SeriesManager - Criando nova instância específica da série');
          
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
            console.error('❌ SeriesManager - Erro ao editar instância específica:', instanceError);
            console.log('🔄 SeriesManager - Tentando estratégia alternativa: evento individual');
            
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
              
              console.log('✅ SeriesManager - Fallback bem-sucedido, evento individual criado');
            } catch (fallbackError) {
              console.error('❌ SeriesManager - Fallback também falhou:', fallbackError);
              throw fallbackError; // Re-throw para o catch externo
            }
          }
        }

        // CRÍTICO: Se o agendamento é o MASTER da série, NÃO alterar seu googleEventId
        // pois isso corromperia a referência da série inteira
        const eMasterDaSerie = serie.agendamentos.find(ag => ag.id === agendamentoId)?.isMaster;
        
        if (eMasterDaSerie) {
          console.log('⚠️ SeriesManager - Agendamento é MASTER da série, mantendo googleEventId original');
          // Para o master, não alteramos o googleEventId para preservar a série
          // O Google Calendar vai ter tanto o evento master quanto a instância específica
        } else {
          console.log('✅ SeriesManager - Agendamento não é master, atualizando googleEventId');
          dados.googleEventId = novoEventId;
        }
      } catch (error) {
        console.error('❌ SeriesManager - Erro ao atualizar Google Calendar:', error);
        console.log('⚠️ SeriesManager - Continuando com atualização apenas no banco de dados');
        
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
    console.log('📅 SeriesManager - Atualizando ESTA E FUTURAS ocorrências:', {
      agendamentoId,
      dadosRecebidos: Object.keys(dados),
      temDataHoraInicio: !!dados.dataHoraInicio
    });

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

    // Se tem Google Calendar, editar instâncias específicas
    if (serie.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      console.log('🌐 SeriesManager - Editando instâncias específicas no Google Calendar para "esta e futuras"');
      
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
          
          console.log(`✅ SeriesManager - Instância do Google Calendar editada para agendamento: ${ag.id}`);
        } catch (error) {
          console.error(`❌ SeriesManager - Erro ao editar instância no Google Calendar para agendamento ${ag.id}:`, error);
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
    console.log('🎯 SeriesManager - Atualizando TODA A SÉRIE para agendamento:', {
      agendamentoId,
      dadosRecebidos: Object.keys(dados),
      temDataHoraInicio: !!dados.dataHoraInicio
    });

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
    console.log('🗑️ SeriesManager - Excluindo APENAS ESTA ocorrência:', {
      agendamentoId
    });

    const agendamento = await this.agendamentosRepository.findById(agendamentoId);
    if (!agendamento) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    const serie = await this.findSerieByAgendamentoId(agendamentoId);

    // Se tem Google Calendar e faz parte de série
    if (serie?.temGoogleCalendar && serie.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        console.log('🌐 SeriesManager - Excluindo instância específica no Google Calendar');
        
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
            
            console.log('✅ SeriesManager - Usando horário original do Google Calendar para exclusão:', horarioOriginalSerie.toISOString());
          } else {
            // Fallback: usar horário do agendamento atual
            dataOriginalInstancia = agendamento.dataHoraInicio;
            console.log('⚠️ SeriesManager - Fallback: usando horário atual do agendamento para exclusão');
          }
        } catch (error) {
          console.error('❌ SeriesManager - Erro ao buscar horário original para exclusão, usando fallback:', error);
          dataOriginalInstancia = agendamento.dataHoraInicio;
        }
        
        console.log('🔍 SeriesManager - Excluindo instância Google Calendar:', {
          agendamentoId: agendamento.id,
          dataOriginalInstancia: dataOriginalInstancia.toISOString(),
          agendamentoGoogleEventId: agendamento.googleEventId,
          serieGoogleEventId: serie.googleEventId,
          temEventoProprio: agendamento.googleEventId !== serie.googleEventId
        });
        
        // Se o agendamento tem googleEventId próprio (foi editado antes), deletar o evento individual
        if (agendamento.googleEventId && agendamento.googleEventId !== serie.googleEventId) {
          console.log('🔄 SeriesManager - Agendamento tem evento próprio, deletando evento individual');
          await this.googleCalendarService.deletarEvento(agendamento.googleEventId);
        } else {
          console.log('🆕 SeriesManager - Cancelando instância específica da série');
          
          try {
            await this.googleCalendarService.deletarOcorrenciaEspecifica(
              serie.googleEventId,
              dataOriginalInstancia
            );
          } catch (instanceError) {
            console.error('❌ SeriesManager - Erro ao cancelar instância específica:', instanceError);
            console.log('⚠️ SeriesManager - Instância pode já estar modificada ou não encontrada');
            
            // Se falhar, pode ser porque a instância já foi modificada antes
            // Neste caso, a exclusão do banco de dados será suficiente
            console.log('ℹ️ SeriesManager - Continuando com exclusão apenas no banco de dados');
          }
        }
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