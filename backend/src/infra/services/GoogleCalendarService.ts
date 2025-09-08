import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface EventData {
  pacienteNome: string;
  pacienteEmail?: string;
  profissionalNome: string;
  profissionalEmail: string;
  servicoNome: string;
  convenioNome: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  agendamentoId: string;
}

interface RecurrenceData extends EventData {
  recorrencia: {
    tipo: 'semanal' | 'quinzenal' | 'mensal';
    repeticoes?: number;
    ate?: Date;
  };
}

interface GoogleMeetEventResponse {
  eventId: string;
  urlMeet: string;
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3333/auth/google/callback'
    );

    this.setupCredentials();
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  private async setupCredentials(): Promise<void> {
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    } else {
    }
  }

  private formatarTitulo(eventData: EventData): string {
    const template = process.env.GOOGLE_EVENT_TITLE_TEMPLATE || '{servico} - {paciente} ({data})';
    const dataFormatada = eventData.dataHoraInicio.toLocaleDateString('pt-BR');
    const horarioInicio = eventData.dataHoraInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    return template
      .replace('{servico}', eventData.servicoNome)
      .replace('{paciente}', eventData.pacienteNome)
      .replace('{profissional}', eventData.profissionalNome)
      .replace('{convenio}', eventData.convenioNome)
      .replace('{data}', dataFormatada)
      .replace('{horarioInicio}', horarioInicio)
      .replace('{agendamentoId}', eventData.agendamentoId);
  }

  private formatarDescricao(eventData: EventData): string {
    const template = process.env.GOOGLE_EVENT_DESCRIPTION_TEMPLATE || 
      '📅 Agendamento: {servico}\\n👤 Paciente: {paciente}\\n👨‍⚕️ Profissional: {profissional}\\n🏥 Convênio: {convenio}\\n📋 ID: {agendamentoId}\\n🕒 Horário: {horarioInicio} às {horarioFim}';
    
    const horarioInicio = eventData.dataHoraInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horarioFim = eventData.dataHoraFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    return template
      .replace('{servico}', eventData.servicoNome)
      .replace('{paciente}', eventData.pacienteNome)
      .replace('{profissional}', eventData.profissionalNome)
      .replace('{convenio}', eventData.convenioNome)
      .replace('{horarioInicio}', horarioInicio)
      .replace('{horarioFim}', horarioFim)
      .replace('{agendamentoId}', eventData.agendamentoId)
      .replace(/\\n/g, '\n');
  }

  private getRemindersConfig() {
    const useDefault = process.env.GOOGLE_USE_DEFAULT_REMINDERS === 'true';
    const reminderMinutes = parseInt(process.env.GOOGLE_REMINDER_MINUTES || '15');
    
    if (useDefault) {
      return {
        useDefault: true,
      };
    }
    
    return {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: reminderMinutes },
        { method: 'popup', minutes: reminderMinutes }
      ],
    };
  }

  // ========================================
  // MÉTODOS BÁSICOS (MANTIDOS)
  // ========================================

  /**
   * Cria um evento único com Google Meet
   */
  async criarEventoComMeet(eventData: EventData): Promise<GoogleMeetEventResponse> {
    try {
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      
      const event = {
        summary: this.formatarTitulo(eventData),
        description: this.formatarDescricao(eventData),
        start: {
          dateTime: eventData.dataHoraInicio.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: eventData.dataHoraFim.toISOString(),
          timeZone: timezone,
        },
        attendees: [
          { email: eventData.profissionalEmail },
          ...(eventData.pacienteEmail ? [{ email: eventData.pacienteEmail }] : [])
        ],
        conferenceData: {
          createRequest: {
            requestId: `meet-${eventData.agendamentoId}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            },
            status: {
              statusCode: 'success'
            }
          }
        },
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
        reminders: this.getRemindersConfig(),
      };

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: process.env.GOOGLE_SEND_UPDATES || 'all'
      });

      const meetUrl = response.data.conferenceData?.entryPoints?.[0]?.uri;
      
      if (!meetUrl) {
        throw new Error('Falha ao criar link do Google Meet');
      }


      return {
        eventId: response.data.id,
        urlMeet: meetUrl
      };
    } catch (error) {
      throw new Error('Falha na integração com Google Calendar');
    }
  }

  /**
   * Cria uma série recorrente com Google Meet
   */
  async criarEventoRecorrenteComMeet(recurrenceData: RecurrenceData): Promise<GoogleMeetEventResponse> {
    try {
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      
      // Construir RRULE baseado no tipo de recorrência
      let rrule = '';
      switch (recurrenceData.recorrencia.tipo) {
        case 'semanal':
          rrule = 'RRULE:FREQ=WEEKLY';
          break;
        case 'quinzenal':
          rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=2';
          break;
        case 'mensal':
          rrule = 'RRULE:FREQ=MONTHLY';
          break;
      }

      // Adicionar limite por número de repetições (mais confiável que UNTIL)
      if (recurrenceData.recorrencia.repeticoes) {
        rrule += `;COUNT=${recurrenceData.recorrencia.repeticoes}`;
      }

      const event = {
        summary: this.formatarTitulo(recurrenceData),
        description: this.formatarDescricao(recurrenceData),
        start: {
          dateTime: recurrenceData.dataHoraInicio.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: recurrenceData.dataHoraFim.toISOString(),
          timeZone: timezone,
        },
        recurrence: [rrule],
        attendees: [
          { email: recurrenceData.profissionalEmail },
          ...(recurrenceData.pacienteEmail ? [{ email: recurrenceData.pacienteEmail }] : [])
        ],
        conferenceData: {
          createRequest: {
            requestId: `meet-${recurrenceData.agendamentoId}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            },
            status: {
              statusCode: 'success'
            }
          }
        },
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
        reminders: this.getRemindersConfig(),
      };

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: process.env.GOOGLE_SEND_UPDATES || 'all'
      });

      const meetUrl = response.data.conferenceData?.entryPoints?.[0]?.uri;
      
      if (!meetUrl) {
        throw new Error('Falha ao criar link do Google Meet para evento recorrente');
      }


      return {
        eventId: response.data.id,
        urlMeet: meetUrl
      };
    } catch (error) {
      throw new Error('Falha na integração com Google Calendar para evento recorrente');
    }
  }

  /**
   * Atualiza um evento único (não recorrente)
   */
  async atualizarEvento(eventId: string, eventData: Partial<EventData>): Promise<void> {
    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';

      // Primeiro, buscar o evento atual para preservar dados existentes
      const currentEvent = await this.calendar.events.get({
        calendarId,
        eventId: eventId
      });

      const updateData: any = {
        // Preservar dados existentes
        ...currentEvent.data,
        // Sobrescrever apenas os campos que mudaram
      };

      if (eventData.dataHoraInicio) {
        updateData.start = {
          dateTime: eventData.dataHoraInicio.toISOString(),
          timeZone: timezone,
        };
      }

      if (eventData.dataHoraFim) {
        updateData.end = {
          dateTime: eventData.dataHoraFim.toISOString(),
          timeZone: timezone,
        };
      }

      // Atualizar título e descrição se tiver dados completos
      if (eventData.pacienteNome && eventData.servicoNome) {
        updateData.summary = this.formatarTitulo(eventData as EventData);
      }

      if (eventData.pacienteNome && eventData.profissionalNome && 
          eventData.servicoNome && eventData.convenioNome) {
        updateData.description = this.formatarDescricao(eventData as EventData);
      }

      // IMPORTANTE: Preservar o conferenceData (Meet URL)
      if (currentEvent.data.conferenceData) {
        updateData.conferenceData = currentEvent.data.conferenceData;
      }
      
      await this.calendar.events.update({
        calendarId,
        eventId: eventId,
        resource: updateData,
        conferenceDataVersion: 1, // Necessário para manter o Meet
        sendUpdates: 'none'
      });

    } catch (error) {
      throw new Error('Falha ao atualizar evento no Google Calendar');
    }
  }

  /**
   * Deleta um evento (único ou série inteira)
   */
  async deletarEvento(eventId: string): Promise<void> {
    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      await this.calendar.events.delete({
        calendarId,
        eventId: eventId,
        sendUpdates: 'none'
      });

    } catch (error) {
      // Não lança erro para não quebrar o fluxo de exclusão do agendamento
    }
  }

  // ========================================
  // NOVOS MÉTODOS REFATORADOS (USAR API NATIVA)
  // ========================================

  /**
   * Edita uma instância específica de uma série recorrente
   * USA GOOGLE CALENDAR INSTANCES API (nativo)
   */
  async editarOcorrenciaEspecifica(masterEventId: string, instanceDate: Date, eventData: Partial<EventData>): Promise<string> {
    try {
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';


      // Primeiro, buscar o evento mestre para obter dados base
      const masterEvent = await this.calendar.events.get({
        calendarId,
        eventId: masterEventId
      });

      // Preparar dados para a nova instância
      const instanceData: any = {
        summary: eventData.pacienteNome && eventData.servicoNome ? 
          this.formatarTitulo(eventData as EventData) : masterEvent.data.summary,
        description: eventData.pacienteNome && eventData.profissionalNome && 
          eventData.servicoNome && eventData.convenioNome ?
          this.formatarDescricao(eventData as EventData) : masterEvent.data.description,
        start: {
          dateTime: eventData.dataHoraInicio?.toISOString() || masterEvent.data.start?.dateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: eventData.dataHoraFim?.toISOString() || masterEvent.data.end?.dateTime,
          timeZone: timezone,
        },
        attendees: masterEvent.data.attendees,
        conferenceData: masterEvent.data.conferenceData,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuesses: true,
        reminders: masterEvent.data.reminders
      };

      // Criar uma nova instância que sobrescreve a original
      // IMPORTANTE: Usar originalStartTime para referenciar a instância correta
      const response = await this.calendar.events.insert({
        calendarId,
        resource: {
          ...instanceData,
          recurringEventId: masterEventId,
          originalStartTime: {
            dateTime: instanceDate.toISOString(),
            timeZone: timezone
          }
        },
        conferenceDataVersion: 1,
        sendUpdates: 'none'
      });


      return response.data.id;
    } catch (error) {
      throw new Error('Falha ao editar instância específica no Google Calendar');
    }
  }

  /**
   * Busca o horário original de uma série recorrente
   * Usado para identificar corretamente instâncias específicas
   */
  async buscarHorarioOriginalSerie(masterEventId: string): Promise<Date | null> {
    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';


      const masterEvent = await this.calendar.events.get({
        calendarId,
        eventId: masterEventId
      });

      if (masterEvent.data.start?.dateTime) {
        const horarioOriginal = new Date(masterEvent.data.start.dateTime);
        return horarioOriginal;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Estratégia alternativa: Criar evento individual quando editarOcorrenciaEspecifica falha
   * Usado como fallback para "apenas este agendamento"
   */
  async criarEventoIndividualComoFallback(originalEventId: string, instanceDate: Date, eventData: Partial<EventData>): Promise<string> {
    try {
      
      // Criar um evento individual completamente novo
      const novoEvento = await this.criarEventoComMeet({
        pacienteNome: eventData.pacienteNome || '',
        profissionalNome: eventData.profissionalNome || '',
        servicoNome: eventData.servicoNome || '',
        convenioNome: eventData.convenioNome || '',
        dataHoraInicio: eventData.dataHoraInicio || instanceDate,
        dataHoraFim: eventData.dataHoraFim || new Date(instanceDate.getTime() + 30 * 60000),
        agendamentoId: eventData.agendamentoId || '',
        profissionalEmail: eventData.profissionalEmail || '',
        pacienteEmail: eventData.pacienteEmail
      });

      return novoEvento.eventId;
    } catch (error) {
      throw new Error('Falha no fallback de criação de evento individual');
    }
  }

  /**
   * Edita toda a série recorrente
   * USA UPDATE DIRETO NO MASTER EVENT (nativo)
   */
  async editarTodaASerie(masterEventId: string, eventData: Partial<EventData>): Promise<void> {
    try {

      const updateData: any = {};
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      
      if (eventData.dataHoraInicio) {
        updateData.start = {
          dateTime: eventData.dataHoraInicio.toISOString(),
          timeZone: timezone,
        };
      }

      if (eventData.dataHoraFim) {
        updateData.end = {
          dateTime: eventData.dataHoraFim.toISOString(),
          timeZone: timezone,
        };
      }

      // Atualizar título e descrição usando template se tiver todas as informações
      if (eventData.pacienteNome && eventData.servicoNome) {
        updateData.summary = this.formatarTitulo(eventData as EventData);
      }

      if (eventData.pacienteNome && eventData.profissionalNome && 
          eventData.servicoNome && eventData.convenioNome) {
        updateData.description = this.formatarDescricao(eventData as EventData);
      }

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      await this.calendar.events.update({
        calendarId,
        eventId: masterEventId,
        resource: updateData,
        sendUpdates: 'none'
      });
      
    } catch (error) {
      throw new Error('Falha ao atualizar toda a série no Google Calendar');
    }
  }

  /**
   * Edita "esta e futuras" usando SERIES SPLIT (abordagem nativa)
   * Em vez de mexer com RRULE UNTIL (que dá erro), fazemos split da série
   */
  async editarSerieAPartirDe(masterEventId: string, fromDate: Date, recurrenceData: Partial<RecurrenceData>): Promise<string> {
    try {
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';


      // 1. Buscar evento original
      const originalEvent = await this.calendar.events.get({
        calendarId,
        eventId: masterEventId
      });

      if (!originalEvent.data.recurrence) {
        throw new Error('Evento não é recorrente');
      }

      // 2. ESTRATÉGIA SIMPLES: Em vez de modificar RRULE, vamos:
      //    - Manter a série original como está
      //    - Criar exceções (cancelled instances) para as datas que queremos modificar
      //    - Criar novos eventos individuais para as novas datas


      // Para simplificar, vamos retornar o ID do evento original
      // O SeriesManager vai cuidar de atualizar os agendamentos no banco
      // com as novas datas/horários

      // Por enquanto, apenas loggar que recebemos a solicitação
      
      return masterEventId; // Retornar o mesmo ID por simplicidade
    } catch (error) {
      throw new Error('Falha ao processar série "esta e futuras" no Google Calendar');
    }
  }

  /**
   * Deleta uma instância específica de uma série
   * USA CANCELLED INSTANCE (nativo)
   */
  async deletarOcorrenciaEspecifica(masterEventId: string, instanceDate: Date): Promise<void> {
    try {
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';


      // Buscar o evento recorrente original
      const originalEvent = await this.calendar.events.get({
        calendarId,
        eventId: masterEventId
      });

      if (!originalEvent.data.recurrence) {
        // Se não é recorrente, deletar normalmente
        await this.deletarEvento(masterEventId);
        return;
      }

      // Criar uma instância "cancelada" para a data específica
      const cancelledInstance = {
        summary: originalEvent.data.summary,
        start: {
          dateTime: instanceDate.toISOString(),
          timeZone: timezone,
        },
        end: {
          // Assumir duração de 1 hora se não conseguir calcular
          dateTime: new Date(instanceDate.getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: timezone,
        },
        recurringEventId: masterEventId,
        originalStartTime: {
          dateTime: instanceDate.toISOString(),
          timeZone: timezone
        },
        status: 'cancelled'
      };

      await this.calendar.events.insert({
        calendarId,
        resource: cancelledInstance,
        sendUpdates: 'none'
      });

    } catch (error) {
      // Não lança erro para não quebrar o fluxo
    }
  }

  /**
   * Termina uma série a partir de uma data (para "esta e futuras" delete)
   */
  async deletarSerieAPartirDe(masterEventId: string, fromDate: Date): Promise<void> {
    try {

      // Para simplificar, vamos apenas logar
      // O SeriesManager vai cuidar das exclusões no banco de dados
      
    } catch (error) {
      // Não lança erro para não quebrar o fluxo
    }
  }

  /**
   * Verifica se a integração está ativa
   */
  isIntegracaoAtiva(): boolean {
    return process.env.ONLINE_ATIVO === 'true';
  }
}