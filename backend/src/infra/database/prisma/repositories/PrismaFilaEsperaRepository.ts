import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { FilaEspera } from '../../../../core/domain/entities/FilaEspera';
import { IFilaEsperaRepository, ICreateFilaEsperaDTO } from '../../../../core/domain/repositories/IFilaEsperaRepository';

@injectable()
export class PrismaFilaEsperaRepository implements IFilaEsperaRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateFilaEsperaDTO): Promise<FilaEspera> {
    const created = await this.prisma.filaEspera.create({
      data: {
        pacienteId: data.pacienteId,
        servicoId: data.servicoId,
        profissionalId: data.profissionalId || undefined,
        horarioPreferencia: data.horarioPreferencia,
        observacao: data.observacao || undefined,
        status: data.status || undefined,
        ativo: data.ativo ?? true,
      },
    });
    return created as unknown as FilaEspera;
  }

  async findById(id: string): Promise<FilaEspera | null> {
    const item = await this.prisma.filaEspera.findUnique({ where: { id } });
    return (item as unknown as FilaEspera) || null;
  }

  async findAll(): Promise<FilaEspera[]> {
    const items = await this.prisma.filaEspera.findMany({ orderBy: { createdAt: 'desc' } });
    return items as unknown as FilaEspera[];
  }

  async findAllActive(): Promise<FilaEspera[]> {
    const items = await this.prisma.filaEspera.findMany({ where: { ativo: true }, orderBy: { createdAt: 'desc' } });
    return items as unknown as FilaEspera[];
  }

  async save(item: FilaEspera): Promise<FilaEspera> {
    const updated = await this.prisma.filaEspera.update({
      where: { id: item.id },
      data: {
        pacienteId: item.pacienteId,
        servicoId: item.servicoId,
        profissionalId: item.profissionalId || undefined,
        horarioPreferencia: item.horarioPreferencia,
        observacao: item.observacao || undefined,
        status: item.status || undefined,
        ativo: item.ativo ?? undefined,
      },
    });
    return updated as unknown as FilaEspera;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.filaEspera.delete({ where: { id } });
  }
}


