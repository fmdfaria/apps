import { PrismaClient, Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { DisponibilidadeProfissional } from '../../../../core/domain/entities/DisponibilidadeProfissional';
import {
  ICreateDisponibilidadeProfissionalDTO,
  IDisponibilidadesProfissionaisRepository,
  IUpdateDisponibilidadeProfissionalDTO,
} from '../../../../core/domain/repositories/IDisponibilidadesProfissionaisRepository';

const includeData = {
  profissional: true,
};

function toDomain(
  disponibilidade: Prisma.DisponibilidadeProfissionalGetPayload<{ include: typeof includeData }>
): DisponibilidadeProfissional {
  return {
    ...disponibilidade,
    tipo: disponibilidade.tipo,
    profissional: disponibilidade.profissional
      ? { ...disponibilidade.profissional, cpf: disponibilidade.profissional.cpf ?? '' }
      : undefined,
  };
}

@injectable()
export class PrismaDisponibilidadesProfissionaisRepository implements IDisponibilidadesProfissionaisRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateDisponibilidadeProfissionalDTO): Promise<DisponibilidadeProfissional> {
    const disponibilidade = await this.prisma.disponibilidadeProfissional.create({
      data,
      include: includeData,
    });
    return toDomain(disponibilidade);
  }

  async update(id: string, data: IUpdateDisponibilidadeProfissionalDTO): Promise<DisponibilidadeProfissional> {
    const disponibilidade = await this.prisma.disponibilidadeProfissional.update({
      where: { id },
      data,
      include: includeData,
    });
    return toDomain(disponibilidade);
  }

  async findById(id: string): Promise<DisponibilidadeProfissional | null> {
    const disponibilidade = await this.prisma.disponibilidadeProfissional.findUnique({
      where: { id },
      include: includeData,
    });
    return disponibilidade ? toDomain(disponibilidade) : null;
  }

  async findAll(filters?: { profissionalId?: string; diaSemana?: number }): Promise<DisponibilidadeProfissional[]> {
    const disponibilidades = await this.prisma.disponibilidadeProfissional.findMany({
      where: filters,
      include: includeData,
    });
    return disponibilidades.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.disponibilidadeProfissional.delete({ where: { id } });
  }

  async existsOverlapping({ profissionalId, diaSemana, dataEspecifica, horaInicio, horaFim, excludeId }: {
    profissionalId: string;
    diaSemana?: number | null;
    dataEspecifica?: Date | null;
    horaInicio: Date;
    horaFim: Date;
    excludeId?: string;
  }): Promise<boolean> {
    const where: any = {
      profissionalId,
      AND: [
        excludeId ? { id: { not: excludeId } } : {},
        diaSemana !== undefined ? { diaSemana } : {},
        dataEspecifica !== undefined ? { dataEspecifica } : {},
        {
          OR: [
            {
              horaInicio: { lt: horaFim },
              horaFim: { gt: horaInicio },
            },
          ],
        },
      ],
    };
    const count = await this.prisma.disponibilidadeProfissional.count({ where });
    return count > 0;
  }
} 