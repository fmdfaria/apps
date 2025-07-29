import { Prisma, PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { PrecosParticulares } from '../../../../core/domain/entities/PrecosParticulares';
import {
  ICreatePrecoParticularDTO,
  IPrecosParticularesRepository,
  IUpdatePrecoParticularDTO,
} from '../../../../core/domain/repositories/IPrecosParticularesRepository';

const includeData = {
  paciente: true,
  servico: true,
};

function toDomain(
  preco: Prisma.PrecosParticularesGetPayload<{
    include: typeof includeData;
  }>
): PrecosParticulares {
  return {
    ...preco,
    preco: preco.preco.toNumber(),
    servico: preco.servico
      ? {
          ...preco.servico,
          preco: preco.servico.preco.toNumber(),
          percentualClinica:
            preco.servico.percentualClinica?.toNumber() ?? null,
          percentualProfissional:
            preco.servico.percentualProfissional?.toNumber() ?? null,
        }
      : undefined,
  };
}

@injectable()
export class PrismaPrecosParticularesRepository
  implements IPrecosParticularesRepository
{
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreatePrecoParticularDTO): Promise<PrecosParticulares> {
    const preco = await this.prisma.precosParticulares.create({
      data,
      include: includeData,
    });
    return toDomain(preco);
  }

  async update(
    id: string,
    data: IUpdatePrecoParticularDTO
  ): Promise<PrecosParticulares> {
    const preco = await this.prisma.precosParticulares.update({
      where: { id },
      data,
      include: includeData,
    });
    return toDomain(preco);
  }

  async findById(id: string): Promise<PrecosParticulares | null> {
    const preco = await this.prisma.precosParticulares.findUnique({
      where: { id },
      include: includeData,
    });
    return preco ? toDomain(preco) : null;
  }

  async findByPacienteAndServico(
    pacienteId: string,
    servicoId: string
  ): Promise<PrecosParticulares | null> {
    const preco = await this.prisma.precosParticulares.findUnique({
      where: {
        pacienteId_servicoId: {
          pacienteId,
          servicoId,
        },
      },
      include: includeData,
    });
    return preco ? toDomain(preco) : null;
  }

  async findAll(filters: {
    pacienteId?: string;
    servicoId?: string;
  }): Promise<PrecosParticulares[]> {
    const precos = await this.prisma.precosParticulares.findMany({
      where: filters,
      include: includeData,
    });
    return precos.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.precosParticulares.delete({
      where: { id },
    });
  }
} 