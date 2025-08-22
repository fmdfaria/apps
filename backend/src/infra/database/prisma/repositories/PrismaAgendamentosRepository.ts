import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { Agendamento } from '../../../../core/domain/entities/Agendamento';
import { IAgendamentosRepository, ICreateAgendamentoDTO, IUpdateAgendamentoDTO, IAgendamentoFilters, IPaginatedResponse } from '../../../../core/domain/repositories/IAgendamentosRepository';

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

  async findAll(filters?: IAgendamentoFilters): Promise<IPaginatedResponse<Agendamento>> {
    // Valores padrão para paginação
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 10, 100); // Máximo 100
    const skip = (page - 1) * limit;
    const orderBy = filters?.orderBy || 'dataHoraInicio';
    const orderDirection = filters?.orderDirection || 'asc';

    const whereConditions: any = {};
    
    // Filtros básicos
    if (filters?.profissionalId) whereConditions.profissionalId = filters.profissionalId;
    if (filters?.pacienteId) whereConditions.pacienteId = filters.pacienteId;
    if (filters?.status) whereConditions.status = filters.status;
    if (filters?.recursoId) whereConditions.recursoId = filters.recursoId;
    if (filters?.convenioId) whereConditions.convenioId = filters.convenioId;
    if (filters?.servicoId) whereConditions.servicoId = filters.servicoId;
    if (filters?.tipoAtendimento) whereConditions.tipoAtendimento = filters.tipoAtendimento;
    
    // Filtros de data - range
    if (filters?.dataInicio || filters?.dataFim) {
      whereConditions.dataHoraInicio = {};
      if (filters.dataInicio) {
        whereConditions.dataHoraInicio.gte = filters.dataInicio;
      }
      if (filters.dataFim) {
        // Para dataFim, incluir todo o dia (até 23:59:59)
        const endOfDay = new Date(filters.dataFim);
        endOfDay.setHours(23, 59, 59, 999);
        whereConditions.dataHoraInicio.lte = endOfDay;
      }
    }

    // Executar consultas em paralelo
    const [agendamentos, total] = await Promise.all([
      this.prisma.agendamento.findMany({
        where: whereConditions,
        include: { servico: true, paciente: true, profissional: true, recurso: true, convenio: true },
        orderBy: { [orderBy]: orderDirection },
        skip,
        take: limit,
      }),
      this.prisma.agendamento.count({
        where: whereConditions,
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: agendamentos.map(toDomain),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
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