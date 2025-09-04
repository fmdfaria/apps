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

      if (eventData.pacienteNome || eventData.servicoNome) {
        updateData.summary = `${eventData.servicoNome || 'Consulta'} - ${eventData.pacienteNome || 'Paciente'}`;
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
    } catch (error) {
      console.error('Erro ao deletar evento Google Calendar:', error);
      // Não lança erro para não quebrar o fluxo de exclusão do agendamento
    }
  }

  isIntegracaoAtiva(): boolean {
    return process.env.ONLINE_ATIVO === 'true';
  }
}