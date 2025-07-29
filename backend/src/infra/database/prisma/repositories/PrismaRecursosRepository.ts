import { PrismaClient } from '@prisma/client';
import {
  ICreateRecursoDTO,
  IRecursosRepository,
} from '../../../../core/domain/repositories/IRecursosRepository';
import { Recurso } from '../../../../core/domain/entities/Recurso';
import { inject, injectable } from 'tsyringe';

@injectable()
export class PrismaRecursosRepository implements IRecursosRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create({ nome, descricao }: ICreateRecursoDTO): Promise<Recurso> {
    const recurso = await this.prisma.recurso.create({
      data: {
        nome,
        descricao,
      },
    });

    return recurso;
  }

  async findByName(nome: string): Promise<Recurso | null> {
    const recurso = await this.prisma.recurso.findFirst({
      where: {
        nome: {
          equals: nome,
          mode: 'insensitive',
        },
      },
    });

    return recurso;
  }

  async findById(id: string): Promise<Recurso | null> {
    const recurso = await this.prisma.recurso.findUnique({
      where: {
        id,
      },
    });

    return recurso;
  }

  async findAll(): Promise<Recurso[]> {
    const recursos = await this.prisma.recurso.findMany();
    return recursos;
  }

  async save(recurso: Recurso): Promise<Recurso> {
    const updatedRecurso = await this.prisma.recurso.update({
      where: {
        id: recurso.id,
      },
      data: {
        nome: recurso.nome,
        descricao: recurso.descricao,
      },
    });

    return updatedRecurso;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recurso.delete({
      where: {
        id,
      },
    });
  }
} 