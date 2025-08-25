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
    let atual = new Date(baseData.dataHoraInicio);
    let count = 0;
    const maxRepeticoes = recorrencia?.repeticoes ?? 100; // Limite de segurança
    const dataLimite = recorrencia?.ate ? new Date(recorrencia.ate) : undefined;
    while (true) {
      if (dataLimite && atual > dataLimite) break;
      if (recorrencia?.repeticoes && count >= recorrencia.repeticoes) break;
      datas.push(new Date(atual));
      count++;
      if (recorrencia?.tipo === 'semanal') {
        atual.setDate(atual.getDate() + 7);
      } else if (recorrencia?.tipo === 'quinzenal') {
        atual.setDate(atual.getDate() + 14);
      } else if (recorrencia?.tipo === 'mensal') {
        atual.setMonth(atual.getMonth() + 1);
      }
      if (count >= maxRepeticoes) break;
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
      // Recurso (buscar todos na data e filtrar pelo recursoId)
      const resultPaginado = await this.agendamentosRepository.findAll({ dataHoraInicio });
      const agendamentosMesmoHorario = resultPaginado.data;
      const conflitoRecurso = agendamentosMesmoHorario.find(a => a.recursoId === baseData.recursoId);
      if (conflitoRecurso) {
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