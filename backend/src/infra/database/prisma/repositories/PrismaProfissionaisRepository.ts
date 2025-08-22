import { PrismaClient, Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { Profissional } from '../../../../core/domain/entities/Profissional';
import {
  ICreateProfissionalDTO,
  IProfissionaisRepository,
  IUpdateProfissionalDTO,
  ProfissionalServico,
} from '../../../../core/domain/repositories/IProfissionaisRepository';

const profissionalInclude = {
  conselho: true,
  especialidades: { include: { especialidade: true } },
  servicos: { include: { servico: true } },
};

function toMaybeNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  // Prisma Decimal has toNumber
  if (typeof value?.toNumber === 'function') return value.toNumber();
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDomain(
  profissional: Prisma.ProfissionalGetPayload<{
    include: typeof profissionalInclude;
  }>
): Profissional {
  return {
    ...profissional,
    cpf: profissional.cpf ?? '',
    ativo: (profissional as any).ativo === null ? undefined : (profissional as any).ativo,
    createdAt: (profissional as any).createdAt || new Date(),
    updatedAt: (profissional as any).updatedAt || new Date(),
    especialidades: profissional.especialidades.map((e) => ({
      ...e.especialidade,
      // Garantir tipos Date, substituindo null por data atual
      createdAt: (e.especialidade as any).createdAt || new Date(),
      updatedAt: (e.especialidade as any).updatedAt || new Date(),
    })),
    servicos: profissional.servicos.map((s) => ({
      ...s.servico,
      preco: s.servico.preco.toNumber(),
      percentualClinica: s.servico.percentualClinica?.toNumber() ?? null,
      percentualProfissional:
        s.servico.percentualProfissional?.toNumber() ?? null,
      // Converter possíveis Decimal e garantir Date
      valorClinica: toMaybeNumber((s.servico as any).valorClinica),
      valorProfissional: toMaybeNumber((s.servico as any).valorProfissional),
      ativo: (s.servico as any).ativo === null ? undefined : (s.servico as any).ativo,
      createdAt: (s.servico as any).createdAt || new Date(),
      updatedAt: (s.servico as any).updatedAt || new Date(),
    })),
    conselho: profissional.conselho
      ? {
          ...profissional.conselho,
          createdAt: (profissional.conselho as any).createdAt || new Date(),
          updatedAt: (profissional.conselho as any).updatedAt || new Date(),
        }
      : undefined,
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

  async findByUserId(userId: string): Promise<Profissional | null> {
    // Primeiro buscar o user para obter o profissionalId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profissionalId: true }
    });

    if (!user || !user.profissionalId) {
      return null;
    }

    // Depois buscar o profissional pelo ID encontrado
    const profissional = await this.prisma.profissional.findUnique({
      where: { id: user.profissionalId },
      include: profissionalInclude,
    });
    
    return profissional ? toDomain(profissional) : null;
  }

  async findAll(): Promise<Profissional[]> {
    const profissionais = await this.prisma.profissional.findMany({
      orderBy: { nome: 'asc' },
      include: profissionalInclude,
    });
    return profissionais.map(toDomain);
  }

  async findAllActive(): Promise<Profissional[]> {
    const profissionais = await this.prisma.profissional.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
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

  async listProfissionaisServicos(): Promise<ProfissionalServico[]> {
    const profissionaisServicos = await this.prisma.profissionaisServicos.findMany({
      include: {
        profissional: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            email: true,
          },
        },
        servico: {
          select: {
            id: true,
            nome: true,
            duracaoMinutos: true,
            preco: true,
            convenio: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    return profissionaisServicos.map((ps) => ({
      id: ps.id,
      profissionalId: ps.profissionalId,
      servicoId: ps.servicoId,
      profissional: ps.profissional,
      servico: {
        ...ps.servico,
        preco: Number(ps.servico.preco),
        convenio: ps.servico.convenio || { id: '', nome: '' },
      },
    }));
  }

  async listProfissionaisByServico(servicoId: string): Promise<ProfissionalServico[]> {
    const profissionaisServicos = await this.prisma.profissionaisServicos.findMany({
      where: {
        servicoId,
      },
      include: {
        profissional: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            email: true,
          },
        },
        servico: {
          select: {
            id: true,
            nome: true,
            duracaoMinutos: true,
            preco: true,
            convenio: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    return profissionaisServicos.map((ps) => ({
      id: ps.id,
      profissionalId: ps.profissionalId,
      servicoId: ps.servicoId,
      profissional: ps.profissional,
      servico: {
        ...ps.servico,
        preco: Number(ps.servico.preco),
        convenio: ps.servico.convenio || { id: '', nome: '' },
      },
    }));
  }
} 