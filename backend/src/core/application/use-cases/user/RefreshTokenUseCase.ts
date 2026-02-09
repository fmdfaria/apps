import { inject, injectable } from 'tsyringe';
import { IRefreshTokensRepository } from '../../../domain/repositories/IRefreshTokensRepository';
import { IUsersRepository } from '../../../domain/repositories/IUsersRepository';
import { IUserRolesRepository } from '../../../domain/repositories/IUserRolesRepository';
import { AppError } from '../../../../shared/errors/AppError';
import jwt from 'jsonwebtoken';
import { User } from '../../../domain/entities/User';

interface IRequest {
  refreshToken: string;
  ip?: string;
  userAgent?: string;
}

interface IResponse {
  user: Omit<User, 'senha'> & { roles?: string[] };
  accessToken: string;
  refreshToken: string;
}

@injectable()
export class RefreshTokenUseCase {
  constructor(
    @inject('RefreshTokensRepository')
    private refreshTokensRepository: IRefreshTokensRepository,
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
    @inject('UserRolesRepository')
    private userRolesRepository: IUserRolesRepository
  ) {}

  async execute({ refreshToken, ip, userAgent }: IRequest): Promise<IResponse> {
    const token = await this.refreshTokensRepository.findByToken(refreshToken);
    if (!token || token.expiresAt < new Date()) {
      throw new AppError('Refresh token inválido ou expirado.', 401);
    }

    const user = await this.usersRepository.findById(token.userId);
    if (!user || !user.ativo) {
      throw new AppError('Usuário não encontrado ou inativo.', 401);
    }

    const userRoles = await this.userRolesRepository.findActiveUserRolesWithNames(user.id);
    const roleNames = userRoles.map((ur) => ur.roleName);

    const accessToken = jwt.sign(
      { sub: user.id, roles: roleNames },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const newRefreshToken = jwt.sign(
      { sub: user.id },
      refreshTokenSecret as string,
      { expiresIn: '30d' }
    );

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.refreshTokensRepository.delete(token.id);
    await this.refreshTokensRepository.create({
      userId: user.id,
      token: newRefreshToken,
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });

    const { senha: _, ...userSafe } = user;
    return {
      user: { ...userSafe, roles: roleNames },
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
