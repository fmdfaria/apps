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
    const evolucao = await this.prisma.evolucaoPaciente.findUnique({ where: { id } });
    return evolucao ? toDomain(evolucao) : null;
  }

  async findAllByPaciente(pacienteId: string): Promise<EvolucaoPaciente[]> {
    const evolucoes = await this.prisma.evolucaoPaciente.findMany({
      where: { pacienteId },
      orderBy: { dataEvolucao: 'desc' },
    });
    return evolucoes.map(toDomain);
  }
} 