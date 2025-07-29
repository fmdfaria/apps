import { prisma } from '../../../../shared/database/prisma';
import { User, UserType } from '../../../../core/domain/entities/User';
import { IUsersRepository } from '../../../../core/domain/repositories/IUsersRepository';

export class PrismaUsersRepository implements IUsersRepository {
  async create(data: Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<User> {
    const user = await prisma.user.create({
      data: {
        ...data,
        tipo: data.tipo as UserType,
        profissionalId: data.profissionalId ?? null,
        pacienteId: data.pacienteId ?? null,
      },
    });
    return user as User;
  }

  async findByEmail(email: string): Promise<User | null> {
    return (await prisma.user.findUnique({ where: { email } })) as User | null;
  }

  async findById(id: string): Promise<User | null> {
    return (await prisma.user.findUnique({ where: { id } })) as User | null;
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>>): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        profissionalId: data.profissionalId ?? undefined,
        pacienteId: data.pacienteId ?? undefined,
      },
    });
    return user as User;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async list(filters?: Partial<Pick<User, 'tipo' | 'ativo'>>): Promise<User[]> {
    return (await prisma.user.findMany({ where: { ...filters } })) as User[];
  }

  async findByProfissionalId(profissionalId: string): Promise<User | null> {
    return (await prisma.user.findFirst({ where: { profissionalId } })) as User | null;
  }

  async findByPacienteId(pacienteId: string): Promise<User | null> {
    return (await prisma.user.findFirst({ where: { pacienteId } })) as User | null;
  }
} 