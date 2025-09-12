import { CategoriaFinanceira } from '../../../../core/domain/entities/CategoriaFinanceira';
import { ICategoriasFinanceirasRepository } from '../../../../core/domain/repositories/ICategoriasFinanceirasRepository';
import { prisma } from '../../../shared/database/prisma';

export class PrismaCategoriasFinanceirasRepository implements ICategoriasFinanceirasRepository {
  async create(categoria: CategoriaFinanceira): Promise<CategoriaFinanceira> {
    const created = await prisma.categoriaFinanceira.create({
      data: {
        id: categoria.id,
        nome: categoria.nome,
        tipo: categoria.tipo,
        descricao: categoria.descricao,
        ativo: categoria.ativo,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<CategoriaFinanceira | null> {
    const categoria = await prisma.categoriaFinanceira.findUnique({
      where: { id }
    });

    return categoria ? this.mapToDomain(categoria) : null;
  }

  async findByNome(nome: string): Promise<CategoriaFinanceira | null> {
    const categoria = await prisma.categoriaFinanceira.findUnique({
      where: { nome }
    });

    return categoria ? this.mapToDomain(categoria) : null;
  }

  async findAll(filters?: {
    tipo?: string;
    ativo?: boolean;
  }): Promise<CategoriaFinanceira[]> {
    const categorias = await prisma.categoriaFinanceira.findMany({
      where: {
        ...(filters?.tipo && { tipo: filters.tipo }),
        ...(filters?.ativo !== undefined && { ativo: filters.ativo })
      },
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    return categorias.map(this.mapToDomain);
  }

  async update(id: string, data: Partial<CategoriaFinanceira>): Promise<CategoriaFinanceira> {
    const updated = await prisma.categoriaFinanceira.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.categoriaFinanceira.delete({
      where: { id }
    });
  }

  async findByTipo(tipo: string): Promise<CategoriaFinanceira[]> {
    const categorias = await prisma.categoriaFinanceira.findMany({
      where: { tipo, ativo: true },
      orderBy: { nome: 'asc' }
    });

    return categorias.map(this.mapToDomain);
  }

  private mapToDomain(raw: any): CategoriaFinanceira {
    return new CategoriaFinanceira({
      nome: raw.nome,
      tipo: raw.tipo,
      descricao: raw.descricao,
      ativo: raw.ativo
    }, raw.id);
  }
}