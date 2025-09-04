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

  async deletarOcorrenciaEspecifica(eventId: string, dataOcorrencia: Date): Promise<void> {
    try {
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // Buscar o evento recorrente original
      const eventoOriginal = await this.calendar.events.get({
        calendarId,
        eventId: eventId
      });

      if (!eventoOriginal.data.recurrence) {
        // Se não é recorrente, deletar normalmente
        await this.deletarEvento(eventId);
        return;
      }

      // Criar um evento "fantasma" para a data específica que queremos excluir
      // Isso funciona criando uma instância com status "cancelled"
      const instanciaExcluida = {
        summary: eventoOriginal.data.summary,
        start: {
          dateTime: dataOcorrencia.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: new Date(dataOcorrencia.getTime() + 60 * 60 * 1000).toISOString(), // +1 hora default
          timeZone: timezone,
        },
        recurringEventId: eventId,
        originalStartTime: {
          dateTime: dataOcorrencia.toISOString(),
          timeZone: timezone
        },
        status: 'cancelled'
      };

      await this.calendar.events.insert({
        calendarId,
        resource: instanciaExcluida,
        sendUpdates: 'none'
      });

      console.log('✅ Ocorrência específica excluída do Google Calendar:', {
        eventoRecorrente: eventId,
        dataExcluida: dataOcorrencia.toISOString()
      });
    } catch (error) {
      console.error('Erro ao excluir ocorrência específica:', error);
      // Não lança erro para não quebrar o fluxo
    }
  }

  async deletarSerieAPartirDe(eventId: string, dataInicio: Date): Promise<void> {
    try {
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // Buscar o evento recorrente original
      const eventoOriginal = await this.calendar.events.get({
        calendarId,
        eventId: eventId
      });

      if (!eventoOriginal.data.recurrence) {
        // Se não é recorrente, deletar normalmente
        await this.deletarEvento(eventId);
        return;
      }

      // Terminar a série original antes da data de início
      const dataLimiteOriginal = new Date(dataInicio);
      dataLimiteOriginal.setDate(dataLimiteOriginal.getDate() - 1);
      
      const ano = dataLimiteOriginal.getFullYear();
      const mes = (dataLimiteOriginal.getMonth() + 1).toString().padStart(2, '0');
      const dia = dataLimiteOriginal.getDate().toString().padStart(2, '0');
      
      // Atualizar o evento original para terminar antes da nova data
      const rruleOriginal = eventoOriginal.data.recurrence[0].split(';');
      const novaRRuleOriginal = rruleOriginal.filter((part: string) => !part.startsWith('UNTIL') && !part.startsWith('COUNT'));
      novaRRuleOriginal.push(`UNTIL=${ano}${mes}${dia}`);

      await this.calendar.events.update({
        calendarId,
        eventId: eventId,
        resource: {
          recurrence: [novaRRuleOriginal.join(';')]
        },
        sendUpdates: 'none'
      });

      console.log('✅ Série Google Calendar terminada a partir de data específica:', {
        eventoOriginal: eventId,
        dataTermino: dataLimiteOriginal.toISOString()
      });
    } catch (error) {
      console.error('Erro ao deletar série a partir de data:', error);
      // Não lança erro para não quebrar o fluxo
    }
  }

  async editarOcorrenciaEspecifica(eventId: string, dataOcorrencia: Date, eventData: Partial<EventData>): Promise<string> {
    try {
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // Primeiro, buscar o evento recorrente original
      const eventoOriginal = await this.calendar.events.get({
        calendarId,
        eventId: eventId
      });

      if (!eventoOriginal.data.recurrence) {
        throw new Error('Evento não é recorrente');
      }

      // Criar uma nova instância para a data específica
      const novaInstancia = {
        summary: eventData.pacienteNome && eventData.servicoNome ? 
          this.formatarTitulo(eventData as EventData) : eventoOriginal.data.summary,
        description: eventData.pacienteNome && eventData.profissionalNome && 
          eventData.servicoNome && eventData.convenioNome ?
          this.formatarDescricao(eventData as EventData) : eventoOriginal.data.description,
        start: {
          dateTime: eventData.dataHoraInicio?.toISOString() || eventoOriginal.data.start?.dateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: eventData.dataHoraFim?.toISOString() || eventoOriginal.data.end?.dateTime,
          timeZone: timezone,
        },
        attendees: eventoOriginal.data.attendees,
        conferenceData: eventoOriginal.data.conferenceData,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
        reminders: eventoOriginal.data.reminders,
        // Importante: referenciar o evento pai e a data original
        recurringEventId: eventId,
        originalStartTime: {
          dateTime: dataOcorrencia.toISOString(),
          timeZone: timezone
        }
      };

      // Criar a nova instância (sobrescreve a ocorrência original)
      const response = await this.calendar.events.insert({
        calendarId,
        resource: novaInstancia,
        conferenceDataVersion: 1,
        sendUpdates: 'none'
      });

      console.log('✅ Ocorrência específica editada:', {
        novoEventId: response.data.id,
        eventoRecorrentePai: eventId,
        dataOcorrencia: dataOcorrencia.toISOString()
      });

      return response.data.id; // ID da nova instância
    } catch (error) {
      console.error('Erro ao editar ocorrência específica:', error);
      throw new Error('Falha ao editar ocorrência específica no Google Calendar');
    }
  }

  async editarSerieAPartirDe(eventId: string, dataInicio: Date, recurrenceData: Partial<RecurrenceData>): Promise<string> {
    try {
      const timezone = process.env.GOOGLE_TIMEZONE || 'America/Sao_Paulo';
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // Primeiro, buscar o evento recorrente original
      const eventoOriginal = await this.calendar.events.get({
        calendarId,
        eventId: eventId
      });

      if (!eventoOriginal.data.recurrence) {
        throw new Error('Evento não é recorrente');
      }

      // 1. Terminar a série original antes da data de início da nova série
      const dataLimiteOriginal = new Date(dataInicio);
      dataLimiteOriginal.setDate(dataLimiteOriginal.getDate() - 1);
      
      const ano = dataLimiteOriginal.getFullYear();
      const mes = (dataLimiteOriginal.getMonth() + 1).toString().padStart(2, '0');
      const dia = dataLimiteOriginal.getDate().toString().padStart(2, '0');
      
      // Atualizar o evento original para terminar antes da nova data
      const rruleOriginal = eventoOriginal.data.recurrence[0].split(';');
      const novaRRuleOriginal = rruleOriginal.filter((part: string) => !part.startsWith('UNTIL') && !part.startsWith('COUNT'));
      novaRRuleOriginal.push(`UNTIL=${ano}${mes}${dia}`);

      console.log('🔧 Debug - Terminando série original:', {
        eventoOriginal: eventId,
        dataLimite: `${ano}${mes}${dia}`,
        rruleOriginal: eventoOriginal.data.recurrence[0],
        novaRRuleOriginal: novaRRuleOriginal.join(';')
      });

      await this.calendar.events.update({
        calendarId,
        eventId: eventId,
        resource: {
          recurrence: [novaRRuleOriginal.join(';')]
        },
        sendUpdates: 'none'
      });

      // 2. Criar uma nova série a partir da data especificada
      let rrule = '';
      if (recurrenceData.recorrencia) {
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
          const anoLimite = dataLimite.getFullYear();
          const mesLimite = (dataLimite.getMonth() + 1).toString().padStart(2, '0');
          const diaLimite = dataLimite.getDate().toString().padStart(2, '0');
          rrule += `;UNTIL=${anoLimite}${mesLimite}${diaLimite}`;
        } else if (recurrenceData.recorrencia.repeticoes) {
          rrule += `;COUNT=${recurrenceData.recorrencia.repeticoes}`;
        }
      }

      // FIX: Usar a nova data/hora fornecida para a nova série, não a do evento original
      let startDateTime: string;
      let endDateTime: string;

      if (recurrenceData.dataHoraInicio && recurrenceData.dataHoraFim) {
        // Usar as novas datas fornecidas
        startDateTime = recurrenceData.dataHoraInicio.toISOString();
        endDateTime = recurrenceData.dataHoraFim.toISOString();
      } else {
        // Fallback: usar horário do evento original mas na nova data
        const eventoStart = new Date(eventoOriginal.data.start?.dateTime || eventoOriginal.data.start?.date);
        const eventoEnd = new Date(eventoOriginal.data.end?.dateTime || eventoOriginal.data.end?.date);
        
        // Preservar apenas o horário do evento original, aplicando na nova data
        const novaDataHora = new Date(dataInicio);
        novaDataHora.setHours(eventoStart.getHours(), eventoStart.getMinutes(), eventoStart.getSeconds(), eventoStart.getMilliseconds());
        
        const novaDataFim = new Date(dataInicio);
        novaDataFim.setHours(eventoEnd.getHours(), eventoEnd.getMinutes(), eventoEnd.getSeconds(), eventoEnd.getMilliseconds());
        
        startDateTime = novaDataHora.toISOString();
        endDateTime = novaDataFim.toISOString();
      }

      // Validar se as datas estão corretas
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(`Datas inválidas: start=${startDateTime}, end=${endDateTime}`);
      }
      
      if (startDate >= endDate) {
        throw new Error(`Data de início deve ser anterior à data de fim: start=${startDateTime}, end=${endDateTime}`);
      }

      console.log('🔧 Debug - Criando nova série (FIXED):', {
        dataInicio: dataInicio.toISOString(),
        startDateTime,
        endDateTime,
        rrule,
        eventoOriginalStart: eventoOriginal.data.start,
        eventoOriginalEnd: eventoOriginal.data.end,
        recorrenciaFornecida: recurrenceData.recorrencia
      });

      const novaSerie = {
        summary: recurrenceData.pacienteNome && recurrenceData.servicoNome ? 
          this.formatarTitulo(recurrenceData as EventData) : eventoOriginal.data.summary,
        description: recurrenceData.pacienteNome && recurrenceData.profissionalNome && 
          recurrenceData.servicoNome && recurrenceData.convenioNome ?
          this.formatarDescricao(recurrenceData as EventData) : eventoOriginal.data.description,
        start: {
          dateTime: startDateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone,
        },
        recurrence: rrule ? [rrule] : undefined, // Só incluir recurrence se rrule não estiver vazio
        attendees: eventoOriginal.data.attendees,
        conferenceData: eventoOriginal.data.conferenceData,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: true,
        reminders: eventoOriginal.data.reminders,
      };

      console.log('🔧 Debug - Objeto novaSerie completo:', {
        novaSerie: JSON.stringify(novaSerie, null, 2)
      });

      const response = await this.calendar.events.insert({
        calendarId,
        resource: novaSerie,
        conferenceDataVersion: 1,
        sendUpdates: 'none'
      });

      console.log('✅ Nova série criada a partir de data específica:', {
        novoEventId: response.data.id,
        eventoOriginalTerminado: eventId,
        dataInicio: dataInicio.toISOString()
      });

      return response.data.id; // ID da nova série
    } catch (error) {
      console.error('Erro ao editar série a partir de data:', error);
      throw new Error('Falha ao editar série a partir de data específica no Google Calendar');
    }
  }

  async editarTodaASerie(eventId: string, eventData: Partial<EventData>): Promise<void> {
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
        eventId: eventId,
        resource: updateData,
        sendUpdates: 'none'
      });
      
      console.log('✅ Toda a série Google Calendar atualizada:', eventId);
    } catch (error) {
      console.error('Erro ao atualizar toda a série Google Calendar:', error);
      throw new Error('Falha ao atualizar toda a série no Google Calendar');
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