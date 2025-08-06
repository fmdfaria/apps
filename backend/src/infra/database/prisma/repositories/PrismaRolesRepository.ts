import { PrismaClient } from '@prisma/client';
import { injectable } from 'tsyringe';
import { Role } from '../../../../core/domain/entities/Role';
import { IRolesRepository } from '../../../../core/domain/repositories/IRolesRepository';

@injectable()
export class PrismaRolesRepository implements IRolesRepository {
  constructor(private prisma: PrismaClient) {}

  async create(role: Role): Promise<Role> {
    const data = await this.prisma.role.create({
      data: {
        id: role.id,
        nome: role.nome,
        descricao: role.descricao,
        ativo: role.ativo,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });

    return new Role(
      {
        nome: data.nome,
        descricao: data.descricao,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findById(id: string): Promise<Role | null> {
    const data = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new Role(
      {
        nome: data.nome,
        descricao: data.descricao,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findByNome(nome: string): Promise<Role | null> {
    const data = await this.prisma.role.findUnique({
      where: { nome },
    });

    if (!data) return null;

    return new Role(
      {
        nome: data.nome,
        descricao: data.descricao,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async findAll(): Promise<Role[]> {
    const data = await this.prisma.role.findMany({
      orderBy: { nome: 'asc' },
    });

    return data.map(
      (item) =>
        new Role(
          {
            nome: item.nome,
            descricao: item.descricao,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async findActiveRoles(): Promise<Role[]> {
    const data = await this.prisma.role.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });

    return data.map(
      (item) =>
        new Role(
          {
            nome: item.nome,
            descricao: item.descricao,
            ativo: item.ativo,
          },
          item.id
        )
    );
  }

  async update(role: Role): Promise<Role> {
    const data = await this.prisma.role.update({
      where: { id: role.id },
      data: {
        nome: role.nome,
        descricao: role.descricao,
        ativo: role.ativo,
        updatedAt: new Date(),
      },
    });

    return new Role(
      {
        nome: data.nome,
        descricao: data.descricao,
        ativo: data.ativo,
      },
      data.id
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.role.delete({
      where: { id },
    });
  }
}