import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, IUpdateAgendamentoDTO } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';
import { GoogleCalendarService, CalendarEventData } from '../../../../shared/services/GoogleCalendarService';

@injectable()
export class UpdateAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository,
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository,
    @inject('RecursosRepository')
    private recursosRepository: IRecursosRepository,
    @inject('GoogleCalendarService')
    private googleCalendarService: GoogleCalendarService
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
    const tipoAtendimentoAlvo = data.tipoAtendimento || (atual as any).tipoAtendimento;

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

    // Handle Google Calendar integration for online appointments
    let urlMeetToUpdate = data.urlMeet;
    
    // If changing to online appointment or updating existing online appointment
    if (tipoAtendimentoAlvo === 'online' && (
      data.tipoAtendimento === 'online' || 
      data.dataHoraInicio || 
      data.profissionalId || 
      data.pacienteId ||
      data.servicoId
    )) {
      try {
        const agendamentoTemp = { ...atual, ...data, dataHoraFim } as Agendamento;
        const eventData = await this.prepareEventData(agendamentoTemp);
        
        // If it was already online and has Meet URL, update the existing event
        if ((atual as any).urlMeet) {
          const calendarEvent = await this.googleCalendarService.updateCalendarEvent(
            (atual as any).urlMeet, 
            eventData
          );
          urlMeetToUpdate = calendarEvent?.meetUrl || (atual as any).urlMeet;
        } else {
          // Create new calendar event
          const calendarEvent = await this.googleCalendarService.createCalendarEvent(eventData);
          urlMeetToUpdate = calendarEvent?.meetUrl || null;
        }
      } catch (error) {
        console.error('Failed to handle Google Calendar event during update:', error);
        // Don't fail the appointment update if Google Calendar fails
      }
    }
    
    // If changing from online to presential, clear the Meet URL
    if (data.tipoAtendimento === 'presencial' && (atual as any).urlMeet) {
      urlMeetToUpdate = null;
    }

    return this.agendamentosRepository.update(id, { 
      ...data, 
      dataHoraFim,
      urlMeet: urlMeetToUpdate 
    });
  }

  private async prepareEventData(agendamento: Agendamento): Promise<CalendarEventData> {
    // Fetch related data for the event
    const [paciente, profissional, convenio, servico, recurso] = await Promise.all([
      this.pacientesRepository.findById(agendamento.pacienteId),
      this.profissionaisRepository.findById(agendamento.profissionalId),
      this.conveniosRepository.findById(agendamento.convenioId),
      this.servicosRepository.findById(agendamento.servicoId),
      this.recursosRepository.findById(agendamento.recursoId),
    ]);

    if (!paciente || !profissional || !convenio || !servico || !recurso) {
      throw new AppError('Dados relacionados não encontrados para atualizar evento do Google Calendar.', 404);
    }

    return {
      agendamentoId: agendamento.id,
      pacienteNome: paciente.nomeCompleto,
      pacienteWhatsapp: paciente.whatsapp,
      pacienteEmail: paciente.email || undefined,
      profissionalNome: profissional.nome,
      convenioNome: convenio.nome,
      servicoNome: servico.nome,
      recursoNome: recurso.nome,
      dataHoraInicio: agendamento.dataHoraInicio,
      dataHoraFim: agendamento.dataHoraFim,
      tipoAtendimento: agendamento.tipoAtendimento,
      observacoes: undefined,
    };
  }
} 