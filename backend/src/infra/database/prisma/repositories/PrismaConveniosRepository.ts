import { PrismaClient } from '@prisma/client';
import { Convenio } from '../../../../core/domain/entities/Convenio';
import {
  ICreateConvenioDTO,
  IConveniosRepository,
} from '../../../../core/domain/repositories/IConveniosRepository';
import { inject, injectable } from 'tsyringe';

@injectable()
export class PrismaConveniosRepository implements IConveniosRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateConvenioDTO): Promise<Convenio> {
    const convenio = await this.prisma.convenio.create({ data });
    return convenio as Convenio;
  }

  async findByName(nome: string): Promise<Convenio | null> {
    const convenio = await this.prisma.convenio.findUnique({
      where: { nome },
    });
    return convenio as Convenio | null;
  }

  async findById(id: string): Promise<Convenio | null> {
    const convenio = await this.prisma.convenio.findUnique({
      where: { id },
    });
    return convenio as Convenio | null;
  }

  async findAll(): Promise<Convenio[]> {
    const convenios = await this.prisma.convenio.findMany({
      orderBy: { nome: 'asc' },
    });
    return convenios as Convenio[];
  }

  async save(data: Convenio): Promise<Convenio> {
    const convenio = await this.prisma.convenio.update({
      where: { id: data.id },
      data,
    });
    return convenio as Convenio;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.convenio.delete({
      where: { id },
    });
  }
} 