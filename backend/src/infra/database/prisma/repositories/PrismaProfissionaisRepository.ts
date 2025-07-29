import { PrismaClient, Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { Profissional } from '../../../../core/domain/entities/Profissional';
import {
  ICreateProfissionalDTO,
  IProfissionaisRepository,
  IUpdateProfissionalDTO,
} from '../../../../core/domain/repositories/IProfissionaisRepository';

const profissionalInclude = {
  conselho: true,
  especialidades: { include: { especialidade: true } },
  servicos: { include: { servico: true } },
};

function toDomain(
  profissional: Prisma.ProfissionalGetPayload<{
    include: typeof profissionalInclude;
  }>
): Profissional {
  return {
    ...profissional,
    cpf: profissional.cpf ?? '',
    especialidades: profissional.especialidades.map((e) => e.especialidade),
    servicos: profissional.servicos.map((s) => ({
      ...s.servico,
      preco: s.servico.preco.toNumber(),
      percentualClinica: s.servico.percentualClinica?.toNumber() ?? null,
      percentualProfissional:
        s.servico.percentualProfissional?.toNumber() ?? null,
    })),
    conselho: profissional.conselho ?? undefined,
  };
}

const parseIds = (ids: any) => {
  if (Array.isArray(ids)) return ids;
  if (typeof ids === 'string') {
    try {
      const parsed = JSON.parse(ids);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

@injectable()
export class PrismaProfissionaisRepository implements IProfissionaisRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateProfissionalDTO): Promise<Profissional> {
    const { especialidadesIds, servicosIds, tipo_pix, ...restOfData } = data;

    const profissional = await this.prisma.profissional.create({
      data: {
        ...restOfData,
        tipo_pix,
        especialidades: {
          create: parseIds(especialidadesIds).map((id) => ({ especialidadeId: id })),
        },
        servicos: {
          create: parseIds(servicosIds).map((id) => ({ servicoId: id })),
        },
      },
      include: profissionalInclude,
    });
    return toDomain(profissional);
  }

  async findById(id: string): Promise<Profissional | null> {
    const profissional = await this.prisma.profissional.findUnique({
      where: { id },
      include: profissionalInclude,
    });
    return profissional ? toDomain(profissional) : null;
  }

  async findByCpf(cpf: string): Promise<Profissional | null> {
    const profissional = await this.prisma.profissional.findUnique({
      where: { cpf },
      include: profissionalInclude,
    });
    return profissional ? toDomain(profissional) : null;
  }

  async findByEmail(email: string): Promise<Profissional | null> {
    const profissional = await this.prisma.profissional.findUnique({
      where: { email },
      include: profissionalInclude,
    });
    return profissional ? toDomain(profissional) : null;
  }

  async findAll(): Promise<Profissional[]> {
    const profissionais = await this.prisma.profissional.findMany({
      include: profissionalInclude,
    });
    return profissionais.map(toDomain);
  }

  async update(
    id: string,
    data: IUpdateProfissionalDTO
  ): Promise<Profissional> {
    const { especialidadesIds, servicosIds, conselhoId, tipo_pix, ...restOfData } = data;

    const updateData: Prisma.ProfissionalUpdateInput = {
      ...restOfData,
      tipo_pix,
    };

    if (conselhoId) {
      updateData.conselho = { connect: { id: conselhoId } };
    }

    if (especialidadesIds) {
      updateData.especialidades = {
        deleteMany: {},
        create: especialidadesIds.map((id) => ({ especialidadeId: id })),
      };
    }

    if (servicosIds) {
      updateData.servicos = {
        deleteMany: {},
        create: servicosIds.map((id) => ({ servicoId: id })),
      };
    }

    const updatedProfissional = await this.prisma.profissional.update({
      where: { id },
      data: updateData,
      include: profissionalInclude,
    });

    return toDomain(updatedProfissional);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.profissional.delete({ where: { id } });
  }
} 