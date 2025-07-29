import { PrismaClient } from '@prisma/client';
import { ConselhoProfissional } from '../../../../core/domain/entities/ConselhoProfissional';
import {
  ICreateConselhoProfissionalDTO,
  IConselhosProfissionaisRepository,
} from '../../../../core/domain/repositories/IConselhosProfissionaisRepository';
import { inject, injectable } from 'tsyringe';

@injectable()
export class PrismaConselhosProfissionaisRepository
  implements IConselhosProfissionaisRepository
{
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateConselhoProfissionalDTO): Promise<ConselhoProfissional> {
    const conselho = await this.prisma.conselhoProfissional.create({
      data,
    });
    return conselho as ConselhoProfissional;
  }

  async findBySigla(sigla: string): Promise<ConselhoProfissional | null> {
    const conselho = await this.prisma.conselhoProfissional.findUnique({
      where: { sigla },
    });
    return conselho as ConselhoProfissional | null;
  }

  async findById(id: string): Promise<ConselhoProfissional | null> {
    const conselho = await this.prisma.conselhoProfissional.findUnique({
      where: { id },
    });
    return conselho as ConselhoProfissional | null;
  }

  async findAll(): Promise<ConselhoProfissional[]> {
    const conselhos = await this.prisma.conselhoProfissional.findMany({
      orderBy: { sigla: 'asc' },
    });
    return conselhos as ConselhoProfissional[];
  }

  async save(data: ConselhoProfissional): Promise<ConselhoProfissional> {
    const conselho = await this.prisma.conselhoProfissional.update({
      where: { id: data.id },
      data,
    });
    return conselho as ConselhoProfissional;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.conselhoProfissional.delete({
      where: { id },
    });
  }
} 