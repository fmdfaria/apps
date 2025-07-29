import { PrismaClient, Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { AdendoContrato } from '../../../../core/domain/entities/AdendoContrato';
import {
  ICreateAdendoContratoDTO,
  IAdendosContratosRepository,
  IUpdateAdendoContratoDTO,
} from '../../../../core/domain/repositories/IAdendosContratosRepository';

const includeData = {
  contrato: true,
};

function toDomain(
  adendo: Prisma.AdendoContratoGetPayload<{ include: typeof includeData }>
): AdendoContrato {
  return {
    ...adendo,
    contrato: adendo.contrato
      ? { ...adendo.contrato }
      : undefined,
  };
}

@injectable()
export class PrismaAdendosContratosRepository implements IAdendosContratosRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateAdendoContratoDTO): Promise<AdendoContrato> {
    const adendo = await this.prisma.adendoContrato.create({
      data,
      include: includeData,
    });
    return toDomain(adendo);
  }

  async update(id: string, data: IUpdateAdendoContratoDTO): Promise<AdendoContrato> {
    const adendo = await this.prisma.adendoContrato.update({
      where: { id },
      data,
      include: includeData,
    });
    return toDomain(adendo);
  }

  async findById(id: string): Promise<AdendoContrato | null> {
    const adendo = await this.prisma.adendoContrato.findUnique({
      where: { id },
      include: includeData,
    });
    return adendo ? toDomain(adendo) : null;
  }

  async findAll(filters?: { contratoId?: string }): Promise<AdendoContrato[]> {
    const adendos = await this.prisma.adendoContrato.findMany({
      where: filters,
      include: includeData,
    });
    return adendos.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.adendoContrato.delete({ where: { id } });
  }
} 