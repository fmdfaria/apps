import { PrismaClient, Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { DisponibilidadeProfissional } from '../../../../core/domain/entities/DisponibilidadeProfissional';
import { Profissional } from '../../../../core/domain/entities/Profissional';
import { Recurso } from '../../../../core/domain/entities/Recurso';
import {
  ICreateDisponibilidadeProfissionalDTO,
  IDisponibilidadesProfissionaisRepository,
  IUpdateDisponibilidadeProfissionalDTO,
} from '../../../../core/domain/repositories/IDisponibilidadesProfissionaisRepository';

const includeData = {
  profissional: true,
  recurso: true,
};

function toDomain(
  disponibilidade: Prisma.DisponibilidadeProfissionalGetPayload<{ include: typeof includeData }>
): DisponibilidadeProfissional {
  const domainEntity = new DisponibilidadeProfissional(
    {
      profissionalId: disponibilidade.profissionalId,
      recursoId: disponibilidade.recursoId,
      diaSemana: disponibilidade.diaSemana,
      dataEspecifica: disponibilidade.dataEspecifica,
      horaInicio: disponibilidade.horaInicio,
      horaFim: disponibilidade.horaFim,
      observacao: disponibilidade.observacao,
      tipo: disponibilidade.tipo ?? 'disponivel',
    },
    disponibilidade.id
  );

  // Set createdAt and updatedAt manually
  domainEntity.createdAt = disponibilidade.createdAt || new Date();
  domainEntity.updatedAt = disponibilidade.updatedAt || new Date();

  // Set relationship fields
  if (disponibilidade.profissional) {
    domainEntity.profissional = new Profissional(
      {
        nome: disponibilidade.profissional.nome,
        cpf: disponibilidade.profissional.cpf,
        cnpj: disponibilidade.profissional.cnpj,
        razaoSocial: disponibilidade.profissional.razaoSocial,
        email: disponibilidade.profissional.email,
        whatsapp: disponibilidade.profissional.whatsapp,
        logradouro: disponibilidade.profissional.logradouro,
        numero: disponibilidade.profissional.numero,
        complemento: disponibilidade.profissional.complemento,
        bairro: disponibilidade.profissional.bairro,
        cidade: disponibilidade.profissional.cidade,
        estado: disponibilidade.profissional.estado,
        cep: disponibilidade.profissional.cep,
        comprovanteEndereco: disponibilidade.profissional.comprovanteEndereco,
        conselhoId: disponibilidade.profissional.conselhoId,
        numeroConselho: disponibilidade.profissional.numeroConselho,
        comprovanteRegistro: disponibilidade.profissional.comprovanteRegistro,
        banco: disponibilidade.profissional.banco,
        tipoConta: disponibilidade.profissional.tipoConta,
        agencia: disponibilidade.profissional.agencia,
        contaNumero: disponibilidade.profissional.contaNumero,
        contaDigito: disponibilidade.profissional.contaDigito,
        pix: disponibilidade.profissional.pix,
        tipo_pix: disponibilidade.profissional.tipo_pix,
        comprovanteBancario: disponibilidade.profissional.comprovanteBancario,
        userId: disponibilidade.profissional.userId,
      },
      disponibilidade.profissional.id
    );
    // Set createdAt and updatedAt for profissional
    domainEntity.profissional.createdAt = disponibilidade.profissional.createdAt || new Date();
    domainEntity.profissional.updatedAt = disponibilidade.profissional.updatedAt || new Date();
  }

  if (disponibilidade.recurso) {
    domainEntity.recurso = new Recurso(
      {
        nome: disponibilidade.recurso.nome,
        descricao: disponibilidade.recurso.descricao,
      },
      disponibilidade.recurso.id
    );
    // Set createdAt and updatedAt for recurso
    domainEntity.recurso.createdAt = disponibilidade.recurso.createdAt || new Date();
    domainEntity.recurso.updatedAt = disponibilidade.recurso.updatedAt || new Date();
  } else {
    domainEntity.recurso = null;
  }

  return domainEntity;
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

  async findResourceConflict({ recursoId, diaSemana, dataEspecifica, horaInicio, horaFim, excludeId }: {
    recursoId: string;
    diaSemana?: number | null;
    dataEspecifica?: Date | null;
    horaInicio: Date;
    horaFim: Date;
    excludeId?: string;
  }): Promise<DisponibilidadeProfissional | null> {
    const where: any = {
      recursoId,
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
    
    const disponibilidade = await this.prisma.disponibilidadeProfissional.findFirst({
      where,
      include: includeData,
    });
    
    return disponibilidade ? toDomain(disponibilidade) : null;
  }
} 