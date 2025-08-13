import { PrismaClient, Prisma } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { Anexo } from '../../../../core/domain/entities/Anexo';
import { IAnexosRepository, ICreateAnexoDTO } from '../../../../core/domain/repositories/IAnexosRepository';

function toDomain(anexo: Prisma.AnexoGetPayload<{}>): Anexo {
  return {
    ...anexo,
  };
}

@injectable()
export class PrismaAnexosRepository implements IAnexosRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateAnexoDTO): Promise<Anexo> {
    const anexo = await this.prisma.anexo.create({ data });
    return toDomain(anexo);
  }

  async findById(id: string): Promise<Anexo | null> {
    const anexo = await this.prisma.anexo.findUnique({ where: { id } });
    return anexo ? toDomain(anexo) : null;
  }

  async findAll(filters?: { entidadeId?: string }): Promise<Anexo[]> {
    const anexos = await this.prisma.anexo.findMany({ where: filters });
    return anexos.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.anexo.delete({ where: { id } });
  }

  async update(id: string, data: Partial<{ 
    descricao: string | null; 
    nomeArquivo: string; 
    url: string;
    s3Key: string | null;
    tamanhoBytes: number | null;
    mimeType: string | null;
    hashArquivo: string | null;
  }>): Promise<Anexo> {
    const anexo = await this.prisma.anexo.update({
      where: { id },
      data,
    });
    return toDomain(anexo);
  }
} 