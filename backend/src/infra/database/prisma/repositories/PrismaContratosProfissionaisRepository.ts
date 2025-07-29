import { PrismaClient, Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { ContratoProfissional } from '../../../../core/domain/entities/ContratoProfissional';
import {
  ICreateContratoProfissionalDTO,
  IContratosProfissionaisRepository,
  IUpdateContratoProfissionalDTO,
} from '../../../../core/domain/repositories/IContratosProfissionaisRepository';

const includeData = {
  profissional: true,
};

function toDomain(
  contrato: Prisma.ContratoProfissionalGetPayload<{ include: typeof includeData }>
): ContratoProfissional {
  return {
    ...contrato,
    profissional: contrato.profissional
      ? { ...contrato.profissional, cpf: contrato.profissional.cpf ?? '' }
      : undefined,
  };
}

@injectable()
export class PrismaContratosProfissionaisRepository implements IContratosProfissionaisRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateContratoProfissionalDTO): Promise<ContratoProfissional> {
    const contrato = await this.prisma.contratoProfissional.create({
      data,
      include: includeData,
    });
    return toDomain(contrato);
  }

  async update(id: string, data: IUpdateContratoProfissionalDTO): Promise<ContratoProfissional> {
    const contrato = await this.prisma.contratoProfissional.update({
      where: { id },
      data,
      include: includeData,
    });
    return toDomain(contrato);
  }

  async findById(id: string): Promise<ContratoProfissional | null> {
    const contrato = await this.prisma.contratoProfissional.findUnique({
      where: { id },
      include: includeData,
    });
    return contrato ? toDomain(contrato) : null;
  }

  async findAll(filters?: { profissionalId?: string }): Promise<ContratoProfissional[]> {
    const contratos = await this.prisma.contratoProfissional.findMany({
      where: filters,
      include: includeData,
    });
    return contratos.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contratoProfissional.delete({ where: { id } });
  }
} 