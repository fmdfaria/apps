import { PrismaClient } from '@prisma/client';
import {
  ICreateEspecialidadeDTO,
  IEspecialidadesRepository,
} from '../../../../core/domain/repositories/IEspecialidadesRepository';
import { Especialidade } from '../../../../core/domain/entities/Especialidade';
import { inject, injectable } from 'tsyringe';

@injectable()
export class PrismaEspecialidadesRepository implements IEspecialidadesRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateEspecialidadeDTO): Promise<Especialidade> {
    const especialidade = await this.prisma.especialidade.create({
      data,
    });
    return especialidade as Especialidade;
  }

  async findByName(nome: string): Promise<Especialidade | null> {
    const especialidade = await this.prisma.especialidade.findUnique({
      where: { nome },
    });
    return especialidade as Especialidade | null;
  }

  async findById(id: string): Promise<Especialidade | null> {
    const especialidade = await this.prisma.especialidade.findUnique({
      where: { id },
    });
    return especialidade as Especialidade | null;
  }

  async findAll(): Promise<Especialidade[]> {
    const especialidades = await this.prisma.especialidade.findMany();
    return especialidades as Especialidade[];
  }

  async save(data: Especialidade): Promise<Especialidade> {
    const especialidade = await this.prisma.especialidade.update({
      where: { id: data.id },
      data,
    });
    return especialidade as Especialidade;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.especialidade.delete({
      where: { id },
    });
  }
} 