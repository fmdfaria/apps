import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, ICreateAgendamentoDTO, IRecorrenciaAgendamento } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { GoogleCalendarService } from '../../../../infra/services/GoogleCalendarService';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';
import { randomUUID } from 'crypto';

@injectable()
export class CreateAgendamentoUseCase {
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
      
      // Criar agendamento primeiro
      const agendamento = await this.agendamentosRepository.create({ ...agendamentoData, dataHoraFim });
      
      // Integrar com Google Calendar se for online e integração ativa
      if (agendamentoData.tipoAtendimento === 'online' && this.googleCalendarService.isIntegracaoAtiva()) {
        try {
          const [profissional, paciente, convenio] = await Promise.all([
            this.profissionaisRepository.findById(agendamentoData.profissionalId),
            this.pacientesRepository.findById(agendamentoData.pacienteId),
            this.conveniosRepository.findById(agendamentoData.convenioId)
          ]);

          if (profissional && paciente && convenio) {
            const googleEvent = await this.googleCalendarService.criarEventoComMeet({
              pacienteNome: paciente.nomeCompleto,
              pacienteEmail: paciente.email || undefined,
              profissionalNome: profissional.nome,
              profissionalEmail: profissional.email,
              servicoNome: servico.nome,
              convenioNome: convenio.nome,
              dataHoraInicio: new Date(agendamentoData.dataHoraInicio),
              dataHoraFim: dataHoraFim,
              agendamentoId: agendamento.id
            });

            // Atualizar agendamento com URL do Meet e Event ID
            await this.agendamentosRepository.update(agendamento.id, {
              urlMeet: googleEvent.urlMeet,
              googleEventId: googleEvent.eventId
            });

            // Retornar agendamento atualizado com URL
            return await this.agendamentosRepository.findById(agendamento.id) || agendamento;
          }
        } catch (error) {
          console.error('Erro na integração Google Calendar:', error);
          // Continua sem falhar o agendamento
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
    
    // Gerar um série_id único para todos os agendamentos da série
    const serieId = randomUUID();
    
    // Criar todos os agendamentos primeiro
    for (let i = 0; i < datas.length; i++) {
      const dataHoraInicio = datas[i];
      const dataHoraFim = new Date(dataHoraInicio.getTime() + servico.duracaoMinutos * 60000);
      
      // Preparar dados com os novos campos da série
      const agendamentoData = {
        ...baseData,
        dataHoraInicio,
        dataHoraFim,
        serieId: serieId,
        serieMaster: i === 0, // Primeiro agendamento é o master
        instanciaData: dataHoraInicio.toISOString().split('T')[0] // Data no formato YYYY-MM-DD
      };
      
      const agendamento = await this.agendamentosRepository.create(agendamentoData);
      agendamentosCriados.push(agendamento);
    }

    // Integrar com Google Calendar - criar UM evento recorrente para toda a série
    if (baseData.tipoAtendimento === 'online' && this.googleCalendarService.isIntegracaoAtiva()) {
      console.log('🔍 Recorrente: Criando evento recorrente no Google Calendar');
      try {
        const [profissional, paciente, convenio] = await Promise.all([
          this.profissionaisRepository.findById(baseData.profissionalId),
          this.pacientesRepository.findById(baseData.pacienteId),
          this.conveniosRepository.findById(baseData.convenioId)
        ]);

        if (profissional && paciente && convenio) {
          const primeiroAgendamento = agendamentosCriados[0];
          const dataHoraFimPrimeiro = new Date(primeiroAgendamento.dataHoraInicio.getTime() + servico.duracaoMinutos * 60000);

          const googleEvent = await this.googleCalendarService.criarEventoRecorrenteComMeet({
            pacienteNome: paciente.nomeCompleto,
            pacienteEmail: paciente.email || undefined,
            profissionalNome: profissional.nome,
            profissionalEmail: profissional.email,
            servicoNome: servico.nome,
            convenioNome: convenio.nome,
            dataHoraInicio: primeiroAgendamento.dataHoraInicio,
            dataHoraFim: dataHoraFimPrimeiro,
            agendamentoId: primeiroAgendamento.id,
            recorrencia: recorrencia
          });

          console.log('📝 Atualizando TODOS os agendamentos da série com dados do Google Calendar');

          // Atualizar TODOS os agendamentos da série com o mesmo urlMeet e googleEventId
          // Todos compartilham o mesmo evento recorrente do Google Calendar
          for (let i = 0; i < agendamentosCriados.length; i++) {
            await this.agendamentosRepository.update(agendamentosCriados[i].id, {
              urlMeet: googleEvent.urlMeet,
              googleEventId: googleEvent.eventId
            });

            // Buscar agendamento atualizado
            const agendamentoAtualizado = await this.agendamentosRepository.findById(agendamentosCriados[i].id);
            if (agendamentoAtualizado) {
              agendamentosCriados[i] = agendamentoAtualizado;
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro na integração Google Calendar para série recorrente:', error);
        // Continua sem falhar - agendamentos já foram criados
      }
    }
    return agendamentosCriados;
  }
} 