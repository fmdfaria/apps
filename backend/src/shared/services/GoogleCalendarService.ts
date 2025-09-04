import { google, calendar_v3 } from 'googleapis';
import { injectable } from 'tsyringe';
import { AppError } from '../errors/AppError';

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  calendarId: string;
  timeZone: string;
  isOnlineActive: boolean;
  eventTitleTemplate: string;
  eventDescriptionTemplate: string;
}

export interface CalendarEventData {
  agendamentoId: string;
  pacienteNome: string;
  pacienteWhatsapp?: string;
  pacienteEmail?: string;
  profissionalNome: string;
  convenioNome: string;
  servicoNome: string;
  recursoNome: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  tipoAtendimento: string;
  observacoes?: string;
}

export interface GoogleCalendarEvent {
  eventId: string;
  meetUrl?: string;
  htmlLink: string;
}

@injectable()
export class GoogleCalendarService {
  private oauth2Client: any;
  private calendar: calendar_v3.Calendar;
  private config: GoogleCalendarConfig;

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3333/auth/google/callback',
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeZone: process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo',
      isOnlineActive: process.env.ONLINE_ATIVO === 'true',
      eventTitleTemplate: process.env.GOOGLE_EVENT_TITLE_TEMPLATE || '{{servicoNome}} - {{pacienteNome}}',
      eventDescriptionTemplate: process.env.GOOGLE_EVENT_DESCRIPTION_TEMPLATE || 
        `**Atendimento:** {{tipoAtendimento}}
**Paciente:** {{pacienteNome}}
**WhatsApp:** {{pacienteWhatsapp}}
**Profissional:** {{profissionalNome}}
**Serviço:** {{servicoNome}}
**Convênio:** {{convenioNome}}
**Recurso:** {{recursoNome}}
**ID Agendamento:** {{agendamentoId}}

{{observacoes}}`
    };

    this.initializeGoogleAuth();
  }

  private initializeGoogleAuth(): void {
    if (!this.config.isOnlineActive) {
      console.log('Google Calendar integration is disabled (ONLINE_ATIVO=false)');
      return;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      console.warn('Google Calendar credentials not found. Integration will be disabled.');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    // Set credentials if refresh token is available
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
    }

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  private isServiceAvailable(): boolean {
    return this.config.isOnlineActive && !!this.oauth2Client && !!this.config.clientId;
  }

  private replaceTemplate(template: string, data: CalendarEventData): string {
    return template
      .replace(/\{\{agendamentoId\}\}/g, data.agendamentoId)
      .replace(/\{\{pacienteNome\}\}/g, data.pacienteNome)
      .replace(/\{\{pacienteWhatsapp\}\}/g, data.pacienteWhatsapp || '')
      .replace(/\{\{pacienteEmail\}\}/g, data.pacienteEmail || '')
      .replace(/\{\{profissionalNome\}\}/g, data.profissionalNome)
      .replace(/\{\{convenioNome\}\}/g, data.convenioNome)
      .replace(/\{\{servicoNome\}\}/g, data.servicoNome)
      .replace(/\{\{recursoNome\}\}/g, data.recursoNome)
      .replace(/\{\{tipoAtendimento\}\}/g, data.tipoAtendimento)
      .replace(/\{\{observacoes\}\}/g, data.observacoes || '');
  }

  private formatEventDateTime(date: Date): { dateTime: string; timeZone: string } {
    return {
      dateTime: date.toISOString(),
      timeZone: this.config.timeZone,
    };
  }

  async createCalendarEvent(eventData: CalendarEventData): Promise<GoogleCalendarEvent | null> {
    if (!this.isServiceAvailable()) {
      console.log('Google Calendar service not available for event creation');
      return null;
    }

    try {
      const title = this.replaceTemplate(this.config.eventTitleTemplate, eventData);
      const description = this.replaceTemplate(this.config.eventDescriptionTemplate, eventData);

      const event: calendar_v3.Schema$Event = {
        summary: title,
        description,
        start: this.formatEventDateTime(eventData.dataHoraInicio),
        end: this.formatEventDateTime(eventData.dataHoraFim),
        attendees: [
          ...(eventData.pacienteEmail ? [{ email: eventData.pacienteEmail }] : []),
        ],
        // Enable Google Meet for online appointments
        conferenceData: eventData.tipoAtendimento === 'online' ? {
          createRequest: {
            requestId: `meet-${eventData.agendamentoId}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        } : undefined,
      };

      const response = await this.calendar.events.insert({
        calendarId: this.config.calendarId,
        resource: event,
        conferenceDataVersion: eventData.tipoAtendimento === 'online' ? 1 : 0,
        sendUpdates: 'none', // Don't send notifications
      });

      if (!response.data.id) {
        throw new AppError('Failed to create calendar event', 500);
      }

      return {
        eventId: response.data.id,
        meetUrl: response.data.conferenceData?.entryPoints?.find(
          (entry) => entry.entryPointType === 'video'
        )?.uri,
        htmlLink: response.data.htmlLink || '',
      };
    } catch (error: any) {
      console.error('Error creating Google Calendar event:', error.message);
      
      // Don't throw error to prevent blocking appointment creation
      // Just log the error and return null
      if (error.code === 401) {
        console.error('Google Calendar authentication failed. Please refresh credentials.');
      } else if (error.code === 403) {
        console.error('Google Calendar API access denied. Check permissions.');
      }
      
      return null;
    }
  }

  async updateCalendarEvent(
    eventId: string, 
    eventData: CalendarEventData
  ): Promise<GoogleCalendarEvent | null> {
    if (!this.isServiceAvailable()) {
      console.log('Google Calendar service not available for event update');
      return null;
    }

    try {
      const title = this.replaceTemplate(this.config.eventTitleTemplate, eventData);
      const description = this.replaceTemplate(this.config.eventDescriptionTemplate, eventData);

      const event: calendar_v3.Schema$Event = {
        summary: title,
        description,
        start: this.formatEventDateTime(eventData.dataHoraInicio),
        end: this.formatEventDateTime(eventData.dataHoraFim),
        attendees: [
          ...(eventData.pacienteEmail ? [{ email: eventData.pacienteEmail }] : []),
        ],
        // Enable Google Meet for online appointments
        conferenceData: eventData.tipoAtendimento === 'online' ? {
          createRequest: {
            requestId: `meet-${eventData.agendamentoId}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        } : undefined,
      };

      const response = await this.calendar.events.update({
        calendarId: this.config.calendarId,
        eventId,
        resource: event,
        conferenceDataVersion: eventData.tipoAtendimento === 'online' ? 1 : 0,
        sendUpdates: 'none', // Don't send notifications
      });

      return {
        eventId: response.data.id || eventId,
        meetUrl: response.data.conferenceData?.entryPoints?.find(
          (entry) => entry.entryPointType === 'video'
        )?.uri,
        htmlLink: response.data.htmlLink || '',
      };
    } catch (error: any) {
      console.error('Error updating Google Calendar event:', error.message);
      
      // Don't throw error to prevent blocking appointment updates
      return null;
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<boolean> {
    if (!this.isServiceAvailable()) {
      console.log('Google Calendar service not available for event deletion');
      return false;
    }

    try {
      await this.calendar.events.delete({
        calendarId: this.config.calendarId,
        eventId,
        sendUpdates: 'none', // Don't send notifications
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting Google Calendar event:', error.message);
      
      // Don't throw error to prevent blocking appointment deletion
      return false;
    }
  }

  async createRecurringEvents(
    eventData: CalendarEventData,
    recurrence: {
      tipo: 'semanal' | 'quinzenal' | 'mensal';
      repeticoes?: number;
      ate?: Date;
    }
  ): Promise<GoogleCalendarEvent[]> {
    if (!this.isServiceAvailable()) {
      console.log('Google Calendar service not available for recurring event creation');
      return [];
    }

    const events: GoogleCalendarEvent[] = [];

    try {
      // Generate recurrence rule
      let recurrenceRule = '';
      
      switch (recurrence.tipo) {
        case 'semanal':
          recurrenceRule = 'FREQ=WEEKLY';
          break;
        case 'quinzenal':
          recurrenceRule = 'FREQ=WEEKLY;INTERVAL=2';
          break;
        case 'mensal':
          recurrenceRule = 'FREQ=MONTHLY';
          break;
      }

      if (recurrence.repeticoes) {
        recurrenceRule += `;COUNT=${recurrence.repeticoes}`;
      } else if (recurrence.ate) {
        const untilDate = recurrence.ate.toISOString().split('T')[0].replace(/-/g, '');
        recurrenceRule += `;UNTIL=${untilDate}T235959Z`;
      }

      const title = this.replaceTemplate(this.config.eventTitleTemplate, eventData);
      const description = this.replaceTemplate(this.config.eventDescriptionTemplate, eventData);

      const event: calendar_v3.Schema$Event = {
        summary: title,
        description,
        start: this.formatEventDateTime(eventData.dataHoraInicio),
        end: this.formatEventDateTime(eventData.dataHoraFim),
        recurrence: [`RRULE:${recurrenceRule}`],
        attendees: [
          ...(eventData.pacienteEmail ? [{ email: eventData.pacienteEmail }] : []),
        ],
        // Enable Google Meet for online appointments
        conferenceData: eventData.tipoAtendimento === 'online' ? {
          createRequest: {
            requestId: `meet-${eventData.agendamentoId}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        } : undefined,
      };

      const response = await this.calendar.events.insert({
        calendarId: this.config.calendarId,
        resource: event,
        conferenceDataVersion: eventData.tipoAtendimento === 'online' ? 1 : 0,
        sendUpdates: 'none', // Don't send notifications
      });

      if (response.data.id) {
        events.push({
          eventId: response.data.id,
          meetUrl: response.data.conferenceData?.entryPoints?.find(
            (entry) => entry.entryPointType === 'video'
          )?.uri,
          htmlLink: response.data.htmlLink || '',
        });
      }

      return events;
    } catch (error: any) {
      console.error('Error creating recurring Google Calendar events:', error.message);
      return [];
    }
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthUrl(): string | null {
    if (!this.oauth2Client) {
      return null;
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Handle OAuth2 callback and store tokens
   */
  async handleAuthCallback(code: string): Promise<any> {
    if (!this.oauth2Client) {
      throw new AppError('Google OAuth client not initialized', 500);
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      console.log('Google Calendar tokens obtained successfully');
      console.log('Refresh Token (store this in GOOGLE_REFRESH_TOKEN env):', tokens.refresh_token);
      
      return tokens;
    } catch (error: any) {
      console.error('Error handling Google auth callback:', error.message);
      throw new AppError('Failed to authenticate with Google Calendar', 500);
    }
  }

  /**
   * Test the Google Calendar integration
   */
  async testIntegration(): Promise<{ success: boolean; message: string }> {
    if (!this.isServiceAvailable()) {
      return {
        success: false,
        message: 'Google Calendar integration is not properly configured'
      };
    }

    try {
      // Try to list calendars to test authentication
      const response = await this.calendar.calendarList.list();
      
      const targetCalendar = response.data.items?.find(
        cal => cal.id === this.config.calendarId
      );

      if (!targetCalendar) {
        return {
          success: false,
          message: `Calendar with ID '${this.config.calendarId}' not found`
        };
      }

      return {
        success: true,
        message: `Successfully connected to calendar: ${targetCalendar.summary}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Authentication failed: ${error.message}`
      };
    }
  }

  /**
   * Get current configuration status
   */
  getConfigStatus(): {
    isConfigured: boolean;
    isOnlineActive: boolean;
    hasCredentials: boolean;
    calendarId: string;
    timeZone: string;
  } {
    return {
      isConfigured: this.isServiceAvailable(),
      isOnlineActive: this.config.isOnlineActive,
      hasCredentials: !!(this.config.clientId && this.config.clientSecret),
      calendarId: this.config.calendarId,
      timeZone: this.config.timeZone,
    };
  }
}