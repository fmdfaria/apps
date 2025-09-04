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

    // TODO: Implementar fluxo completo de OAuth ou usar service account
    // Por enquanto, assume que teremos um refresh token válido
    this.setupCredentials();
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  private async setupCredentials(): Promise<void> {
    // Configurar refresh token se disponível
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
      console.log('✅ Google Calendar Service configurado com refresh token.');
    } else {
      console.log('⚠️ Google Calendar Service: GOOGLE_REFRESH_TOKEN não configurado.');
      console.log('📖 Para obter o refresh token, execute o fluxo OAuth2 completo.');
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
    
    const dataFormatada = eventData.dataHoraInicio.toLocaleDateString('pt-BR');
    const horarioInicio = eventData.dataHoraInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horarioFim = eventData.dataHoraFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    return template
      .replace('{servico}', eventData.servicoNome)
      .replace('{paciente}', eventData.pacienteNome)
      .replace('{profissional}', eventData.profissionalNome)
      .replace('{convenio}', eventData.convenioNome)
      .replace('{data}', dataFormatada)
      .replace('{horarioInicio}', horarioInicio)
      .replace('{horarioFim}', horarioFim)
      .replace('{agendamentoId}', eventData.agendamentoId)
      .replace(/\\n/g, '\n'); // Converter \n literais para quebras de linha
  }

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
        reminders: {
          useDefault: false,
          overrides: [],
        },
      };

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'none'
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
      console.error('Erro ao criar evento Google Calendar:', error);
      throw new Error('Falha na integração com Google Calendar');
    }
  }

  async atualizarEvento(eventId: string, eventData: Partial<EventData>): Promise<void> {
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

      // Atualizar título usando template se tiver todas as informações
      if (eventData.pacienteNome && eventData.servicoNome) {
        updateData.summary = this.formatarTitulo(eventData as EventData);
      }

      // Atualizar descrição se tiver todas as informações
      if (eventData.pacienteNome && eventData.profissionalNome && eventData.servicoNome && eventData.convenioNome) {
        updateData.description = this.formatarDescricao(eventData as EventData);
      }

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      await this.calendar.events.update({
        calendarId,
        eventId: eventId,
        resource: updateData,
        sendUpdates: 'none'
      });
    } catch (error) {
      console.error('Erro ao atualizar evento Google Calendar:', error);
      throw new Error('Falha ao atualizar evento no Google Calendar');
    }
  }

  async deletarEvento(eventId: string): Promise<void> {
    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      await this.calendar.events.delete({
        calendarId,
        eventId: eventId,
        sendUpdates: 'none'
      });
      console.log('✅ Evento Google Calendar deletado:', eventId);
    } catch (error) {
      console.error('Erro ao deletar evento Google Calendar:', error);
      // Não lança erro para não quebrar o fluxo de exclusão do agendamento
    }
  }

  async atualizarEventoRecorrente(eventId: string, recurrenceData: Partial<RecurrenceData>): Promise<void> {
    try {
      const updateData: any = {};
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      
      if (recurrenceData.dataHoraInicio) {
        updateData.start = {
          dateTime: recurrenceData.dataHoraInicio.toISOString(),
          timeZone: timezone,
        };
      }

      if (recurrenceData.dataHoraFim) {
        updateData.end = {
          dateTime: recurrenceData.dataHoraFim.toISOString(),
          timeZone: timezone,
        };
      }

      // Atualizar título e descrição usando template se tiver todas as informações
      if (recurrenceData.pacienteNome && recurrenceData.servicoNome) {
        updateData.summary = this.formatarTitulo(recurrenceData as EventData);
      }

      if (recurrenceData.pacienteNome && recurrenceData.profissionalNome && 
          recurrenceData.servicoNome && recurrenceData.convenioNome) {
        updateData.description = this.formatarDescricao(recurrenceData as EventData);
      }

      // Atualizar RRULE se recorrência mudou
      if (recurrenceData.recorrencia) {
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

        if (recurrenceData.recorrencia.ate) {
          const dataLimite = recurrenceData.recorrencia.ate;
          const ano = dataLimite.getFullYear();
          const mes = (dataLimite.getMonth() + 1).toString().padStart(2, '0');
          const dia = dataLimite.getDate().toString().padStart(2, '0');
          rrule += `;UNTIL=${ano}${mes}${dia}`;
        } else if (recurrenceData.recorrencia.repeticoes) {
          rrule += `;COUNT=${recurrenceData.recorrencia.repeticoes}`;
        }

        updateData.recurrence = [rrule];
      }

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      await this.calendar.events.update({
        calendarId,
        eventId: eventId,
        resource: updateData,
        sendUpdates: 'none'
      });
      console.log('✅ Evento recorrente Google Calendar atualizado:', eventId);
    } catch (error) {
      console.error('Erro ao atualizar evento recorrente Google Calendar:', error);
      throw new Error('Falha ao atualizar evento recorrente no Google Calendar');
    }
  }

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

      // Adicionar limite por data ou por número de repetições
      if (recurrenceData.recorrencia.ate) {
        // Converter data limite para formato YYYYMMDD
        const dataLimite = recurrenceData.recorrencia.ate;
        const ano = dataLimite.getFullYear();
        const mes = (dataLimite.getMonth() + 1).toString().padStart(2, '0');
        const dia = dataLimite.getDate().toString().padStart(2, '0');
        rrule += `;UNTIL=${ano}${mes}${dia}`;
      } else if (recurrenceData.recorrencia.repeticoes) {
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
        reminders: {
          useDefault: false,
          overrides: [],
        },
      };

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'none'
      });

      const meetUrl = response.data.conferenceData?.entryPoints?.[0]?.uri;
      
      if (!meetUrl) {
        throw new Error('Falha ao criar link do Google Meet para evento recorrente');
      }

      console.log('✅ Evento recorrente Google Calendar criado:', {
        eventId: response.data.id,
        recurringEventId: response.data.recurringEventId,
        rrule: rrule,
        meetUrl: meetUrl
      });

      return {
        eventId: response.data.id,
        urlMeet: meetUrl
      };
    } catch (error) {
      console.error('Erro ao criar evento recorrente Google Calendar:', error);
      throw new Error('Falha na integração com Google Calendar para evento recorrente');
    }
  }

  isIntegracaoAtiva(): boolean {
    return process.env.ONLINE_ATIVO === 'true';
  }
}