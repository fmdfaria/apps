import { prisma } from '../../../../shared/database/prisma';
import { RefreshToken } from '../../../../core/domain/entities/RefreshToken';
import { IRefreshTokensRepository } from '../../../../core/domain/repositories/IRefreshTokensRepository';

export class PrismaRefreshTokensRepository implements IRefreshTokensRepository {
  async create(data: Omit<RefreshToken, 'id' | 'criadoEm'>): Promise<RefreshToken> {
    const refreshToken = await prisma.refreshToken.create({
      data: {
        ...data,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
    return refreshToken as RefreshToken;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return (await prisma.refreshToken.findFirst({ where: { token } })) as RefreshToken | null;
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return (await prisma.refreshToken.findMany({ where: { userId } })) as RefreshToken[];
  }

  async delete(id: string): Promise<void> {
    await prisma.refreshToken.delete({ where: { id } });
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
} 