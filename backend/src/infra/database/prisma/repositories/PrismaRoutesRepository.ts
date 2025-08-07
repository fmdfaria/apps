import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { Route } from '../../../../core/domain/entities/Route';
import { IRoutesRepository } from '../../../../core/domain/repositories/IRoutesRepository';

@injectable()
export class PrismaRoutesRepository implements IRoutesRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(route: Route): Promise<Route> {
    const data = await this.prisma.route.create({
      data: {
        id: route.id,
        path: route.path,
        method: route.method,
        nome: route.nome,
        descricao: route.descricao,
        modulo: route.modulo,
        ativo: route.ativo,
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
      },
    });

    return new Route(
      {
        path: data.path,
        method: data.method,
        nome: data.nome,
        descricao: data.descricao,
        modulo: data.modulo,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findById(id: string): Promise<Route | null> {
    const data = await this.prisma.route.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new Route(
      {
        path: data.path,
        method: data.method,
        nome: data.nome,
        descricao: data.descricao,
        modulo: data.modulo,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findByPath(path: string, method: string): Promise<Route | null> {
    const data = await this.prisma.route.findUnique({
      where: {
        path_method: {
          path,
          method,
        },
      },
    });

    if (!data) return null;

    return new Route(
      {
        path: data.path,
        method: data.method,
        nome: data.nome,
        descricao: data.descricao,
        modulo: data.modulo,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findAll(): Promise<Route[]> {
    const data = await this.prisma.route.findMany({
      orderBy: [{ modulo: 'asc' }, { nome: 'asc' }],
    });

    return data.map(
      (item) =>
        new Route(
          {
            path: item.path,
            method: item.method,
            nome: item.nome,
            descricao: item.descricao,
            modulo: item.modulo,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findByModulo(modulo: string): Promise<Route[]> {
    const data = await this.prisma.route.findMany({
      where: { modulo },
      orderBy: { nome: 'asc' },
    });

    return data.map(
      (item) =>
        new Route(
          {
            path: item.path,
            method: item.method,
            nome: item.nome,
            descricao: item.descricao,
            modulo: item.modulo,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findActiveRoutes(): Promise<Route[]> {
    const data = await this.prisma.route.findMany({
      where: { ativo: true },
      orderBy: [{ modulo: 'asc' }, { nome: 'asc' }],
    });

    return data.map(
      (item) =>
        new Route(
          {
            path: item.path,
            method: item.method,
            nome: item.nome,
            descricao: item.descricao,
            modulo: item.modulo,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async update(route: Route): Promise<Route> {
    const data = await this.prisma.route.update({
      where: { id: route.id },
      data: {
        path: route.path,
        method: route.method,
        nome: route.nome,
        descricao: route.descricao,
        modulo: route.modulo,
        ativo: route.ativo,
        updatedAt: new Date(),
      },
    });

    return new Route(
      {
        path: data.path,
        method: data.method,
        nome: data.nome,
        descricao: data.descricao,
        modulo: data.modulo,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.route.delete({
      where: { id },
    });
  }
}