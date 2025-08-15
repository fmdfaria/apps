import { Prisma, PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { PrecosServicosProfissionais } from '../../../../core/domain/entities/PrecosServicosProfissionais';
import {
  ICreatePrecoServicoProfissionalDTO,
  IPrecosServicosProfissionaisRepository,
  IUpdatePrecoServicoProfissionalDTO,
} from '../../../../core/domain/repositories/IPrecosServicosProfissionaisRepository';

const includeData = {
  profissional: true,
  servico: true,
};

function toDomain(
  preco: Prisma.PrecosServicosProfissionaisGetPayload<{
    include: typeof includeData;
  }>
): PrecosServicosProfissionais {
  return {
    ...preco,
    precoProfissional: preco.precoProfissional
      ? preco.precoProfissional.toNumber()
      : null,
    precoClinica: preco.precoClinica ? preco.precoClinica.toNumber() : null,
    percentualClinica: preco.percentualClinica ? preco.percentualClinica.toNumber() : null,
    percentualProfissional: preco.percentualProfissional ? preco.percentualProfissional.toNumber() : null,
    profissional: preco.profissional
      ? {
          ...preco.profissional,
          cpf: preco.profissional.cpf ?? '',
        }
      : undefined,
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
export class PrismaPrecosServicosProfissionaisRepository
  implements IPrecosServicosProfissionaisRepository
{
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(
    data: ICreatePrecoServicoProfissionalDTO
  ): Promise<PrecosServicosProfissionais> {
    const preco = await this.prisma.precosServicosProfissionais.create({
      data,
      include: includeData,
    });
    return toDomain(preco);
  }

  async update(
    id: string,
    data: IUpdatePrecoServicoProfissionalDTO
  ): Promise<PrecosServicosProfissionais> {
    const preco = await this.prisma.precosServicosProfissionais.update({
      where: { id },
      data,
      include: includeData,
    });
    return toDomain(preco);
  }

  async findById(id: string): Promise<PrecosServicosProfissionais | null> {
    const preco = await this.prisma.precosServicosProfissionais.findUnique({
      where: { id },
      include: includeData,
    });
    return preco ? toDomain(preco) : null;
  }

  async findByProfissionalAndServico(
    profissionalId: string,
    servicoId: string
  ): Promise<PrecosServicosProfissionais | null> {
    const preco = await this.prisma.precosServicosProfissionais.findUnique({
      where: {
        profissionalId_servicoId: {
          profissionalId,
          servicoId,
        },
      },
      include: includeData,
    });
    return preco ? toDomain(preco) : null;
  }

  async findAll(filters: {
    profissionalId?: string;
    servicoId?: string;
  }): Promise<PrecosServicosProfissionais[]> {
    const precos = await this.prisma.precosServicosProfissionais.findMany({
      where: filters,
      include: includeData,
    });
    return precos.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.precosServicosProfissionais.delete({
      where: { id },
    });
  }
} 