import { PrismaClient } from '@prisma/client';
import { Banco } from '../../../../core/domain/entities/Banco';
import { IBancosRepository } from '../../../../core/domain/repositories/IBancosRepository';
import { inject, injectable } from 'tsyringe';

@injectable()
export class PrismaBancosRepository implements IBancosRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: Omit<Banco, 'id'>): Promise<Banco> {
    const banco = await this.prisma.banco.create({
      data: {
        codigo: data.codigo,
        nome: data.nome
      }
    });

    return {
      id: banco.id,
      codigo: banco.codigo,
      nome: banco.nome
    };
  }

  async findById(id: string): Promise<Banco | null> {
    const banco = await this.prisma.banco.findUnique({
      where: { id }
    });

    if (!banco) {
      return null;
    }

    return {
      id: banco.id,
      codigo: banco.codigo,
      nome: banco.nome
    };
  }

  async findAll(): Promise<Banco[]> {
    const bancos = await this.prisma.banco.findMany({
      orderBy: {
        nome: 'asc'
      }
    });

    return bancos.map((banco: any) => ({
      id: banco.id,
      codigo: banco.codigo,
      nome: banco.nome
    }));
  }

  async update(id: string, data: Partial<Omit<Banco, 'id'>>): Promise<Banco> {
    const banco = await this.prisma.banco.update({
      where: { id },
      data: {
        ...(data.codigo && { codigo: data.codigo }),
        ...(data.nome && { nome: data.nome })
      }
    });

    return {
      id: banco.id,
      codigo: banco.codigo,
      nome: banco.nome
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.banco.delete({
      where: { id }
    });
  }

  async findByCodigo(codigo: string): Promise<Banco | null> {
    const banco = await this.prisma.banco.findFirst({
      where: { codigo }
    });

    if (!banco) {
      return null;
    }

    return {
      id: banco.id,
      codigo: banco.codigo,
      nome: banco.nome
    };
  }
}