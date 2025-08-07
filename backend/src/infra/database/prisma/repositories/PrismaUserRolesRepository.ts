import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { UserRole } from '../../../../core/domain/entities/UserRole';
import { IUserRolesRepository } from '../../../../core/domain/repositories/IUserRolesRepository';

@injectable()
export class PrismaUserRolesRepository implements IUserRolesRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(userRole: UserRole): Promise<UserRole> {
    const data = await this.prisma.userRole.create({
      data: {
        id: userRole.id,
        userId: userRole.userId,
        roleId: userRole.roleId,
        ativo: userRole.ativo,
        createdAt: userRole.createdAt,
        updatedAt: userRole.updatedAt,
      },
    });

    return new UserRole(
      {
        userId: data.userId,
        roleId: data.roleId,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findById(id: string): Promise<UserRole | null> {
    const data = await this.prisma.userRole.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new UserRole(
      {
        userId: data.userId,
        roleId: data.roleId,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findByUserId(userId: string): Promise<UserRole[]> {
    const data = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map(
      (item) =>
        new UserRole(
          {
            userId: item.userId,
            roleId: item.roleId,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findByRoleId(roleId: string): Promise<UserRole[]> {
    const data = await this.prisma.userRole.findMany({
      where: { roleId },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map(
      (item) =>
        new UserRole(
          {
            userId: item.userId,
            roleId: item.roleId,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findByUserAndRole(userId: string, roleId: string): Promise<UserRole | null> {
    const data = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (!data) return null;

    return new UserRole(
      {
        userId: data.userId,
        roleId: data.roleId,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findAll(): Promise<UserRole[]> {
    const data = await this.prisma.userRole.findMany({
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        role: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map(
      (item) =>
        new UserRole(
          {
            userId: item.userId,
            roleId: item.roleId,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findActiveUserRoles(userId: string): Promise<UserRole[]> {
    const data = await this.prisma.userRole.findMany({
      where: {
        userId,
        ativo: true,
        role: {
          ativo: true,
        },
      },
      include: {
        role: true,
      },
    });

    return data.map(
      (item) =>
        new UserRole(
          {
            userId: item.userId,
            roleId: item.roleId,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async update(userRole: UserRole): Promise<UserRole> {
    const data = await this.prisma.userRole.update({
      where: { id: userRole.id },
      data: {
        ativo: userRole.ativo,
        updatedAt: new Date(),
      },
    });

    return new UserRole(
      {
        userId: data.userId,
        roleId: data.roleId,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: { id },
    });
  }

  async deleteByUserAndRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }
}