import { PrismaClient, Prisma } from '@prisma/client';
import {
  ICreateServicoDTO,
  IServicosRepository,
} from '../../../../core/domain/repositories/IServicosRepository';
import { Servico } from '../../../../core/domain/entities/Servico';
import { inject, injectable } from 'tsyringe';
import { Convenio } from '../../../../core/domain/entities/Convenio';

const servicoInclude = {
  convenios: {
    include: {
      convenio: true,
    },
  },
};

// Helper para converter os campos Decimal do Prisma para number e mapear relacionamentos
function toDomain(
  servico: Prisma.ServicoGetPayload<{ include: typeof servicoInclude }>
): Servico {
  return {
    ...servico,
    preco: servico.preco.toNumber(),
    percentualClinica: servico.percentualClinica?.toNumber() ?? null,
    percentualProfissional: servico.percentualProfissional?.toNumber() ?? null,
    convenios: servico.convenios.map(
      (cs) => cs.convenio as Convenio
    ),
  };
}

@injectable()
export class PrismaServicosRepository implements IServicosRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create({ conveniosIds, ...data }: ICreateServicoDTO): Promise<Servico> {
    const servico = await this.prisma.servico.create({
      data: {
        ...data,
        convenios: {
          create: conveniosIds.map((convenioId) => ({
            convenio: {
              connect: {
                id: convenioId,
              },
            },
          })),
        },
      },
      include: servicoInclude,
    });
    return toDomain(servico);
  }

  /**
   * @deprecated Use findByNameAndDuration
   */
  async findByName(nome: string): Promise<Servico | null> {
    const servico = await this.prisma.servico.findFirst({
      where: { nome },
      include: servicoInclude,
    });
    return servico ? toDomain(servico) : null;
  }

  async findByNameAndDuration(nome: string, duracaoMinutos: number): Promise<Servico | null> {
    const servico = await this.prisma.servico.findFirst({
      where: { nome, duracaoMinutos },
      include: servicoInclude,
    });
    return servico ? toDomain(servico) : null;
  }

  async findById(id: string): Promise<Servico | null> {
    const servico = await this.prisma.servico.findUnique({
      where: { id },
      include: servicoInclude,
    });
    return servico ? toDomain(servico) : null;
  }

  async findAll(): Promise<Servico[]> {
    const servicos = await this.prisma.servico.findMany({
      orderBy: { nome: 'asc' },
      include: servicoInclude,
    });
    return servicos.map(toDomain);
  }

  async save(servico: Servico): Promise<Servico> {
    const { id, conveniosIds, ...data } = servico as any;

    // Remove a propriedade 'convenios' do objeto data para evitar conflito
    delete data.convenios;

    const transactionResult = await this.prisma.$transaction([
      this.prisma.conveniosServicos.deleteMany({
        where: { servicoId: id },
      }),
      this.prisma.servico.update({
        where: { id },
        data: {
          ...data,
          convenios: {
            create: conveniosIds.map((convenioId: string) => ({
              convenio: {
                connect: { id: convenioId },
              },
            })),
          },
        },
        include: servicoInclude,
      }),
    ]);

    const updatedServico = transactionResult[1];
    return toDomain(updatedServico as any);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.servico.delete({ where: { id } });
  }
} 