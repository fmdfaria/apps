import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, IUpdateAgendamentoDTO } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { GoogleCalendarService } from '../../../../infra/services/GoogleCalendarService';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { SeriesManager } from '../../../../infra/services/SeriesManager';

@injectable()
export class UpdateAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository,
    @inject('GoogleCalendarService')
    private googleCalendarService: GoogleCalendarService,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository,
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository,
    @inject('SeriesManager')
    private seriesManager: SeriesManager
  ) {}

  async execute(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento> {
    console.log('🔍 UpdateAgendamentoUseCase - Iniciado:', {
      agendamentoId: id,
      tipoEdicaoRecorrencia: data.tipoEdicaoRecorrencia,
      temDataHoraInicio: !!data.dataHoraInicio,
      dadosRecebidos: Object.keys(data)
    });

    // 1. Carregar agendamento atual
    const agendamentoAtual = await this.agendamentosRepository.findById(id);
    if (!agendamentoAtual) {
      throw new AppError('Agendamento não encontrado.', 404);
    }

    console.log('📋 Agendamento encontrado:', {
      id: agendamentoAtual.id,
      dataHoraInicio: agendamentoAtual.dataHoraInicio,
      tipoAtendimento: agendamentoAtual.tipoAtendimento,
      googleEventId: agendamentoAtual.googleEventId,
      serieId: agendamentoAtual.serieId
    });

    // 2. Validações de conflito
    await this.validarConflitos(id, data, agendamentoAtual);

    // 3. Calcular dataHoraFim se necessário
    const dadosProcessados = await this.processarDadosUpdate(data, agendamentoAtual);

    // 4. Remover campo tipoEdicaoRecorrencia dos dados do banco
    const { tipoEdicaoRecorrencia, ...dadosParaBanco } = dadosProcessados;

    // 5. Verificar se é operação de série ou individual
    const serie = await this.seriesManager.findSerieByAgendamentoId(id);
    
    if (!serie) {
      // AGENDAMENTO INDIVIDUAL
      console.log('📄 Processando agendamento individual');
      return await this.processarAgendamentoIndividual(id, dadosParaBanco, agendamentoAtual);
    } else {
      // AGENDAMENTO DE SÉRIE
      console.log('📅 Processando agendamento de série:', {
        serieId: serie.serieId,
        totalAgendamentos: serie.totalAgendamentos,
        tipoEdicao: tipoEdicaoRecorrencia || 'apenas_esta'
      });
      
      return await this.processarAgendamentoSerie(id, dadosParaBanco, tipoEdicaoRecorrencia, agendamentoAtual);
    }
  }

  /**
   * Valida conflitos de data/hora, profissional, recurso e paciente
   */
  private async validarConflitos(
    agendamentoId: string, 
    data: IUpdateAgendamentoDTO, 
    agendamentoAtual: Agendamento
  ): Promise<void> {
    // Determinar valores-alvo após update
    const profissionalAlvo = data.profissionalId || agendamentoAtual.profissionalId;
    const recursoAlvo = data.recursoId || agendamentoAtual.recursoId;
    const pacienteAlvo = data.pacienteId || agendamentoAtual.pacienteId;
    const dataHoraInicioAlvo = data.dataHoraInicio || agendamentoAtual.dataHoraInicio;

    // Validar conflitos apenas se mudou data/hora ou IDs relevantes
    if (data.dataHoraInicio || data.profissionalId) {
      const existenteProf = await this.agendamentosRepository.findByProfissionalAndDataHoraInicio(
        profissionalAlvo, 
        dataHoraInicioAlvo
      );
      if (existenteProf && existenteProf.id !== agendamentoId) {
        throw new AppError('Conflito: profissional já possui agendamento nesta data e hora.', 400);
      }
    }

    if (data.dataHoraInicio || data.recursoId) {
      const existenteRecurso = await this.agendamentosRepository.findByRecursoAndDataHoraInicio(
        recursoAlvo, 
        dataHoraInicioAlvo
      );
      if (existenteRecurso && existenteRecurso.id !== agendamentoId) {
        throw new AppError('Conflito: recurso já possui agendamento nesta data e hora.', 400);
      }
    }

    if (data.dataHoraInicio || data.pacienteId) {
      const existentePaciente = await this.agendamentosRepository.findByPacienteAndDataHoraInicio(
        pacienteAlvo, 
        dataHoraInicioAlvo
      );
      if (existentePaciente && existentePaciente.id !== agendamentoId) {
        throw new AppError('Conflito: paciente já possui agendamento nesta data e hora.', 400);
      }
    }
  }

  /**
   * Processa dados do update (recalcula dataHoraFim se necessário)
   */
  private async processarDadosUpdate(
    data: IUpdateAgendamentoDTO, 
    agendamentoAtual: Agendamento
  ): Promise<IUpdateAgendamentoDTO> {
    let dataHoraFim = data.dataHoraFim;

    // Se dataHoraInicio ou servicoId forem atualizados, recalcular dataHoraFim
    if (data.dataHoraInicio || data.servicoId) {
      const servicoId = data.servicoId || agendamentoAtual.servicoId;
      const dataHoraInicio = data.dataHoraInicio || agendamentoAtual.dataHoraInicio;
      
      const servico = await this.servicosRepository.findById(servicoId);
      if (!servico) {
        throw new AppError('Serviço não encontrado.', 404);
      }
      
      dataHoraFim = new Date(new Date(dataHoraInicio).getTime() + servico.duracaoMinutos * 60000);
    }

    return { ...data, dataHoraFim };
  }

  /**
   * Processa agendamento individual (não faz parte de série)
   */
  private async processarAgendamentoIndividual(
    id: string, 
    dados: any, 
    agendamentoAtual: Agendamento
  ): Promise<Agendamento> {
    console.log('📄 Atualizando agendamento individual');

    // Atualizar no banco
    const agendamentoAtualizado = await this.agendamentosRepository.update(id, dados);

    // Verificar se precisa criar/atualizar Google Calendar
    await this.processarGoogleCalendarIndividual(agendamentoAtualizado, agendamentoAtual, dados);

    console.log('✅ Agendamento individual atualizado com sucesso');
    return agendamentoAtualizado;
  }

  /**
   * Processa agendamento de série usando SeriesManager
   */
  private async processarAgendamentoSerie(
    id: string, 
    dados: any, 
    tipoEdicaoRecorrencia: string | undefined,
    agendamentoAtual: Agendamento
  ): Promise<Agendamento> {
    const tipoEdicao = tipoEdicaoRecorrencia || 'apenas_esta';

    console.log('📅 Processando série com tipo:', tipoEdicao);

    switch (tipoEdicao) {
      case 'apenas_esta':
        await this.seriesManager.updateApenaEsta(id, dados);
        break;
        
      case 'esta_e_futuras':
        await this.seriesManager.updateEstaEFuturas(id, dados);
        break;
        
      case 'toda_serie':
        await this.seriesManager.updateTodaSerie(id, dados);
        break;
        
      default:
        throw new AppError(`Tipo de edição de recorrência inválido: ${tipoEdicao}`, 400);
    }

    // Retornar agendamento atualizado
    const agendamentoAtualizado = await this.agendamentosRepository.findById(id);
    if (!agendamentoAtualizado) {
      throw new AppError('Erro ao recuperar agendamento atualizado', 500);
    }

    console.log('✅ Série atualizada com sucesso');
    return agendamentoAtualizado;
  }

  /**
   * Processa integração com Google Calendar para agendamentos individuais
   */
  private async processarGoogleCalendarIndividual(
    agendamentoAtualizado: Agendamento,
    agendamentoAtual: Agendamento, 
    dados: any
  ): Promise<void> {
    if (!this.googleCalendarService.isIntegracaoAtiva() || agendamentoAtualizado.tipoAtendimento !== 'online') {
      return;
    }

    try {
      const statusMudouParaLiberado = dados.status === 'LIBERADO' && agendamentoAtual.status !== 'LIBERADO';
      const mudouParaOnline = dados.tipoAtendimento === 'online' && agendamentoAtual.tipoAtendimento !== 'online';
      const mudouDataHora = dados.dataHoraInicio && dados.dataHoraInicio.getTime() !== agendamentoAtual.dataHoraInicio.getTime();

      console.log('🔍 Verificando mudanças Google Calendar:', {
        statusMudouParaLiberado,
        mudouParaOnline,
        mudouDataHora,
        temGoogleEventId: !!agendamentoAtualizado.googleEventId
      });

      // Se mudou para online ou status LIBERADO e não tem evento ainda, criar novo evento
      if ((statusMudouParaLiberado || mudouParaOnline) && !agendamentoAtualizado.urlMeet) {
        await this.criarEventoGoogleCalendar(agendamentoAtualizado);
      }
      // Se já tem evento e mudou data/hora, atualizar evento
      else if (agendamentoAtualizado.googleEventId && mudouDataHora) {
        await this.atualizarEventoGoogleCalendar(agendamentoAtualizado);
      }
      // Se mudou de online para presencial, deletar evento
      else if (agendamentoAtual.googleEventId && agendamentoAtual.tipoAtendimento === 'online' && dados.tipoAtendimento === 'presencial') {
        await this.googleCalendarService.deletarEvento(agendamentoAtual.googleEventId);
        
        // Limpar dados do Google Calendar
        await this.agendamentosRepository.update(agendamentoAtualizado.id, {
          urlMeet: null,
          googleEventId: null
        });
      }
    } catch (error) {
      console.error('❌ Erro na integração Google Calendar:', error);
      // Continuar sem falhar a atualização
    }
  }

  /**
   * Cria evento no Google Calendar para agendamento individual
   */
  private async criarEventoGoogleCalendar(agendamento: Agendamento): Promise<void> {
    const [profissional, paciente, convenio, servico] = await Promise.all([
      this.profissionaisRepository.findById(agendamento.profissionalId),
      this.pacientesRepository.findById(agendamento.pacienteId),
      this.conveniosRepository.findById(agendamento.convenioId),
      this.servicosRepository.findById(agendamento.servicoId)
    ]);

    if (!profissional || !paciente || !convenio || !servico) {
      throw new AppError('Dados incompletos para criar evento Google Calendar', 400);
    }

    const googleEvent = await this.googleCalendarService.criarEventoComMeet({
      pacienteNome: paciente.nomeCompleto,
      pacienteEmail: paciente.email || undefined,
      profissionalNome: profissional.nome,
      profissionalEmail: profissional.email,
      servicoNome: servico.nome,
      convenioNome: convenio.nome,
      dataHoraInicio: agendamento.dataHoraInicio,
      dataHoraFim: agendamento.dataHoraFim,
      agendamentoId: agendamento.id
    });

    // Atualizar com URL do Meet e Event ID
    await this.agendamentosRepository.update(agendamento.id, {
      urlMeet: googleEvent.urlMeet,
      googleEventId: googleEvent.eventId
    });

    console.log('✅ Evento Google Calendar criado para agendamento individual');
  }

  /**
   * Atualiza evento existente no Google Calendar
   */
  private async atualizarEventoGoogleCalendar(agendamento: Agendamento): Promise<void> {
    if (!agendamento.googleEventId) return;

    const [profissional, paciente, convenio, servico] = await Promise.all([
      this.profissionaisRepository.findById(agendamento.profissionalId),
      this.pacientesRepository.findById(agendamento.pacienteId),
      this.conveniosRepository.findById(agendamento.convenioId),
      this.servicosRepository.findById(agendamento.servicoId)
    ]);

    if (!profissional || !paciente || !convenio || !servico) {
      console.error('❌ Dados incompletos para atualizar evento Google Calendar');
      return;
    }

    await this.googleCalendarService.atualizarEvento(agendamento.googleEventId, {
      pacienteNome: paciente.nomeCompleto,
      pacienteEmail: paciente.email || undefined,
      profissionalNome: profissional.nome,
      profissionalEmail: profissional.email,
      servicoNome: servico.nome,
      convenioNome: convenio.nome,
      dataHoraInicio: agendamento.dataHoraInicio,
      dataHoraFim: agendamento.dataHoraFim,
      agendamentoId: agendamento.id
    });

    console.log('✅ Evento Google Calendar atualizado');
  }
}