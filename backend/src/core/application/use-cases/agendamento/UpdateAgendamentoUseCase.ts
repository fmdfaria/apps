import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, IUpdateAgendamentoDTO } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { GoogleCalendarService } from '../../../../infra/services/GoogleCalendarService';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';

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
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento> {
    // Carregar agendamento atual para validações cruzadas
    const atual = await this.agendamentosRepository.findById(id);
    if (!atual) throw new AppError('Agendamento não encontrado.', 404);

    // Determinar valores-alvo após update
    const profissionalAlvo = data.profissionalId || (atual as any).profissionalId;
    const recursoAlvo = data.recursoId || (atual as any).recursoId;
    const pacienteAlvo = data.pacienteId || (atual as any).pacienteId;
    const dataHoraInicioAlvo = data.dataHoraInicio || (atual as any).dataHoraInicio;

    // Regras de conflito (Data+Hora): profissional, recurso, paciente
    if (data.dataHoraInicio || data.profissionalId) {
      const existenteProf = await this.agendamentosRepository.findByProfissionalAndDataHoraInicio(profissionalAlvo, data.dataHoraInicio || (atual as any).dataHoraInicio);
      if (existenteProf && existenteProf.id !== id) {
        throw new AppError('Conflito: profissional já possui agendamento nesta data e hora.', 400);
      }
    }
    if (data.dataHoraInicio || data.recursoId) {
      const existenteRecurso = await this.agendamentosRepository.findByRecursoAndDataHoraInicio(recursoAlvo, dataHoraInicioAlvo);
      if (existenteRecurso && existenteRecurso.id !== id) {
        throw new AppError('Conflito: recurso já possui agendamento nesta data e hora.', 400);
      }
    }
    if (data.dataHoraInicio || data.pacienteId) {
      const existentePaciente = await this.agendamentosRepository.findByPacienteAndDataHoraInicio(pacienteAlvo, dataHoraInicioAlvo);
      if (existentePaciente && existentePaciente.id !== id) {
        throw new AppError('Conflito: paciente já possui agendamento nesta data e hora.', 400);
      }
    }
    // Se dataHoraInicio ou servicoId forem atualizados, recalcular dataHoraFim
    let dataHoraFim = data.dataHoraFim;
    if (data.dataHoraInicio || data.servicoId) {
      const servicoId = data.servicoId || (atual as any).servicoId;
      const dataHoraInicio = data.dataHoraInicio || (atual as any).dataHoraInicio;
      const servico = await this.servicosRepository.findById(servicoId);
      if (!servico) {
        throw new AppError('Serviço não encontrado.', 404);
      }
      dataHoraFim = new Date(new Date(dataHoraInicio).getTime() + servico.duracaoMinutos * 60000);
    }
    const agendamentoAtualizado = await this.agendamentosRepository.update(id, { ...data, dataHoraFim });
    
    // Integrar com Google Calendar se mudou para online ou status LIBERADO
    const statusMudouParaLiberado = data.status === 'LIBERADO' && atual.status !== 'LIBERADO';
    const mudouParaOnline = data.tipoAtendimento === 'online' && atual.tipoAtendimento !== 'online';
    
    if ((statusMudouParaLiberado || mudouParaOnline) && 
        agendamentoAtualizado.tipoAtendimento === 'online' && 
        !agendamentoAtualizado.urlMeet && 
        this.googleCalendarService.isIntegracaoAtiva()) {
      try {
        const [profissional, paciente, convenio, servicoCompleto] = await Promise.all([
          this.profissionaisRepository.findById(agendamentoAtualizado.profissionalId),
          this.pacientesRepository.findById(agendamentoAtualizado.pacienteId),
          this.conveniosRepository.findById(agendamentoAtualizado.convenioId),
          this.servicosRepository.findById(agendamentoAtualizado.servicoId)
        ]);

        if (profissional && paciente && convenio && servicoCompleto) {
          const googleEvent = await this.googleCalendarService.criarEventoComMeet({
            pacienteNome: paciente.nomeCompleto,
            pacienteEmail: paciente.email || undefined,
            profissionalNome: profissional.nome,
            profissionalEmail: profissional.email,
            servicoNome: servicoCompleto.nome,
            convenioNome: convenio.nome,
            dataHoraInicio: agendamentoAtualizado.dataHoraInicio,
            dataHoraFim: agendamentoAtualizado.dataHoraFim,
            agendamentoId: agendamentoAtualizado.id
          });

          // Atualizar com URL do Meet
          return await this.agendamentosRepository.update(id, {
            urlMeet: googleEvent.urlMeet
          });
        }
      } catch (error) {
        console.error('Erro na integração Google Calendar:', error);
        // Continua sem falhar a atualização
      }
    }
    
    return agendamentoAtualizado;
  }
} 