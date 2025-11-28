import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, IUpdateAgendamentoDTO } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { GoogleCalendarService } from '../../../../infra/services/GoogleCalendarService';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';
import { SeriesManager } from '../../../../infra/services/SeriesManager';
import { 
  gerarMensagemConflitoP, 
  gerarMensagemConflitoRecurso, 
  gerarMensagemConflitoPaciente,
  gerarMensagemAgendamentoNaoEncontrado,
  gerarMensagemServicoNaoEncontrado
} from '../../../../shared/utils/MensagensAgendamento';

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
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository,
    @inject('SeriesManager')
    private seriesManager: SeriesManager
  ) {}

  async execute(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento> {

    // 1. Carregar agendamento atual
    const agendamentoAtual = await this.agendamentosRepository.findById(id);
    if (!agendamentoAtual) {
      throw new AppError(gerarMensagemAgendamentoNaoEncontrado(id, 'para edição'), 404);
    }


    // 2. Validações de conflito
    await this.validarConflitos(id, data, agendamentoAtual);

    // 3. Calcular dataHoraFim se necessário
    const dadosProcessados = await this.processarDadosUpdate(data, agendamentoAtual);

    // 4. Remover campo tipoEdicaoRecorrencia dos dados do banco
    const { tipoEdicaoRecorrencia, ...dadosSemTipoEdicao } = dadosProcessados;

    // 5. Verificar se é operação de série ou individual
    const serie = await this.seriesManager.findSerieByAgendamentoId(id);

    if (!serie) {
      // AGENDAMENTO INDIVIDUAL - permite status (para liberação, cancelamento, etc)
      return await this.processarAgendamentoIndividual(id, dadosSemTipoEdicao, agendamentoAtual);
    } else {
      // AGENDAMENTO DE SÉRIE - remove status para não sobrescrever status individuais
      const { status, ...dadosParaBanco } = dadosSemTipoEdicao;
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
        // Buscar dados para mensagem detalhada
        const [profissional, pacienteExistente, servicoExistente] = await Promise.all([
          this.profissionaisRepository.findById(profissionalAlvo),
          this.pacientesRepository.findById(existenteProf.pacienteId),
          this.servicosRepository.findById(existenteProf.servicoId)
        ]);
        
        const mensagem = gerarMensagemConflitoP({
          agendamentoExistente: existenteProf,
          profissionalNome: profissional?.nome,
          pacienteNome: pacienteExistente?.nomeCompleto,
          servicoNome: servicoExistente?.nome
        });
        
        throw new AppError(mensagem, 400);
      }
    }

    if (data.dataHoraInicio || data.recursoId) {
      // Buscar o recurso para verificar se é 'Online'
      const recurso = await this.recursosRepository.findById(recursoAlvo);
      const isOnlineResource = recurso?.nome?.toLowerCase() === 'online';
      
      // Só verifica conflito de recurso se não for 'Online'
      if (!isOnlineResource) {
        const existenteRecurso = await this.agendamentosRepository.findByRecursoAndDataHoraInicio(
          recursoAlvo, 
          dataHoraInicioAlvo
        );
        if (existenteRecurso && existenteRecurso.id !== agendamentoId) {
          // Buscar dados para mensagem detalhada
          const [recurso, profissionalExistente, servicoExistente] = await Promise.all([
            this.recursosRepository.findById(recursoAlvo),
            this.profissionaisRepository.findById(existenteRecurso.profissionalId),
            this.servicosRepository.findById(existenteRecurso.servicoId)
          ]);
          
          const mensagem = gerarMensagemConflitoRecurso({
            agendamentoExistente: existenteRecurso,
            recursoNome: recurso?.nome,
            profissionalNome: profissionalExistente?.nome,
            servicoNome: servicoExistente?.nome
          });
          
          throw new AppError(mensagem, 400);
        }
      }
    }

    if (data.dataHoraInicio || data.pacienteId) {
      const existentePaciente = await this.agendamentosRepository.findByPacienteAndDataHoraInicio(
        pacienteAlvo, 
        dataHoraInicioAlvo
      );
      if (existentePaciente && existentePaciente.id !== agendamentoId) {
        // Buscar dados para mensagem detalhada
        const [paciente, profissionalExistente, servicoExistente] = await Promise.all([
          this.pacientesRepository.findById(pacienteAlvo),
          this.profissionaisRepository.findById(existentePaciente.profissionalId),
          this.servicosRepository.findById(existentePaciente.servicoId)
        ]);
        
        const mensagem = gerarMensagemConflitoPaciente({
          agendamentoExistente: existentePaciente,
          pacienteNome: paciente?.nomeCompleto,
          profissionalNome: profissionalExistente?.nome,
          servicoNome: servicoExistente?.nome
        });
        
        throw new AppError(mensagem, 400);
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
        throw new AppError(gerarMensagemServicoNaoEncontrado(servicoId), 404);
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

    // Atualizar no banco
    const agendamentoAtualizado = await this.agendamentosRepository.update(id, dados);

    // Verificar se precisa criar/atualizar Google Calendar
    await this.processarGoogleCalendarIndividual(agendamentoAtualizado, agendamentoAtual, dados);

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
      throw new AppError(gerarMensagemAgendamentoNaoEncontrado(id, 'após atualização'), 500);
    }

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

  }
}
