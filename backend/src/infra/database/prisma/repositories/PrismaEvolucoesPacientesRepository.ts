import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { EvolucaoPaciente } from '../../../../core/domain/entities/EvolucaoPaciente';
import { IEvolucoesPacientesRepository, ICreateEvolucaoPacienteDTO, IUpdateEvolucaoPacienteDTO } from '../../../../core/domain/repositories/IEvolucoesPacientesRepository';

function toDomain(evolucao: any): EvolucaoPaciente {
  return {
    ...evolucao,
  };
}

@injectable()
export class PrismaEvolucoesPacientesRepository implements IEvolucoesPacientesRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateEvolucaoPacienteDTO): Promise<EvolucaoPaciente> {
    const evolucao = await this.prisma.evolucaoPaciente.create({ data });
    return toDomain(evolucao);
  }

  async update(id: string, data: IUpdateEvolucaoPacienteDTO): Promise<EvolucaoPaciente> {
    const evolucao = await this.prisma.evolucaoPaciente.update({ where: { id }, data });
    return toDomain(evolucao);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.evolucaoPaciente.delete({ where: { id } });
  }

  async findById(id: string): Promise<EvolucaoPaciente | null> {
    const evolucao = await this.prisma.evolucaoPaciente.findUnique({ 
      where: { id },
      include: {
        profissional: {
          select: {
            id: true,
            nome: true
          }
        },
        agendamento: {
          select: {
            id: true,
            dataHoraInicio: true
          }
        }
      }
    });
    if (!evolucao) return null;
    
    return {
      ...evolucao,
      profissionalNome: evolucao.profissional?.nome,
      agendamentoData: evolucao.agendamento?.dataHoraInicio
    } as any;
  }

  async findAllByPaciente(pacienteId: string): Promise<EvolucaoPaciente[]> {
    const evolucoes = await this.prisma.evolucaoPaciente.findMany({
      where: { pacienteId },
      include: {
        profissional: {
          select: {
            id: true,
            nome: true
          }
        },
        agendamento: {
          select: {
            id: true,
            dataHoraInicio: true
          }
        }
      },
      orderBy: { dataEvolucao: 'desc' },
    });
    return evolucoes.map((evolucao: any) => ({
      ...evolucao,
      profissionalNome: evolucao.profissional?.nome,
      agendamentoData: evolucao.agendamento?.dataHoraInicio
    }));
  }

  async findByAgendamento(agendamentoId: string): Promise<EvolucaoPaciente | null> {
    const evolucao = await this.prisma.evolucaoPaciente.findFirst({
      where: { agendamentoId },
      include: {
        profissional: {
          select: {
            id: true,
            nome: true
          }
        },
        agendamento: {
          select: {
            id: true,
            dataHoraInicio: true
          }
        }
      }
    });
    if (!evolucao) return null;
    
    return {
      ...evolucao,
      profissionalNome: evolucao.profissional?.nome,
      agendamentoData: evolucao.agendamento?.dataHoraInicio
    } as any;
  }

  async getStatusByAgendamentos(agendamentoIds: string[]): Promise<Array<{ agendamentoId: string; temEvolucao: boolean }>> {
    if (agendamentoIds.length === 0) return [];

    const evolucoes = await this.prisma.evolucaoPaciente.findMany({
      where: {
        agendamentoId: { in: agendamentoIds }
      },
      select: {
        agendamentoId: true
      }
    });

    // Criar set dos agendamentos que têm evolução
    const agendamentosComEvolucao = new Set(evolucoes.map(e => e.agendamentoId).filter(Boolean));

    // Retornar status para todos os agendamentos solicitados
    return agendamentoIds.map(agendamentoId => ({
      agendamentoId,
      temEvolucao: agendamentosComEvolucao.has(agendamentoId)
    }));
  }
} 