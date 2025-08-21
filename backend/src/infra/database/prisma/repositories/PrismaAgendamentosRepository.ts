import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { Agendamento } from '../../../../core/domain/entities/Agendamento';
import { IAgendamentosRepository, ICreateAgendamentoDTO, IUpdateAgendamentoDTO } from '../../../../core/domain/repositories/IAgendamentosRepository';

function toDomain(agendamento: any): Agendamento {
  return {
    ...agendamento,
    servico: agendamento.servico,
    paciente: agendamento.paciente,
    profissional: agendamento.profissional,
    recurso: agendamento.recurso,
    convenio: agendamento.convenio,
  };
}

@injectable()
export class PrismaAgendamentosRepository implements IAgendamentosRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateAgendamentoDTO): Promise<Agendamento> {
    const agendamento = await this.prisma.agendamento.create({
      data: {
        ...data,
        dataHoraInicio: data.dataHoraInicio,
        dataHoraFim: data.dataHoraFim,
      },
      include: { servico: true, paciente: true, profissional: true, recurso: true, convenio: true },
    });
    return toDomain(agendamento);
  }

  async update(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento> {
    const agendamento = await this.prisma.agendamento.update({
      where: { id },
      data: {
        ...data,
        dataHoraInicio: data.dataHoraInicio,
        dataHoraFim: data.dataHoraFim,
        avaliadoPorId: data.avaliadoPorId || undefined,
        motivoReprovacao: data.motivoReprovacao || undefined,
      },
      include: { servico: true, paciente: true, profissional: true, recurso: true, convenio: true },
    });
    return toDomain(agendamento);
  }

  async findById(id: string): Promise<Agendamento | null> {
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id },
      include: { servico: true, paciente: true, profissional: true, recurso: true, convenio: true },
    });
    return agendamento ? toDomain(agendamento) : null;
  }

  async findAll(filters?: Partial<{ profissionalId: string; pacienteId: string; dataHoraInicio: Date; dataHoraFim: Date; status: string }>): Promise<Agendamento[]> {
    const whereConditions: any = {};
    
    // Adicionar filtros básicos
    if (filters?.profissionalId) whereConditions.profissionalId = filters.profissionalId;
    if (filters?.pacienteId) whereConditions.pacienteId = filters.pacienteId;
    if (filters?.status) whereConditions.status = filters.status;
    
    // Filtros de data - se ambos dataHoraInicio e dataHoraFim forem fornecidos, usar range
    if (filters?.dataHoraInicio && filters?.dataHoraFim) {
      whereConditions.dataHoraInicio = {
        gte: filters.dataHoraInicio,
        lte: filters.dataHoraFim,
      };
    } else if (filters?.dataHoraInicio) {
      // Se apenas dataHoraInicio for fornecido, buscar apenas essa data específica
      whereConditions.dataHoraInicio = filters.dataHoraInicio;
    }

    const agendamentos = await this.prisma.agendamento.findMany({
      where: whereConditions,
      include: { servico: true, paciente: true, profissional: true, recurso: true, convenio: true },
      orderBy: { dataHoraInicio: 'asc' },
    });
    return agendamentos.map(toDomain);
  }

  async findByProfissionalAndDataHoraInicio(profissionalId: string, dataHoraInicio: Date): Promise<Agendamento | null> {
    const agendamento = await this.prisma.agendamento.findFirst({
      where: { profissionalId, dataHoraInicio },
    });
    return agendamento ? toDomain(agendamento) : null;
  }

  async findByRecursoAndDateRange(recursoId: string, dataInicio: Date, dataFim: Date): Promise<Agendamento[]> {
    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        recursoId,
        dataHoraInicio: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: { servico: true, paciente: true, profissional: true, recurso: true, convenio: true },
      orderBy: { dataHoraInicio: 'asc' },
    });
    return agendamentos.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.agendamento.delete({ where: { id } });
  }
} 