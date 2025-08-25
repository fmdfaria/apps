import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, ICreateAgendamentoDTO, IRecorrenciaAgendamento } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

@injectable()
export class CreateAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute(data: Omit<ICreateAgendamentoDTO, 'dataHoraFim'>): Promise<Agendamento | Agendamento[]> {
    // Define status default como 'AGENDADO' se não for fornecido
    const agendamentoData = {
      ...data,
      status: data.status || 'AGENDADO'
    };

    // Se não for recorrente, segue fluxo normal
    if (!agendamentoData.recorrencia) {
      const existente = await this.agendamentosRepository.findByProfissionalAndDataHoraInicio(
        agendamentoData.profissionalId,
        agendamentoData.dataHoraInicio
      );
      if (existente) {
        throw new AppError('Já existe um agendamento para este profissional neste horário.', 400);
      }
      // Buscar duração do serviço
      const servico = await this.servicosRepository.findById(agendamentoData.servicoId);
      if (!servico) {
        throw new AppError('Serviço não encontrado.', 404);
      }
      const dataHoraFim = new Date(new Date(agendamentoData.dataHoraInicio).getTime() + servico.duracaoMinutos * 60000);
      return this.agendamentosRepository.create({ ...agendamentoData, dataHoraFim });
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
    // Verificar conflitos para todas as datas
    for (const dataHoraInicio of datas) {
      // Profissional
      const existeProf = await this.agendamentosRepository.findByProfissionalAndDataHoraInicio(
        baseData.profissionalId,
        dataHoraInicio
      );
      if (existeProf) {
        throw new AppError(`Conflito de agendamento para o profissional em ${dataHoraInicio.toISOString()}`);
      }
      // Recurso (buscar agendamentos no mesmo horário usando range de data)
      const dataInicio = new Date(dataHoraInicio);
      const dataFim = new Date(dataHoraInicio.getTime() + 30 * 60000); // 30 minutos depois
      const agendamentosConflito = await this.agendamentosRepository.findByRecursoAndDateRange(
        baseData.recursoId,
        dataInicio,
        dataFim
      );
      if (agendamentosConflito.length > 0) {
        throw new AppError(`Conflito de agendamento para o recurso em ${dataHoraInicio.toISOString()}`);
      }
    }
    // Se não houver conflitos, criar todos
    const agendamentosCriados: Agendamento[] = [];
    for (const dataHoraInicio of datas) {
      const dataHoraFim = new Date(dataHoraInicio.getTime() + servico.duracaoMinutos * 60000);
      const agendamento = await this.agendamentosRepository.create({ ...baseData, dataHoraInicio, dataHoraFim });
      agendamentosCriados.push(agendamento);
    }
    return agendamentosCriados;
  }
} 