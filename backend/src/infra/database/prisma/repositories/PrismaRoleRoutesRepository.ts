import { PrismaClient } from '@prisma/client';
import { injectable } from 'tsyringe';
import { RoleRoute } from '../../../../core/domain/entities/RoleRoute';
import { IRoleRoutesRepository } from '../../../../core/domain/repositories/IRoleRoutesRepository';

@injectable()
export class PrismaRoleRoutesRepository implements IRoleRoutesRepository {
  constructor(private prisma: PrismaClient) {}

  async create(roleRoute: RoleRoute): Promise<RoleRoute> {
    const data = await this.prisma.roleRoute.create({
      data: {
        id: roleRoute.id,
        roleId: roleRoute.roleId,
        routeId: roleRoute.routeId,
        ativo: roleRoute.ativo,
        createdAt: roleRoute.createdAt,
        updatedAt: roleRoute.updatedAt,
      },
    });

    return new RoleRoute(
      {
        roleId: data.roleId,
        routeId: data.routeId,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findById(id: string): Promise<RoleRoute | null> {
    const data = await this.prisma.roleRoute.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new RoleRoute(
      {
        roleId: data.roleId,
        routeId: data.routeId,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findByRoleId(roleId: string): Promise<RoleRoute[]> {
    const data = await this.prisma.roleRoute.findMany({
      where: { roleId },
      include: {
        route: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map(
      (item) =>
        new RoleRoute(
          {
            roleId: item.roleId,
            routeId: item.routeId,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findByRouteId(routeId: string): Promise<RoleRoute[]> {
    const data = await this.prisma.roleRoute.findMany({
      where: { routeId },
      include: {
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map(
      (item) =>
        new RoleRoute(
          {
            roleId: item.roleId,
            routeId: item.routeId,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findByRoleAndRoute(roleId: string, routeId: string): Promise<RoleRoute | null> {
    const data = await this.prisma.roleRoute.findUnique({
      where: {
        roleId_routeId: {
          roleId,
          routeId,
        },
      },
    });

    if (!data) return null;

    return new RoleRoute(
      {
        roleId: data.roleId,
        routeId: data.routeId,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findAll(): Promise<RoleRoute[]> {
    const data = await this.prisma.roleRoute.findMany({
      include: {
        role: {
          select: {
            id: true,
            nome: true,
          },
        },
        route: {
          select: {
            id: true,
            path: true,
            method: true,
            nome: true,
            modulo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map(
      (item) =>
        new RoleRoute(
          {
            roleId: item.roleId,
            routeId: item.routeId,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findActiveRoleRoutes(roleId: string): Promise<RoleRoute[]> {
    const data = await this.prisma.roleRoute.findMany({
      where: {
        roleId,
        ativo: true,
        route: {
          ativo: true,
        },
      },
      include: {
        route: true,
      },
    });

    return data.map(
      (item) =>
        new RoleRoute(
          {
            roleId: item.roleId,
            routeId: item.routeId,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findRoutesByUserId(userId: string): Promise<{ id: string; path: string; method: string; nome: string; modulo?: string }[]> {
    const data = await this.prisma.route.findMany({
      where: {
        ativo: true,
        roleRoutes: {
          some: {
            ativo: true,
            role: {
              ativo: true,
              userRoles: {
                some: {
                  userId,
                  ativo: true,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        path: true,
        method: true,
        nome: true,
        modulo: true,
      },
      orderBy: [{ modulo: 'asc' }, { nome: 'asc' }],
    });

    return data;
  }

  async update(roleRoute: RoleRoute): Promise<RoleRoute> {
    const data = await this.prisma.roleRoute.update({
      where: { id: roleRoute.id },
      data: {
        ativo: roleRoute.ativo,
        updatedAt: new Date(),
      },
    });

    return new RoleRoute(
      {
        roleId: data.roleId,
        routeId: data.routeId,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.roleRoute.delete({
      where: { id },
    });
  }

  async deleteByRoleAndRoute(roleId: string, routeId: string): Promise<void> {
    await this.prisma.roleRoute.delete({
      where: {
        roleId_routeId: {
          roleId,
          routeId,
        },
      },
    });
  }
}