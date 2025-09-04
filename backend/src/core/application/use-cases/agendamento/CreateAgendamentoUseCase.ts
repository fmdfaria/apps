import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, ICreateAgendamentoDTO, IRecorrenciaAgendamento } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { IRecursosRepository } from '../../../domain/repositories/IRecursosRepository';
import { GoogleCalendarService, CalendarEventData } from '../../../../shared/services/GoogleCalendarService';

@injectable()
export class CreateAgendamentoUseCase {
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

  async execute(data: Omit<ICreateAgendamentoDTO, 'dataHoraFim'>): Promise<Agendamento | Agendamento[]> {
    // Define status default como 'AGENDADO' se não for fornecido
    const agendamentoData = {
      ...data,
      status: data.status || 'AGENDADO'
    };

    // Se não for recorrente, segue fluxo normal
    if (!agendamentoData.recorrencia) {
      // Regras de conflito: Profissional, Recurso, Paciente na mesma Data/Hora
      const [existenteProf, existenteRecurso, existentePaciente] = await Promise.all([
        this.agendamentosRepository.findByProfissionalAndDataHoraInicio(
          agendamentoData.profissionalId,
          agendamentoData.dataHoraInicio
        ),
        this.agendamentosRepository.findByRecursoAndDataHoraInicio(
          agendamentoData.recursoId,
          agendamentoData.dataHoraInicio
        ),
        this.agendamentosRepository.findByPacienteAndDataHoraInicio(
          agendamentoData.pacienteId,
          agendamentoData.dataHoraInicio
        ),
      ]);
      if (existenteProf) {
        throw new AppError('Conflito: profissional já possui agendamento nesta data e hora.', 400);
      }
      if (existenteRecurso) {
        throw new AppError('Conflito: recurso já possui agendamento nesta data e hora.', 400);
      }
      if (existentePaciente) {
        throw new AppError('Conflito: paciente já possui agendamento nesta data e hora.', 400);
      }
      // Buscar duração do serviço
      const servico = await this.servicosRepository.findById(agendamentoData.servicoId);
      if (!servico) {
        throw new AppError('Serviço não encontrado.', 404);
      }
      const dataHoraFim = new Date(new Date(agendamentoData.dataHoraInicio).getTime() + servico.duracaoMinutos * 60000);
      
      // Create the agendamento first
      const agendamento = await this.agendamentosRepository.create({ ...agendamentoData, dataHoraFim });
      
      // Create Google Calendar event if it's an online appointment
      if (agendamentoData.tipoAtendimento === 'online') {
        try {
          const eventData = await this.prepareEventData(agendamento);
          const calendarEvent = await this.googleCalendarService.createCalendarEvent(eventData);
          
          if (calendarEvent?.meetUrl) {
            // Update the agendamento with the Meet URL
            return this.agendamentosRepository.update(agendamento.id, { 
              urlMeet: calendarEvent.meetUrl 
            });
          }
        } catch (error) {
          console.error('Failed to create Google Calendar event:', error);
          // Don't fail the appointment creation if Google Calendar fails
        }
      }
      
      return agendamento;
    }

    // --- Lógica de recorrência ---
    const { recorrencia, ...baseData } = agendamentoData;
    const servico = await this.servicosRepository.findById(baseData.servicoId);
    if (!servico) {
      throw new AppError('Serviço não encontrado.', 404);
    }
    const datas: Date[] = [];
    // Preservar a data original exatamente como recebida
    const dataOriginal = baseData.dataHoraInicio instanceof Date ? baseData.dataHoraInicio : new Date(baseData.dataHoraInicio);
    let count = 0;
    const maxRepeticoes = recorrencia?.repeticoes ?? 100; // Limite de segurança
    const dataLimite = recorrencia?.ate ? new Date(recorrencia.ate) : undefined;
    
    // Primeira data é sempre a original
    datas.push(new Date(dataOriginal));
    count++;
    
    // Gerar as próximas datas baseando-se na original
    while (count < maxRepeticoes && (!recorrencia?.repeticoes || count < recorrencia.repeticoes)) {
      let proximaData = new Date(dataOriginal);
      
      if (recorrencia?.tipo === 'semanal') {
        proximaData.setDate(dataOriginal.getDate() + (7 * count));
      } else if (recorrencia?.tipo === 'quinzenal') {
        proximaData.setDate(dataOriginal.getDate() + (14 * count));
      } else if (recorrencia?.tipo === 'mensal') {
        proximaData.setMonth(dataOriginal.getMonth() + count);
      }
      
      if (dataLimite && proximaData > dataLimite) break;
      
      datas.push(proximaData);
      count++;
    }
    // Verificar conflitos para todas as datas (profissional, recurso, paciente) no exato horário
    for (const dataHoraInicio of datas) {
      const [existeProf, existeRecurso, existePaciente] = await Promise.all([
        this.agendamentosRepository.findByProfissionalAndDataHoraInicio(
          baseData.profissionalId,
          dataHoraInicio
        ),
        this.agendamentosRepository.findByRecursoAndDataHoraInicio(
          baseData.recursoId,
          dataHoraInicio
        ),
        this.agendamentosRepository.findByPacienteAndDataHoraInicio(
          baseData.pacienteId,
          dataHoraInicio
        ),
      ]);
      if (existeProf) {
        throw new AppError(`Conflito: profissional já possui agendamento em ${dataHoraInicio.toISOString()}`);
      }
      if (existeRecurso) {
        throw new AppError(`Conflito: recurso já possui agendamento em ${dataHoraInicio.toISOString()}`);
      }
      if (existePaciente) {
        throw new AppError(`Conflito: paciente já possui agendamento em ${dataHoraInicio.toISOString()}`);
      }
    }
    // Se não houver conflitos, criar todos
    const agendamentosCriados: Agendamento[] = [];
    for (const dataHoraInicio of datas) {
      const dataHoraFim = new Date(dataHoraInicio.getTime() + servico.duracaoMinutos * 60000);
      let agendamento = await this.agendamentosRepository.create({ ...baseData, dataHoraInicio, dataHoraFim });
      
      // Create Google Calendar event for online appointments
      if (baseData.tipoAtendimento === 'online') {
        try {
          const eventData = await this.prepareEventData(agendamento);
          const calendarEvent = await this.googleCalendarService.createCalendarEvent(eventData);
          
          if (calendarEvent?.meetUrl) {
            // Update the agendamento with the Meet URL
            agendamento = await this.agendamentosRepository.update(agendamento.id, { 
              urlMeet: calendarEvent.meetUrl 
            });
          }
        } catch (error) {
          console.error('Failed to create Google Calendar event for recurring appointment:', error);
          // Don't fail the appointment creation if Google Calendar fails
        }
      }
      
      agendamentosCriados.push(agendamento);
    }
    return agendamentosCriados;
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
      throw new AppError('Dados relacionados não encontrados para criar evento do Google Calendar.', 404);
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